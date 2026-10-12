from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

# ==========================================
# User Models
# ==========================================
class UserCreate(BaseModel):
    """Payload for registering a new student."""
    username: str = Field(..., description="Unique username for the student")
    grade: str = Field(..., description="Student's current grade (e.g., '9', '10', 'SSC')")

class UserProfile(UserCreate):
    """Full user profile returned from the database."""
    id: UUID
    total_points: int = 0
    coins: int = 0
    current_rank: Optional[int] = None
    mastery_percentage: float = 0.00
    created_at: datetime

# ==========================================
# Syllabus Models
# ==========================================
class SyllabusEntry(BaseModel):
    """A chapter inside the Bangladesh Curriculum."""
    id: UUID
    grade: str
    subject: str
    chapter_number: int
    chapter_name: str

# ==========================================
# Exam & Scoring Models
# ==========================================
class ExamSubmission(BaseModel):
    """Payload sent from the React frontend when a timer ends or quiz is finished."""
    user_id: UUID
    syllabus_id: UUID
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    total_questions: int
    correct_answers: int
    tab_switches_detected: int = 0  # Crucial for Agent 4's anti-cheat warnings

class ExamRecord(ExamSubmission):
    """Full exam record after Agent 3 calculates the score and points."""
    id: UUID
    score_percentage: float
    points_earned: int
    completed_at: datetime