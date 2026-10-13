import os
import google.generativeai as genai
from database.client import db

# Configure the Gemini client
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def update_true_mastery(user_id: str, grade: str, subject: str):
    """Calculates mastery percentage based ONLY on passing 'Hard' difficulty quizzes."""
    
    # 1. Get total number of chapters in the curriculum for this subject
    syllabus_response = db.table("syllabus").select("id").eq("grade", grade).eq("subject", subject).execute()
    total_chapters = len(syllabus_response.data)
    
    if total_chapters == 0:
        return 0.00
        
    # 2. Get unique chapters where the student scored >= 80% on 'Hard'
    mastered_response = db.table("exam_history").select("syllabus_id").eq("user_id", user_id)\
        .eq("difficulty", "Hard").gte("score_percentage", 80).execute()
        
    # Use a set to count unique chapters mastered
    mastered_chapter_ids = {record["syllabus_id"] for record in mastered_response.data}
    
    # 3. Calculate and update database
    mastery_percentage = (len(mastered_chapter_ids) / total_chapters) * 100
    db.table("users").update({"mastery_percentage": mastery_percentage}).eq("id", user_id).execute()
    
    return mastery_percentage

def generate_coach_message(user_id: str) -> str:
    """Uses Gemini 1.5 Flash to generate a personalized, motivational dashboard message."""
    
    # 1. Fetch the student's current profile
    user_response = db.table("users").select("username, current_rank, mastery_percentage, grade").eq("id", user_id).execute()
    if not user_response.data:
        return "Keep pushing forward! Take a quiz to get started on the leaderboard."
        
    user = user_response.data[0]
    
    # 2. Check their most recent exam for anti-cheat logging
    recent_exam = db.table("exam_history").select("difficulty, score_percentage, tab_switches_detected")\
        .eq("user_id", user_id).order("completed_at", desc=True).limit(1).execute()
    
    tab_warning = ""
    last_exam_context = "No recent exams."
    if recent_exam.data:
        exam = recent_exam.data[0]
        last_exam_context = f"Scored {exam['score_percentage']}% on {exam['difficulty']} difficulty."
        if exam["tab_switches_detected"] > 0:
            tab_warning = f"CRITICAL: The student switched tabs {exam['tab_switches_detected']} times during their last exam. Give them a strict warning about competitive integrity."

    # 3. Build the prompt for Gemini
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
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating coach message: {e}")
        return "Keep grinding! Tackle a Hard mode quiz today to boost your syllabus mastery and climb the ranks."