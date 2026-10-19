import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ActiveExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract quiz data passed from ExamSetup via router state, with a fallback if accessed directly
  const quizPackage = location.state?.quizData || { questions: [] };
  const syllabusId = location.state?.syllabus_id || "987e6543-e21b-12d3-a456-426614174099";
  const difficulty = location.state?.difficulty || "Medium";

  const questions = quizPackage.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds per AI question
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null);

  // Anti-Cheat: Listen for tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const newCount = prev + 1;
          setWarningMessage(`⚠️ WARNING #${newCount}: Tab switching detected! Agent 4 is logging this violation.`);
          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (questions.length === 0) return;
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions.length]);

  const handleSelectOption = (optionText) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionText
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(45);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    setIsSubmitting(true);
    let correctCount = 0;

    questions.forEach((q, idx) => {
      const selectedText = selectedAnswers[idx];
      // Find the option object where is_correct is true
      const correctOption = q.options.find(opt => opt.is_correct);
      
      if (selectedText && correctOption && selectedText === correctOption.text) {
        correctCount++;
      }
    });

    const currentUserId = localStorage.getItem('user_id') || "123e4567-e89b-12d3-a456-426614174000";

    const payload = {
      user_id: currentUserId,
      syllabus_id: syllabusId,
      difficulty: difficulty,
      total_questions: questions.length,
      correct_answers: correctCount,
      tab_switches_detected: tabSwitches
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/submit-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to submit exam to backend");
      
      const result = await response.json();
      console.log("Exam successfully logged:", result);
      
      // Navigate to the post-exam results screen with breakdown data
      navigate('/exam/result', { 
        state: { 
          correctCount, 
          total: questions.length, 
          questions, 
          selectedAnswers 
        } 
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("Submission error. Make sure your FastAPI backend is running!");
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">No Active Quiz Found</h2>
        <p className="text-slate-400 mb-6">Please configure your mission and generate an exam first.</p>
        <button 
          onClick={() => navigate('/exam')}
          className="bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all"
        >
          Go to Exam Setup ⚙️
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 pt-16">
      {warningMessage && (
        <div className="bg-red-600/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center justify-between animate-bounce">
          <span className="font-bold">{warningMessage}</span>
          <button onClick={() => setWarningMessage(null)} className="text-red-400 font-bold px-2">✕</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <span className="text-slate-400 font-medium">Question {currentIndex + 1} of {questions.length}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">Tab Switches: <strong className="text-red-400">{tabSwitches}</strong></span>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-red-400">⏳</span>
            <span className={`font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">{currentQ.question}</h2>
        <div className="space-y-4">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option.text;
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option.text)}
                className={`w-full text-left p-4 rounded-xl border font-medium transition-all ${
                  isSelected ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          disabled={isSubmitting}
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg"
        >
          {isSubmitting ? 'Logging to Database...' : currentIndex === questions.length - 1 ? 'Submit Exam 🚀' : 'Next Question ➡'}
        </button>
      </div>
    </div>
  );
}