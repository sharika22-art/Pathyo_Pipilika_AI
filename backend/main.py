from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
import json

# Import our database client and models
from database.client import db
from database.models import ExamSubmission

# Import Agent 3 and Agent 4
from agents.rank_watcher import process_exam_submission
from agents.coach import update_true_mastery, generate_coach_message

# Import Agent 1 (Generator + RAG) and Agent 2 (Reviewer)
from agents.generator import generate_quiz, retrieve_textbook_context
from agents.reviewer import review_and_verify_quiz

app = FastAPI(title="Gamified Edu Platform API")

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

@app.post("/register")
def register_user(user: UserRegister):
    """Registers a new student, generates a unique UUID, and stores them in Supabase."""
    try:
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

        # Insert into Supabase users table
        response = db.table("users").insert(profile_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create user record in database.")

        return {
            "status": "success",
            "message": "User registered successfully.",
            "user": response.data[0]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/syllabus")
def get_syllabus(grade: str, subject: str):
    """Fetches chapters and their corresponding topics for a given grade and subject from Supabase."""
    try:
        # 1. Fetch chapters matching the grade and subject, ordered by chapter number
        syllabus_res = db.table("syllabus")\
            .select("*")\
            .eq("grade", grade)\
            .eq("subject", subject)\
            .order("chapter_number")\
            .execute()
        
        if not syllabus_res.data:
            return {"chapters": []}
            
        chapters = syllabus_res.data
        
        # 2. Attach the specific topics to each chapter for strict AI scoping
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
        textbook_context = retrieve_textbook_context(chapter_name, topic_name)

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
            textbook_context=textbook_context,
            grade=grade,
            subject=subject,
            chapter=chapter_name,
            difficulty=req.difficulty
        )
        
        return {
            "status": "success",
            "chapter": chapter_name,
            "topic": topic_name,
            "quiz": json.loads(verified_quiz_json)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@app.post("/submit-exam")
def submit_exam(submission: ExamSubmission):
    """Endpoint hit by the frontend when a student finishes a quiz or the timer runs out."""
    try:
        # 1. Agent 3: Process the score, award coins, and update the leaderboard
        process_exam_submission(submission)
        
        # 2. Fetch the syllabus details to update mastery
        syllabus_res = db.table("syllabus").select("grade, subject").eq("id", str(submission.syllabus_id)).execute()
        
        if syllabus_res.data:
            grade = syllabus_res.data[0]["grade"]
            subject = syllabus_res.data[0]["subject"]
            
            # 3. Agent 4: Recalculate true mastery (only triggers on Hard mode internally)
            if submission.difficulty == "Hard":
                update_true_mastery(str(submission.user_id), grade, subject)
                
        return {"status": "success", "message": "Exam logged, rank updated, and mastery calculated."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/{user_id}")
def get_dashboard(user_id: str):
    """Endpoint hit by the frontend when the student logs in and views their dashboard."""
    try:
        # 1. Fetch the student's updated profile (coins, rank, points, mastery)
        user_res = db.table("users").select("*").eq("id", user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Student not found.")
            
        user_profile = user_res.data[0]
        
        # 2. Agent 4: Generate a personalized push notification
        coach_message = generate_coach_message(user_id)
        
        return {
            "profile": user_profile,
            "coach_message": coach_message
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))