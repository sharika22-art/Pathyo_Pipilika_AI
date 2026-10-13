from database.client import db
from database.models import ExamSubmission

def calculate_points(difficulty: str, correct_answers: int) -> int:
    """Assigns weighted points based on the difficulty of the quiz."""
    multipliers = {
        "Easy": 10,
        "Medium": 20,
        "Hard": 30
    }
    multiplier = multipliers.get(difficulty, 10)
    return correct_answers * multiplier

def process_exam_submission(submission: ExamSubmission):
    """Logs the exam, updates the user's total points, and triggers a rank recalculation."""
    
    # 1. Calculate the score percentage and weighted points
    score_percentage = (submission.correct_answers / submission.total_questions) * 100
    points_earned = calculate_points(submission.difficulty, submission.correct_answers)

    # 2. Insert the record into exam_history
    db.table("exam_history").insert({
        "user_id": str(submission.user_id),
        "syllabus_id": str(submission.syllabus_id),
        "difficulty": submission.difficulty,
        "total_questions": submission.total_questions,
        "correct_answers": submission.correct_answers,
        "score_percentage": score_percentage,
        "points_earned": points_earned,
        "tab_switches_detected": submission.tab_switches_detected
    }).execute()

    # 3. Add points and coins (1 coin per correct answer) to the user's profile
    user_response = db.table("users").select("total_points, coins, grade").eq("id", str(submission.user_id)).execute()
    
    if user_response.data:
        user_data = user_response.data[0]
        new_total_points = user_data["total_points"] + points_earned
        new_coins = user_data["coins"] + submission.correct_answers
        student_grade = user_data["grade"]

        db.table("users").update({
            "total_points": new_total_points,
            "coins": new_coins
        }).eq("id", str(submission.user_id)).execute()

        # 4. Instantly recalculate the leaderboard for this grade
        update_grade_leaderboard(student_grade)

def update_grade_leaderboard(grade: str):
    """Fetches all students in a grade, sorts by points, and updates their current_rank."""
    
    # Fetch all students in the specific grade, ordered by points descending
    students = db.table("users").select("id").eq("grade", grade).order("total_points", desc=True).execute()
    
    # Loop through and update their current_rank based on their position in the array
    for index, student in enumerate(students.data):
        rank = index + 1
        db.table("users").update({"current_rank": rank}).eq("id", student["id"]).execute()