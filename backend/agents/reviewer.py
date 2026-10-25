import os
import json
import re
from pydantic import BaseModel, Field
from openai import OpenAI

class QuizOption(BaseModel):
    text: str = Field(description="The option text.")
    is_correct: bool = Field(description="True if correct, False otherwise.")

class VerifiedQuestion(BaseModel):
    question: str = Field(description="The revised/verified question text.")
    options: list[QuizOption] = Field(description="Exactly 4 options with exactly one correct option.")
    explanation: str = Field(description="Detailed step-by-step explanation supporting the correct answer.")
    image_url: str | None = Field(default=None, description="Path or URL to a generated graph/diagram if required.")

class VerifiedQuizResult(BaseModel):
    questions: list[VerifiedQuestion] = Field(description="List of exactly 20 verified, corrected questions.")

def call_openrouter_safely(client, model, messages, response_format=None, temperature=0.2, initial_max_tokens=8000):
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
                    print(f"⚡ [Reviewer Token Adjuster] Auto-adjusting max_tokens to {current_max_tokens} and retrying...")
                    continue
            raise e
    raise Exception("Failed to complete LLM call after multiple token adjustments.")

def review_and_verify_quiz(
    raw_quiz_json: str, 
    reference_context: str,
    grade: str, 
    subject: str, 
    chapter: str, 
    difficulty: str
) -> str:
    """
    Agent 2: Audits, fact-checks, and polishes the 20-question draft quiz against textbooks and guidebooks.
    """
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY"),
    )

    prompt = f"""
    You are an expert curriculum auditor, senior board examiner, and fact-checker for Bangladesh SSC standards.
    
    Review this draft 20-question quiz for Grade {grade}, Subject: {subject}, Chapter: {chapter}.
    Target Difficulty: {difficulty}
    
    ---
    REFERENCE CONTEXT (Textbook Theory & Guidebook Standards):
    {reference_context}
    ---
    
    Draft Quiz Content to Audit:
    {raw_quiz_json}

    Audit Tasks & Strict Guidelines:
    1. EXACTLY 20 QUESTIONS: Ensure the final output contains a pristine set of 20 questions covering all chapter sub-topics.
    2. BOARD STANDARD & MATH RIGOR: Check that numerical problems reflect real board-exam complexity rather than trivial arithmetic. Verify step-by-step calculation correctness in the explanations.
    3. OPTION INTEGRITY: Ensure EVERY question has exactly 4 options, with **exactly one option** having `is_correct: true` and 3 having `is_correct: false`.
    4. DIFFICULTY CALIBRATION: If difficulty is **Hard**, ensure distractors (incorrect options) use close, trap values resulting from common student formula errors.
    5. Return the final verified questions strictly in the requested JSON schema.
    """

    try:
        response = call_openrouter_safely(
            client=client,
            model="google/gemini-3.8-flash",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful API that outputs strict JSON conforming to this schema: " + json.dumps(VerifiedQuizResult.model_json_schema())
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            initial_max_tokens=8000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error reviewing quiz via OpenRouter: {e}")
        return raw_quiz_json