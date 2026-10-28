import os
import io
import time
import glob
import base64
import random
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, APIRouter
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
from openai import OpenAI

app = FastAPI(title="Gamified Edu Platform API")

os.makedirs("backend/static/graphs", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Configure CORS so the React frontend (running on a different port) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory caches so reloading the page doesn't regenerate the graph or coach message
# Only invalidated when the student submits a new quiz in /submit-exam
PROGRESS_GRAPH_CACHE: dict[str, str] = {}
COACH_MESSAGE_CACHE: dict[str, str] = {}


def cleanup_old_quiz_visuals(max_age_seconds: int = 1800):
    """
    Deletes generated quiz figures (dynamic_visual_*, visual_*, progress_curve_*)
    from backend/static/graphs/.
    - max_age_seconds=1800 (30 mins): cleans up abandoned quiz visuals.
    - max_age_seconds=0: immediately wipes all temporary visuals after exam submission.
    """
    graphs_dir = os.path.join("backend", "static", "graphs")
    if not os.path.exists(graphs_dir):
        return

    now = time.time()
    for filepath in glob.glob(os.path.join(graphs_dir, "*.png")):
        try:
            if max_age_seconds == 0 or (now - os.path.getmtime(filepath) >= max_age_seconds):
                os.remove(filepath)
        except Exception as e:
            print(f"Cleanup warning for {filepath}: {e}")


@app.get("/")
def read_root():
    return {"status": "Backend is active and agents are ready."}

class UserRegister(BaseModel):
    username: str
    grade: str

class UserLogin(BaseModel):
    username: str

@app.post("/register")
def register_user(user: UserRegister):
    """Registers a new student after checking if the username already exists."""
    try:
        existing_user = db.table("users").select("*").eq("username", user.username).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(
                status_code=400, 
                detail="Username not available, try another one."
            )
        
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
    version: str = "English"

@app.post("/generate-quiz")
def generate_quiz_route(req: QuizRequest):
    """Triggers Agent 1 (RAG + Generation) and Agent 2 (Context-Aware Review) for a selected chapter."""
    try:
        # Clean up any leftover quiz images older than 30 minutes before generating new ones
        cleanup_old_quiz_visuals(max_age_seconds=1800)

        syllabus_res = db.table("syllabus").select("grade, subject, chapter_name").eq("id", req.syllabus_id).execute()
        if not syllabus_res.data:
            raise HTTPException(status_code=404, detail="Syllabus chapter not found.")
            
        chapter_info = syllabus_res.data[0]
        grade = chapter_info["grade"]
        subject = chapter_info["subject"]
        chapter_name = chapter_info["chapter_name"]
        
        topics_res = db.table("chapter_topics").select("topic_name").eq("syllabus_id", req.syllabus_id).limit(1).execute()
        topic_name = topics_res.data[0]["topic_name"] if topics_res.data else chapter_name

        textbook_context = retrieve_comprehensive_context(chapter_name, topic_name)

        raw_quiz_json = generate_quiz(
            grade=grade, 
            subject=subject, 
            chapter=chapter_name, 
            topic=topic_name, 
            difficulty=req.difficulty,
            version=req.version
        )
        
        verified_quiz_json = review_and_verify_quiz(
            raw_quiz_json=raw_quiz_json,
            reference_context=textbook_context,
            grade=grade,
            subject=subject,
            chapter=chapter_name,
            difficulty=req.difficulty
        )

        parsed_quiz = verified_quiz_json
        if isinstance(verified_quiz_json, str):
            clean_str = verified_quiz_json.replace("```json", "").replace("```", "").strip()
            try:
                parsed_quiz = json.loads(clean_str) if clean_str else {}
            except Exception as json_err:
                print(f"JSON Decode Warning: {json_err}. Fallback to empty structure.")
                parsed_quiz = {}

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
        user_id_str = str(submission.user_id)
        process_exam_submission(submission)
        
        syllabus_res = db.table("syllabus").select("grade, subject").eq("id", str(submission.syllabus_id)).execute()
        
        if syllabus_res.data:
            grade = syllabus_res.data[0]["grade"]
            subject = syllabus_res.data[0]["subject"]
            
            if submission.difficulty in ["Medium", "Hard"]:
                update_true_mastery(user_id_str, grade, subject)

        # 1. Invalidate cached progress graph and coach message for this user so they regenerate on next visit
        PROGRESS_GRAPH_CACHE.pop(user_id_str, None)
        COACH_MESSAGE_CACHE.pop(user_id_str, None)

        # 2. Immediately delete the temporary quiz visuals from backend/static/graphs/ now that the quiz is done
        cleanup_old_quiz_visuals(max_age_seconds=0)
                
        return {"status": "success", "message": "Exam logged, rank updated, mastery calculated, and temp visuals cleaned."}
    
    except Exception as e:
        print(f"CRITICAL SUBMISSION ERROR: {traceback.format_exc()}")
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
    """Fetches past exam submissions for a given student along with subject and chapter details."""
    try:
        res = db.table("exam_history").select(
            "id, syllabus_id, difficulty, total_questions, correct_answers, tab_switches_detected, completed_at"
        ).eq("user_id", user_id).order("completed_at", desc=True).execute()

        history_rows = res.data or []

        # Collect unique syllabus_ids to fetch subject and chapter names in one query
        syllabus_ids = list({row["syllabus_id"] for row in history_rows if row.get("syllabus_id")})
        syllabus_map = {}

        if syllabus_ids:
            syl_res = db.table("syllabus").select("id, subject, chapter_number, chapter_name").in_("id", syllabus_ids).execute()
            for s in (syl_res.data or []):
                syllabus_map[s["id"]] = s

        # Attach subject and chapter info to each history item
        for row in history_rows:
            syl_info = syllabus_map.get(row.get("syllabus_id"), {})
            row["subject"] = syl_info.get("subject", "SSC Subject")
            row["chapter_number"] = syl_info.get("chapter_number")
            row["chapter_name"] = syl_info.get("chapter_name", "General Chapter")

        return {"history": history_rows}
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

        # Return cached coach message unless invalidated by a new exam submission
        if user_id not in COACH_MESSAGE_CACHE:
            COACH_MESSAGE_CACHE[user_id] = generate_coach_message(user_id)
        coach_message = COACH_MESSAGE_CACHE[user_id]
        
        return {
            "profile": user_profile,
            "coach_message": coach_message
        }
        
    except Exception as e:
        print("CRITICAL DASHBOARD ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-progress-graph/{user_id}")
def generate_user_progress_graph(user_id: str):
    """
    Returns the student's progression curve as an in-memory Base64 Data URI (never saved to disk).
    Cached per user_id so page reloads do not regenerate the graph; cache is cleared on /submit-exam.
    """
    try:
        # 1. Serve directly from RAM cache if the user hasn't taken a new quiz since last generation
        if user_id in PROGRESS_GRAPH_CACHE:
            return {"graph_url": PROGRESS_GRAPH_CACHE[user_id]}

        res = db.table("exam_history") \
            .select("correct_answers, total_questions, difficulty, completed_at") \
            .eq("user_id", user_id) \
            .order("completed_at", desc=False) \
            .limit(8) \
            .execute()

        scores = []
        attempts = []

        if res.data and len(res.data) > 0:
            for idx, item in enumerate(res.data):
                total = item.get("total_questions", 10)
                correct = item.get("correct_answers", 0)
                accuracy = round((correct / max(total, 1)) * 100, 1)
                scores.append(accuracy)
                attempts.append(f"Mission {idx + 1}")
        else:
            scores = [45, 60, 55, 75, 82, 88]
            attempts = [f"Mission {i+1}" for i in range(len(scores))]

        plt.clf()
        plt.close('all')

        fig, ax = plt.subplots(figsize=(7, 3.8))
        fig.patch.set_facecolor('#0f172a')
        ax.set_facecolor('#0f172a')

        ax.plot(attempts, scores, marker='o', color='#38bdf8', linewidth=3, markersize=8, label="Accuracy %", zorder=3)
        ax.fill_between(attempts, scores, color='#38bdf8', alpha=0.18, zorder=2)

        ax.set_title("Actual Academic Progression Curve", color='#f8fafc', fontsize=12, fontweight='bold', pad=14)
        ax.set_ylabel("Accuracy (%)", color='#94a3b8', fontsize=10, fontweight='bold')
        ax.set_ylim(0, 105)
        ax.grid(True, linestyle='--', alpha=0.25, color='#475569', zorder=1)

        ax.tick_params(colors='#94a3b8', labelsize=9)
        for spine in ax.spines.values():
            spine.set_color('#334155')

        plt.tight_layout()

        # Render PNG into an in-memory buffer instead of saving to disk
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=160, facecolor=fig.get_facecolor(), edgecolor='none')
        buf.seek(0)
        plt.close('all')

        encoded_base64 = base64.b64encode(buf.read()).decode('utf-8')
        data_uri = f"data:image/png;base64,{encoded_base64}"

        # Cache in memory until the user completes another quiz
        PROGRESS_GRAPH_CACHE[user_id] = data_uri

        return {"graph_url": data_uri}

    except Exception as e:
        print(f"Progress Graph Generation Error: {e}")
        return {"graph_url": None}

class ChatMessage(BaseModel):
    role: str
    content: str

class LeoChatRequest(BaseModel):
    user_id: str
    message: str
    history: list[ChatMessage] = []
    subject: str = "General Science"

@app.post("/leo-chat")
def leo_chat_endpoint(req: LeoChatRequest):
    """
    Endpoint for Leo AI Tutor. Deducts 10 coins, passes full conversation history, 
    and retrieves RAG context for Bangladesh NCTB Class 9-10.
    """
    try:
        # Bypass coin deduction if guest mode
        if req.user_id != "guest":
            user_res = db.table("users").select("coins").eq("id", req.user_id).execute()
            if not user_res.data:
                raise HTTPException(status_code=404, detail="User not found.")
            
            current_coins = user_res.data[0].get("coins", 0)
            COIN_COST = 10  # Cost per question set to 10 coins

            if current_coins < COIN_COST:
                raise HTTPException(
                    status_code=400, 
                    detail=f"⚠️ Not enough coins! You need {COIN_COST} coins to ask Leo (Current: {current_coins} coins). Complete quizzes to earn more! 🚀"
                )

            new_coins = current_coins - COIN_COST
            db.table("users").update({"coins": new_coins}).eq("id", req.user_id).execute()
        else:
            new_coins = 0

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY"),
        )

        context = retrieve_comprehensive_context(req.subject, req.message)

        system_prompt = f"""
        You are Leo, the official AI study companion and tutor for পাঠ্যপিপীলিকা (Pathyo Pipilika), specialized in the Bangladesh NCTB Class 9-10 (SSC) curriculum.
        Your goal is to help students master Physics, Chemistry, Biology, General Math, Higher Math, and other SSC subjects.

        CORE GUIDELINES:
        1. STRICT NCTB SYLLABUS BOUNDARY: Keep all explanations, formulas, definitions, and numerical problem-solving techniques strictly aligned with official Class 9-10 textbooks. Do NOT introduce college-level (HSC) or university-level theories.
        2. ENCOURAGING & GAMIFIED TONE: Talk to students like an enthusiastic, supportive mentor ("ভাইয়া" or friendly peer coach style where fitting). Celebrate their effort and motivate them!
        3. STEP-BY-STEP PROBLEM SOLVING: When solving math or physics/chemistry numerical problems, break them down clearly:
           - Given values (দেওয়া আছে)
           - Formula to apply (সূত্র)
           - Step-by-step calculation (সমাধান)
           - Answer with proper units (এককসহ উত্তর)
        4. FORMATTING: Use LaTeX for all mathematical expressions and formulas (e.g., $s = vt + \\frac{1}{2}at^2$, $F = ma$). Keep explanations clear and thorough.

        Retrieved Textbook Context:
        {context}
        """

        messages = [{"role": "system", "content": system_prompt}]
        for h in req.history:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": req.message})

        response = client.chat.completions.create(
            model="google/gemini-3.8-flash",
            messages=messages,
            temperature=0.4,
            max_tokens=4000  # High token limit to prevent mid-sentence cutoffs
        )

        reply = response.choices[0].message.content
        return {"status": "success", "reply": reply, "remaining_coins": new_coins}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Leo AI Tutor Error: {e}")
        return {
            "status": "error", 
            "reply": "My neural link stuttered momentarily! Remember to break down your given values and apply standard SSC formulas step-by-step."
        }