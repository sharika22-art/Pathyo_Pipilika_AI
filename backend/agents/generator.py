import os
import json
import random
import re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from pydantic import BaseModel, Field
from openai import OpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

DB_DIR = "backend/rag/chroma_db"
STATIC_GRAPHS_DIR = "backend/static/graphs"
os.makedirs(STATIC_GRAPHS_DIR, exist_ok=True)

# Autonomous Dynamic Code-Execution Visual Tool Utility
def generate_dynamic_visual_from_code(python_code: str) -> str | None:
    """
    Safely executes Python/Matplotlib code generated autonomously by the LLM 
    to render custom graphs, diagrams, titration curves, or geometric shapes on the fly.
    """
    if not python_code or not python_code.strip():
        return None

    filename = f"dynamic_visual_{random.randint(10000, 99999)}.png"
    filepath = os.path.join(STATIC_GRAPHS_DIR, filename)

    try:
        plt.clf()
        plt.close('all')
        
        plt.figure(figsize=(6, 4))
        plt.style.use('dark_background')

        local_vars = {
            "plt": plt,
            "np": np,
            "filename": filepath
        }

        cleaned_code = python_code.replace("```python", "").replace("```", "").strip()
        
        if "plt.savefig" not in cleaned_code:
            cleaned_code += f"\nplt.tight_layout()\nplt.savefig('{filepath}', dpi=150, bbox_inches='tight', facecolor='#0f172a')"

        # Allow __import__ so dynamic module calls inside exec succeed safely
        # Allow __import__ and essential built-ins like zip so dynamic module/plotting calls inside exec succeed safely
        safe_builtins = {
            "__import__": __import__,
            "abs": abs, "min": min, "max": max, "sum": sum, 
            "range": range, "round": round, "len": len, "float": float, "int": int,
            "zip": zip, "enumerate": enumerate, "list": list, "dict": dict, "set": set, "tuple": tuple
        }

        exec(cleaned_code, {"__builtins__": safe_builtins}, local_vars)

        plt.close('all')
        if os.path.exists(filepath):
            return f"static/graphs/{filename}"
        return None
    except Exception as e:
        print(f"Dynamic Visual Execution Error: {e}")
        plt.close('all')
        return None

class QuizOption(BaseModel):
    text: str = Field(description="The text of the multiple choice option.")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise.")

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text cleanly formulated without options.")
    options: list[QuizOption] = Field(description="A list of 4 possible options, with exactly one correct answer.")
    explanation: str = Field(description="A detailed step-by-step explanation.")
    image_url: str | None = Field(default=None, description="Path to generated graph/diagram.")
    visual_code: str | None = Field(default=None, description="Valid Python/Matplotlib code snippet to draw the custom diagram/graph for this question on the fly, or null if no visual is needed.")

class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(description="A list of exactly 20 board-standard quiz questions.")

def call_openrouter_safely(client, model, messages, response_format=None, temperature=0.4, initial_max_tokens=20000):
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
                    continue
            raise e
    raise Exception("Failed to complete LLM call after multiple token adjustments.")

def retrieve_comprehensive_context(chapter: str, topic: str) -> str:
    if not os.path.exists(DB_DIR):
        return "No local embeddings found."
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
        query = f"board exam question analysis textbook exercises {chapter} {topic}"
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
    You are a veteran Bangladesh NCTB curriculum expert and senior board question setter for Class 9-10 (SSC).
    Subject: {subject} | Chapter: {chapter}
    Generate exactly 20 high-yield, authentic board-standard multiple-choice questions tailored strictly to this subject and chapter.
    
    Target Difficulty: {difficulty}
    
    Reference Context (Guidebook Exam Analysis & Textbook Data):
    --------------------------------------------------
    {reference_context}
    --------------------------------------------------
    
    🛑 STRICT SSC CLASS 9-10 SYLLABUS BOUNDARY:
    1. STRICT TEXTBOOK SCOPE: Restrict all questions, definitions, concepts, and numerical values strictly to the official Bangladesh NCTB Class 9-10 textbook and standard test papers for {subject}. 
    2. ABSOLUTE BAN ON HIGHER-SECONDARY (HSC) / COLLEGE TOPICS: Strictly forbid college-level theories, university entrance-style traps, advanced calculus, differential equations, or out-of-syllabus derivations. Every question must be fully answerable using secondary-level tools appropriate for a 15-16 year old student.

    ✅ NUMERICAL & CALCULATOR GUIDELINES:
    1. CALCULATOR IS FULLY PERMITTED: Numerical or mathematical problems can feature realistic, non-integer values or scientific notation (e.g., $1.029 \times 10^{-3}$, $4.87 \times 10^{2}$) exactly as they appear in authentic guidebook exercises.
    2. 45-SECOND SOLVABILITY: Ensure problems are concise enough to be solved within 45 seconds using a scientific calculator or standard mental/rough arithmetic.
    3. SCENARIO ADAPTATION: You may creatively tweak guidebook scenarios, modify values, or combine 2 foundational concepts, provided the underlying core principle stays strictly within SSC bounds.
    
    🛠️ AUTONOMOUS PYTHON VISUAL GENERATOR TOOL:
    - If a question naturally requires a diagram, graph, geometric figure, titration curve, or data plot based on board/guidebook patterns, you can generate it dynamically.
    - For such questions, provide a clean Python code snippet using `plt` (Matplotlib) and `numpy` (`np`) in the `visual_code` field. 
    - The code must draw the *exact* visual relevant to the question (e.g., an acid-base titration curve for chemistry, a velocity-time graph for physics, or a coordinate plot/triangle for math). Style it with a dark theme background (`#0f172a`), labeled axes, and clear titles.
    - If no visual is required for a question, set `visual_code` to `null`.

    📝 OPTIONS & EXPLANATIONS: Exactly 4 options per question with 1 correct answer (`is_correct: true`) and 3 plausible distractors targeting common student formula or conceptual mistakes. Ensure correct answers are distributed randomly across option positions. Provide clean, step-by-step explanatory breakdowns.
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
            temperature=0.3,
            initial_max_tokens=20000
        )
        
        quiz_data = json.loads(response.choices[0].message.content)

        # Post-processing: Shuffle option positions and execute autonomous visuals
        if "questions" in quiz_data:
            for q in quiz_data["questions"]:
                # Shuffle options so the correct answer isn't always pinned to Option A
                if "options" in q and isinstance(q["options"], list):
                    random.shuffle(q["options"])

                # Execute dynamic visual code snippet if present
                code_snippet = q.get("visual_code")
                if code_snippet:
                    q["image_url"] = generate_dynamic_visual_from_code(python_code=code_snippet)

        return json.dumps(quiz_data)
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return "{}"

retrieve_comprehensive_context = retrieve_comprehensive_context