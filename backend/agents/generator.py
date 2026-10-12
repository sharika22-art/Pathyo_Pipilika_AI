import os
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# 1. Initialize the client
client = genai.Client()

# 2. Define the exact JSON structure
class QuizOption(BaseModel):
    text: str = Field(description="The text of the multiple choice option.")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise.")

class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text.")
    options: list[QuizOption] = Field(description="A list of 4 possible options, with exactly one correct answer.")
    explanation: str = Field(description="A brief explanation of why the correct answer is right.")

class QuizResult(BaseModel):
    questions: list[QuizQuestion] = Field(description="A list of 20 to 30 quiz questions.")

def generate_quiz(grade: str, subject: str, chapter: str, difficulty: str) -> str:
    """
    Agent 1: Generates a JSON quiz based on the BD curriculum parameters.
    Includes dynamic distractor logic for higher difficulties.
    """
    
    # Base prompt requirements
    prompt = f"""
    You are an expert educator familiar with the Bangladesh National Curriculum.
    Generate a {difficulty} level quiz for Grade {grade} students.
    Subject: {subject}
    Chapter: {chapter}
    
    Requirements:
    1. Generate exactly 20 high-quality multiple-choice questions.
    2. Each question must have exactly 4 options.
    3. Exactly one option must be correct.
    4. Provide a brief explanation for the correct answer.
    5. The difficulty must accurately reflect the '{difficulty}' level for a Grade {grade} student.
    """

    # Dynamically inject the distractor instruction based on difficulty
    if difficulty.lower() in ["medium", "hard"]:
        prompt += """
    6. CRITICAL DISTRACTOR RULE: Because the difficulty is Medium/Hard, the 3 incorrect options (distractors) MUST be highly plausible, conceptually similar, or common misconceptions related to the correct answer. They must be very close to each other to effectively challenge and confuse the students. Do not include any obvious or silly wrong answers.
    """

    try:
        # 3. Call the model and enforce the schema
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=QuizResult,
                temperature=0.7 
            ),
        )
        
        return response.text
        
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return "{}"

# --- Test the Agent ---
if __name__ == "__main__":
    print("Generating challenging quiz...")
    json_output = generate_quiz(
        grade="9", 
        subject="Biology", 
        chapter="Chapter 4: Bioenergetics", 
        difficulty="Hard"
    )
    print(json_output)