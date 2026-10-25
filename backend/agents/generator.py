import os
import json
import re
from pydantic import BaseModel, Field
from openai import OpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

DB_DIR = "backend/rag/chroma_db"

class QuizOption(BaseModel):
    text: str = Field(description="The text of the multiple choice option.")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise.")

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text cleanly formulated without options.")
    options: list[QuizOption] = Field(description="A list of 4 possible options, with exactly one correct answer.")
    explanation: str = Field(description="A brief explanation of why the correct answer is right.")

class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(description="A list of 10 high-quality quiz questions.")

def call_openrouter_safely(client, model, messages, response_format=None, temperature=0.4, initial_max_tokens=6000):
    """Automatically catches OpenRouter 402 credit limit errors and retries with adjusted tokens."""
    current_max_tokens = initial_max_tokens
    for _ in range(3):
        try:
            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": current_max_tokens
            }
            if response_format:
                kwargs["response_format"] = response_format
            return client.chat.completions.create(**kwargs)
        except Exception as e:
            err_str = str(e)
            if "402" in err_str or "can only afford" in err_str:
                match = re.search(r"can only afford\s+(\d+)", err_str)
                if match:
                    affordable_tokens = int(match.group(1))
                    current_max_tokens = max(256, affordable_tokens - 100)
                    print(f"⚡ [Generator Dynamic Token Adjuster] Auto-adjusting max_tokens to {current_max_tokens} and retrying...")
                    continue
            raise e
    raise Exception("Failed to complete LLM call after multiple token adjustments.")

def retrieve_comprehensive_context(chapter: str, topic: str) -> str:
    """Queries the local Chroma vector database for both textbook foundations and guidebook problem patterns."""
    if not os.path.exists(DB_DIR):
        return "No local embeddings found. Generate questions based on standard curriculum knowledge."
    
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        
        # Dual queries to capture both theoretical framing from textbooks and problem styles from guidebooks
        query_textbook = f"Bangladesh NCTB syllabus textbook theory concepts {chapter} {topic}"
        query_guidebook = f"board standard numerical problems MCQ practice questions test paper {chapter} {topic}"
        
        docs_textbook = vector_store.similarity_search(query_textbook, k=3)
        docs_guidebook = vector_store.similarity_search(query_guidebook, k=4)
        
        combined_docs = docs_textbook + docs_guidebook
        
        if not combined_docs:
            return "No specific reference excerpts matched."
            
        context = "\n\n---\n\n".join([doc.page_content for doc in combined_docs])
        return context
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return "Error fetching reference context."

def generate_quiz(grade: str, subject: str, chapter: str, topic: str, difficulty: str) -> str:
    """
    Agent 1: Generates a JSON quiz grounded in guidebook standards and textbook theory using OpenRouter.
    """
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY"),
    )

    reference_context = retrieve_comprehensive_context(chapter, topic)
    
    prompt = f"""
    You are an expert curriculum creator and senior examiner familiar with Bangladesh NCTB standards and top guidebooks (like Panjeree/Lecture).
    Generate a {difficulty} level quiz for Grade {grade} students.
    Subject: {subject}
    Chapter: {chapter}
    Specific Topic: {topic}
    
    Official Reference Context (Textbooks & Guidebook Extracts):
    --------------------------------------------------
    {reference_context}
    --------------------------------------------------
    
    Requirements & Guidelines:
    1. Generate exactly 10 high-quality multiple-choice questions grounded strictly in the reference context.
    2. GUIDEBOOK STANDARD & VARIETY: Match the exact style, tone, and rigor of authentic Bangladeshi board-standard guidebooks. Do not enforce rigid structural percentages (like strict 50% math); instead, let the natural nature of the chapter dictate the balance. If the chapter is heavily mathematical, include more numerical problems. If it is conceptual, include deep analytical theory.
    3. COMPREHENSIVE COVERAGE: Across the 10 questions, cover ALL possible question types, sub-topics, variations, and application formats found in this specific chapter. Ensure no two questions feel repetitive.
    4. Each question must have exactly 4 options. Exactly one option must be correct (`is_correct: true`), and three incorrect (`is_correct: false`).
    5. Provide a clear, step-by-step explanation for the correct answer.
    6. The difficulty must accurately reflect the '{difficulty}' level for a Grade {grade} student.
    """

    if difficulty.lower() in ["medium", "hard"]:
        prompt += """
    7. CRITICAL DISTRACTOR RULE: The 3 incorrect options must represent common student misconceptions, miscalculated intermediate values, or classic board-exam trap answers.
    """

    try:
        response = call_openrouter_safely(
            client=client,
            model="google/gemini-3.8-flash",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful API that outputs strict JSON conforming to this schema: " + json.dumps(QuizResult.model_json_schema())
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            initial_max_tokens=6000
        )
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error generating quiz via OpenRouter: {e}")
        return "{}"