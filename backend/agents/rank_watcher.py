from database.client import db
from database.models import ExamSubmission

def calculate_exam_score(difficulty: str, correct_answers: int, total_questions: int, tab_switches: int) -> dict:
    """Calculates final marks, points, and coins based on exact difficulty penalty rules."""
    
    base_marks = correct_answers
    penalty_marks = 0

    if difficulty == "Easy":
        penalty_marks = tab_switches * 2
    elif difficulty == "Medium":
        penalty_marks = tab_switches * 5
    elif difficulty == "Hard":
        pass

    final_marks = max(0, base_marks - penalty_marks)
    
    points_earned = final_marks * 10
    coins_earned = final_marks * 5

    return {
        "final_marks": final_marks,
        "penalty_marks": penalty_marks,
        "points_earned": points_earned,
        "coins_earned": coins_earned
    }

def process_exam_submission(submission: ExamSubmission):
    """Logs the exam, updates user total points/coins, evaluates medium-tier mastery percentage, and triggers rank recalculation."""
    
    score_data = calculate_exam_score(
        difficulty=submission.difficulty,
        correct_answers=submission.correct_answers,
        total_questions=submission.total_questions,
        tab_switches=submission.tab_switches_detected
    )

    score_percentage = (score_data["final_marks"] / submission.total_questions) * 100

    # 1. Insert record into exam_history
    db.table("exam_history").insert({
        "user_id": str(submission.user_id),
        "syllabus_id": str(submission.syllabus_id),
        "difficulty": submission.difficulty,
        "total_questions": submission.total_questions,
        "correct_answers": score_data["final_marks"],
        "score_percentage": score_percentage,
        "points_earned": score_data["points_earned"],
        "tab_switches_detected": submission.tab_switches_detected
    }).execute()

    # 2. Update user profile points, coins, and evaluate mastery percentage using the correct 'mastery_percentage' column
    user_response = db.table("users").select("total_points, coins, grade, mastery_percentage").eq("id", str(submission.user_id)).execute()
    
    if user_response.data:
        user_data = user_response.data[0]
        new_total_points = user_data["total_points"] + score_data["points_earned"]
        new_coins = user_data["coins"] + score_data["coins_earned"]
        student_grade = user_data["grade"]

        current_mastery_percentage = user_data.get("mastery_percentage", 0.00)
        if submission.difficulty in ["Medium", "Hard"] and score_percentage >= 75.0:
            current_mastery_percentage = max(current_mastery_percentage, 100.0)

        db.table("users").update({
            "total_points": new_total_points,
            "coins": new_coins,
            "mastery_percentage": current_mastery_percentage
        }).eq("id", str(submission.user_id)).execute()

        update_grade_leaderboard(student_grade)

def update_grade_leaderboard(grade: str):
    """Recalculates leaderboard ranks for the grade based on accumulated points."""
    students = db.table("users").select("id").eq("grade", grade).order("total_points", desc=True).execute()
    for index, student in enumerate(students.data):
        rank = index + 1
        db.table("users").update({"current_rank": rank}).eq("id", student["id"]).execute()