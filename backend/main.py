import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
import json
import traceback

# Import our database client and models
from database.client import db
from database.models import ExamSubmission

# Import Agent 3 and Agent 4
from agents.rank_watcher import process_exam_submission
from agents.coach import update_true_mastery, generate_coach_message

# Import Agent 1 (Generator + RAG) and Agent 2 (Reviewer)
from agents.generator import generate_quiz, retrieve_comprehensive_context
from agents.reviewer import review_and_verify_quiz

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Gamified Edu Platform API")

os.makedirs("backend/static/graphs", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Configure CORS so the React frontend (running on a different port) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is active and agents are ready."}

# Request model for registration
class UserRegister(BaseModel):
    username: str
    grade: str

# Request model for login
class UserLogin(BaseModel):
    username: str

@app.post("/register")
def register_user(user: UserRegister):
    """Registers a new student after checking if the username already exists."""
    try:
        # 1. Check if the username already exists in Supabase
        existing_user = db.table("users").select("*").eq("username", user.username).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(
                status_code=400, 
                detail="Username not available, try another one."
            )
        
        # 2. If it doesn't exist, proceed with registration
        new_user_id = str(uuid4())
        
        profile_data = {
            "id": new_user_id,
            "username": user.username,
            "grade": user.grade,
            "total_points": 0,
            "coins": 0,
            "current_rank": None,
            "mastery_percentage": 0.00
        }

        response = db.table("users").insert(profile_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create user record in database.")

        return {
            "status": "success",
            "message": "User registered successfully.",
            "user": response.data[0]
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login")
def login_user(user: UserLogin):
    """Logs in an existing student by checking if their username exists in Supabase."""
    try:
        response = db.table("users").select("*").eq("username", user.username).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=404, 
                detail="User not found. Please register first."
            )

        return {
            "status": "success",
            "message": "Login successful.",
            "user": response.data[0]
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/syllabus")
def get_syllabus(grade: str, subject: str):
    """Fetches chapters and their corresponding topics for a given grade and subject from Supabase."""
    try:
        syllabus_res = db.table("syllabus")\
            .select("*")\
            .eq("grade", grade)\
            .eq("subject", subject)\
            .order("chapter_number")\
            .execute()
        
        if not syllabus_res.data:
            return {"chapters": []}
            
        chapters = syllabus_res.data
        
        for chapter in chapters:
            topics_res = db.table("chapter_topics")\
                .select("topic_name")\
                .eq("syllabus_id", chapter["id"])\
                .execute()
            
            chapter["topics"] = [t["topic_name"] for t in topics_res.data]
            
        return {"chapters": chapters}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class QuizRequest(BaseModel):
    syllabus_id: str
    difficulty: str

@app.post("/generate-quiz")
def generate_quiz_route(req: QuizRequest):
    """Triggers Agent 1 (RAG + Generation) and Agent 2 (Context-Aware Review) for a selected chapter."""
    try:
        # 1. Fetch chapter, grade, and subject details from Supabase using syllabus_id
        syllabus_res = db.table("syllabus").select("grade, subject, chapter_name").eq("id", req.syllabus_id).execute()
        if not syllabus_res.data:
            raise HTTPException(status_code=404, detail="Syllabus chapter not found.")
            
        chapter_info = syllabus_res.data[0]
        grade = chapter_info["grade"]
        subject = chapter_info["subject"]
        chapter_name = chapter_info["chapter_name"]
        
        # Fetch an associated sub-topic for precise RAG querying
        topics_res = db.table("chapter_topics").select("topic_name").eq("syllabus_id", req.syllabus_id).limit(1).execute()
        topic_name = topics_res.data[0]["topic_name"] if topics_res.data else chapter_name

        # 2. Retrieve local RAG textbook chunks from ChromaDB
        textbook_context = retrieve_comprehensive_context(chapter_name, topic_name)

        # 3. Agent 1: Generate the draft quiz JSON
        raw_quiz_json = generate_quiz(
            grade=grade, 
            subject=subject, 
            chapter=chapter_name, 
            topic=topic_name, 
            difficulty=req.difficulty
        )
        
        # 4. Agent 2: Review and cross-check the draft against the RAG textbook context
        verified_quiz_json = review_and_verify_quiz(
            raw_quiz_json=raw_quiz_json,
            reference_context=textbook_context,
            grade=grade,
            subject=subject,
            chapter=chapter_name,
            difficulty=req.difficulty
        )
        
        print(f"DEBUG - Agent 2 Verified Output Type: {type(verified_quiz_json)}")
        print(f"DEBUG - Agent 2 Verified Output Content: {verified_quiz_json}")

        # Safe parsing and validation pipeline
        parsed_quiz = verified_quiz_json
        if isinstance(verified_quiz_json, str):
            clean_str = verified_quiz_json.replace("```json", "").replace("```", "").strip()
            try:
                parsed_quiz = json.loads(clean_str) if clean_str else {}
            except Exception as json_err:
                print(f"JSON Decode Warning: {json_err}. Fallback to empty structure.")
                parsed_quiz = {}

        # Safeguard: If Agent 2 returned an empty dict or empty structure, inject a fallback question 
        # so the frontend never receives `{}` and breaks.
        if not parsed_quiz or (isinstance(parsed_quiz, dict) and len(parsed_quiz) == 0):
            print("WARNING: Agent 2 returned empty quiz payload. Using emergency fallback structure.")
            parsed_quiz = {
                "questions": [
                    {
                        "question": f"Fallback Assessment Question for {chapter_name}",
                        "options": [
                            {"text": "Option A (Review Agent Output)", "is_correct": True},
                            {"text": "Option B", "is_correct": False},
                            {"text": "Option C", "is_correct": False},
                            {"text": "Option D", "is_correct": False}
                        ]
                    }
                ]
            }

        return {
            "status": "success",
            "chapter": chapter_name,
            "topic": topic_name,
            "quiz": parsed_quiz
        }
        
    except Exception as e:
        print(f"Error in generate_quiz_route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submit-exam")
def submit_exam(submission: ExamSubmission):
    """Endpoint hit by the frontend when a student finishes a quiz or the timer runs out."""
    try:
        # Safeguard: Process the exam submission score & leaderboard points
        process_exam_submission(submission)
        
        # Fetch grade and subject to update mastery
        syllabus_res = db.table("syllabus").select("grade, subject").eq("id", str(submission.syllabus_id)).execute()
        
        if syllabus_res.data:
            grade = syllabus_res.data[0]["grade"]
            subject = syllabus_res.data[0]["subject"]
            
            # UPDATED: Trigger true mastery calculation on Medium or Hard difficulty exams
            if submission.difficulty in ["Medium", "Hard"]:
                update_true_mastery(str(submission.user_id), grade, subject)
                
        return {"status": "success", "message": "Exam logged, rank updated, and mastery calculated."}
    
    except Exception as e:
        print(f"CRITICAL SUBMISSION ERROR: {traceback.format_exc()}")
        # Gracefully return a structured error response instead of crashing unhandled 500
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process exam submission: {str(e)}"
        )
    

@app.get("/leaderboard/{grade}")
def get_leaderboard(grade: str):
    """Fetches top students for a given grade ordered by total points descending."""
    try:
        res = db.table("users").select("id, username, grade, total_points, coins, current_rank, mastery_percentage")\
            .eq("grade", grade)\
            .order("total_points", desc=True)\
            .limit(10)\
            .execute()
            
        return {"leaderboard": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/{user_id}")
def get_exam_history(user_id: str):
    """Fetches past exam submissions for a given student ordered by most recent."""
    try:
        res = db.table("exam_history").select("id, syllabus_id, difficulty, total_questions, correct_answers, tab_switches_detected, created_at")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
            
        return {"history": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dashboard/{user_id}")
def get_dashboard(user_id: str):
    """Endpoint hit by the frontend when the student logs in and views their dashboard."""
    try:
        user_res = db.table("users").select("*").eq("id", user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Student not found.")
            
        user_profile = user_res.data[0]
        coach_message = generate_coach_message(user_id)
        
        return {
            "profile": user_profile,
            "coach_message": coach_message
        }
        
    except Exception as e:
        print("CRITICAL DASHBOARD ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))