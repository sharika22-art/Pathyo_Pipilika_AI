import os
from openai import OpenAI
from database.client import db

# Initialize OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY"),
)

def update_true_mastery(user_id: str, grade: str, subject: str):
    """Calculates mastery percentage based ONLY on passing 'Hard' difficulty quizzes."""
    syllabus_response = db.table("syllabus").select("id").eq("grade", grade).eq("subject", subject).execute()
    total_chapters = len(syllabus_response.data)
    
    if total_chapters == 0:
        return 0.00
        
    mastered_response = db.table("exam_history").select("syllabus_id").eq("user_id", user_id)\
        .eq("difficulty", "Hard").gte("score_percentage", 80).execute()
        
    mastered_chapter_ids = {record["syllabus_id"] for record in mastered_response.data}
    
    mastery_percentage = (len(mastered_chapter_ids) / total_chapters) * 100
    db.table("users").update({"mastery_percentage": mastery_percentage}).eq("id", user_id).execute()
    
    return mastery_percentage

def generate_coach_message(user_id: str) -> str:
    """Uses OpenRouter to generate a personalized, motivational dashboard message."""
    user_response = db.table("users").select("username, current_rank, mastery_percentage, grade").eq("id", user_id).execute()
    if not user_response.data:
        return "Keep pushing forward! Take a quiz to get started on the leaderboard."
        
    user = user_response.data[0]
    
    recent_exam = db.table("exam_history").select("difficulty, score_percentage, tab_switches_detected")\
        .eq("user_id", user_id).order("completed_at", desc=True).limit(1).execute()
    
    tab_warning = ""
    last_exam_context = "No recent exams."
    if recent_exam.data:
        exam = recent_exam.data[0]
        last_exam_context = f"Scored {exam['score_percentage']}% on {exam['difficulty']} difficulty."
        if exam["tab_switches_detected"] > 0:
            tab_warning = f"CRITICAL: The student switched tabs {exam['tab_switches_detected']} times during their last exam. Give them a strict warning about competitive integrity."

    prompt = f"""
    You are Agent 4, an AI motivational coach for a competitive gamified education platform in Bangladesh.
    
    Student Profile:
    - Name: {user['username']}
    - Grade: {user['grade']}
    - Current Leaderboard Rank: {user['current_rank']}
    - True Syllabus Mastery: {user['mastery_percentage']}%
    - Last Exam: {last_exam_context}
    
    {tab_warning}
    
    Write a short, punchy, 2-3 sentence dashboard message directly to the student. 
    If they are unranked or low mastery, encourage them to try "Hard" difficulty to boost their rank.
    If they cheated (tab switches), address it firmly but professionally. 
    Do not use generic AI greetings. Jump straight into the coaching.
    """
    
    try:
        response = client.chat.completions.create(
            model="google/gemini-3.8-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating coach message via OpenRouter: {e}")
        return "Keep grinding! Tackle a Hard mode quiz today to boost your syllabus mastery and climb the ranks."