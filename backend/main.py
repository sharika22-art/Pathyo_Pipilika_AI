from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4

# Import our database client and models
from database.client import db
from database.models import ExamSubmission

# Import Agent 3 and Agent 4
from agents.rank_watcher import process_exam_submission
from agents.coach import update_true_mastery, generate_coach_message

# (Assuming Agent 1 and 2 are imported here, e.g., from agents.generator import generate_quiz)

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