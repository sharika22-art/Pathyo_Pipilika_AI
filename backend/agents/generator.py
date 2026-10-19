import os
import json
from pydantic import BaseModel, Field
import google.generativeai as genai
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Configure the Gemini SDK
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

DB_DIR = "backend/rag/chroma_db"

# Define the exact JSON structure
class QuizOption(BaseModel):
    text: str = Field(description="The text of the multiple choice option.")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise.")

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text.")
    options: list[QuizOption] = Field(description="A list of 4 possible options, with exactly one correct answer.")
    explanation: str = Field(description="A brief explanation of why the correct answer is right.")

class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(description="A list of 20 to 30 quiz questions.")

def retrieve_textbook_context(chapter: str, topic: str) -> str:
    """Queries the local Chroma vector database for relevant NCTB textbook text chunks."""
    if not os.path.exists(DB_DIR):
        return "No local textbook embeddings found. Generate questions based on standard curriculum knowledge."
    
    try:
        embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        vector_store = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        
        query = f"Bangladesh NCTB Class 9-10 syllabus {chapter} topic {topic}"
        docs = vector_store.similarity_search(query, k=3)
        
        context = "\n\n".join([doc.page_content for doc in docs])
        return context if context else "No specific textbook excerpts matched."
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return "Error fetching textbook context."

def generate_quiz(grade: str, subject: str, chapter: str, topic: str, difficulty: str) -> str:
    """
    Agent 1: Generates a JSON quiz based on the BD curriculum parameters.
    Includes RAG textbook context and dynamic distractor logic for higher difficulties.
    """
    # Retrieve RAG context from ChromaDB
    textbook_context = retrieve_textbook_context(chapter, topic)
    
    # Base prompt requirements
    prompt = f"""
    You are an expert educator familiar with the Bangladesh National Curriculum (NCTB).
    Generate a {difficulty} level quiz for Grade {grade} students.
    Subject: {subject}
    Chapter: {chapter}
    Specific Topic: {topic}
    
    Official NCTB Textbook Reference Context:
    --------------------------------------------------
    {textbook_context}
    --------------------------------------------------
    
    Requirements:
    1. Generate exactly 20 high-quality multiple-choice questions grounded in the reference context.
    2. Each question must have exactly 4 options.
    3. Exactly one option must be correct (`is_correct: true`), and three incorrect (`is_correct: false`).
    4. Provide a brief explanation for the correct answer.
    5. The difficulty must accurately reflect the '{difficulty}' level for a Grade {grade} student.
    """

    # Dynamically inject the distractor instruction based on difficulty
    if difficulty.lower() in ["medium", "hard"]:
        prompt += """
    6. CRITICAL DISTRACTOR RULE: Because the difficulty is Medium/Hard, the 3 incorrect options (distractors) MUST be highly plausible, conceptually similar, or common misconceptions related to the correct answer. They must be very close to each other to effectively challenge and confuse the students. Do not include any obvious or silly wrong answers.
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=QuizResult,
                temperature=0.7 
            )
        )
        return response.text
        
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return "{}"

# --- Test the Agent ---
if __name__ == "__main__":
    print("Generating challenging RAG quiz...")
    json_output = generate_quiz(
        grade="9-10", 
        subject="Physics", 
        chapter="Chapter 3: Force", 
        topic="Newton’s Laws of Motion",
        difficulty="Hard"
    )
    print(json_output)