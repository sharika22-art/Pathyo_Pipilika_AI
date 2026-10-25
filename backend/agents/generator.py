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
    explanation: str = Field(description="A detailed step-by-step explanation of how to arrive at the correct answer.")
    image_url: str | None = Field(default=None, description="Path or URL to a generated graph/diagram if required.")

class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(description="A list of exactly 20 comprehensive board-standard quiz questions.")

def call_openrouter_safely(client, model, messages, response_format=None, temperature=0.4, initial_max_tokens=8000):
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
                    current_max_tokens = max(512, affordable_tokens - 100)
                    print(f"⚡ [Generator Token Adjuster] Auto-adjusting max_tokens to {current_max_tokens} and retrying...")
                    continue
            raise e
    raise Exception("Failed to complete LLM call after multiple token adjustments.")

def retrieve_comprehensive_context(chapter: str, topic: str) -> str:
    """Queries Chroma for high-frequency guidebook problem patterns and textbook foundations."""
    if not os.path.exists(DB_DIR):
        return "No local embeddings found."
    
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        
        # Heavy focus on guidebook test papers, board questions, and numerical problems
        query = f"board exam question analysis mathematical problems numerical equations creative questions {chapter} {topic}"
        docs = vector_store.similarity_search(query, k=8)
        
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])
        return context if context else "No specific excerpts matched."
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return "Error fetching context."

def generate_quiz(grade: str, subject: str, chapter: str, topic: str, difficulty: str) -> str:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY"),
    )

    reference_context = retrieve_comprehensive_context(chapter, topic)
    
    prompt = f"""
    You are a veteran Bangladesh SSC board examiner and senior question setter.
    Generate exactly 20 high-yield, authentic board-standard multiple-choice questions for Grade {grade}.
    Subject: {subject}
    Chapter: {chapter}
    Specific Topic: {topic}
    Target Difficulty: {difficulty}
    
    Reference Context (Guidebook Exam Analysis & Textbook Data):
    --------------------------------------------------
    {reference_context}
    --------------------------------------------------
    
    CRITICAL GENERATION RULES:
    1. EXACTLY 20 QUESTIONS: You must generate a robust set of 20 questions to cover every sub-concept, formula application, and theoretical nuance of this chapter comprehensively.
    2. BOARD-STANDARD PRIORITY: Analyze the guidebook context to find which question types and numerical problems frequently repeat in board exams. Prioritize those archetypes.
    3. MATHEMATICAL DEPTH (FOR SCIENCE/MATH): If this chapter involves calculations (e.g., Physics equations, Chemistry stoichiometry, Higher Math functions), do NOT give trivial 1-step numbers. Include multi-step problem solving, unit conversions, or analytical numericals where students have to calculate values to find the correct option.
    4. DIFFICULTY CALIBRATION ({difficulty}):
       - If HARD: Make the statements twisted or multi-layered. For math, introduce close distractor values calculated from common student formula errors (e.g., forgetting to square a value, or wrong unit sign).
    5. OPTION INTEGRITY: Exactly 4 options per question. Exactly one `is_correct: true`, three `is_correct: false`.
    6. DETAILED EXPLANATIONS: Provide clear, full step-by-step math breakdowns or conceptual justifications in the explanation field.
    """

    try:
        response = call_openrouter_safely(
            client=client,
            model="google/gemini-3.8-flash",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a strict API outputting JSON conforming to this schema: " + json.dumps(QuizResult.model_json_schema())
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            initial_max_tokens=8000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return "{}"

retrieve_comprehensive_context = retrieve_comprehensive_context # Alias for main.py compatibility