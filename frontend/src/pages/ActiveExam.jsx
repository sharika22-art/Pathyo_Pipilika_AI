import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InlineMath, BlockMath } from '@matejmazur/react-katex';
import 'katex/dist/katex.min.css';

// Helper function to parse and render inline/block LaTeX wrapped in $...$ or $$...$$
function renderLaTeX(text) {
  if (!text || typeof text !== 'string') return text;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={i} math={part.slice(2, -2)} />;
    } else if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    }
    return part;
  });
}

export default function ActiveExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawStateData = location.state?.quizData || localStorage.getItem('active_quiz');
  const syllabusId = location.state?.syllabus_id || localStorage.getItem('active_syllabus_id') || "987e6543-e21b-12d3-a456-426614174099";
  const difficulty = location.state?.difficulty || localStorage.getItem('active_difficulty') || "Medium";

  let parsedQuizData = rawStateData;
  if (typeof rawStateData === 'string') {
    try {
      parsedQuizData = JSON.parse(rawStateData);
    } catch (e) {}
  }
  if (typeof parsedQuizData === 'string') {
    try {
      parsedQuizData = JSON.parse(parsedQuizData);
    } catch (e) {}
  }

  const findQuestionsArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.questions)) return data.questions;
    if (Array.isArray(data.quiz)) return data.quiz;
    if (Array.isArray(data.data)) return data.data;
    if (data.quiz && Array.isArray(data.quiz.questions)) return data.quiz.questions;

    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        const result = findQuestionsArray(data[key]);
        if (result.length > 0) return result;
      }
    }
    return [];
  };

  const questions = findQuestionsArray(parsedQuizData);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(45);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null);

  const tabSwitchesRef = useRef(tabSwitches);
  tabSwitchesRef.current = tabSwitches;
  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;

  const finishExam = useCallback(async (currentTabSwitchesCount) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let correctCount = 0;

    questions.forEach((q, idx) => {
      const selectedText = selectedAnswersRef.current[idx];
      const correctOption = q.options?.find(opt => opt.is_correct);
      
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
      tab_switches_detected: currentTabSwitchesCount
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/submit-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to submit exam to backend");
      
      localStorage.removeItem('active_quiz');
      localStorage.removeItem('active_syllabus_id');
      localStorage.removeItem('active_difficulty');

      navigate('/exam/result', { 
        state: { 
          correctCount, 
          total: questions.length, 
          questions, 
          selectedAnswers: selectedAnswersRef.current,
          difficulty,
          tabSwitches: currentTabSwitchesCount
        } 
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("Submission error. Make sure your FastAPI backend is running!");
      setIsSubmitting(false);
    }
  }, [questions, syllabusId, difficulty, navigate, isSubmitting]);

  // Anti-Cheat: Difficulty-based penalties & auto-submission logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitchesRef.current + 1;
        setTabSwitches(newCount);

        if (difficulty === "Hard") {
          alert("🚨 CRITICAL: Tab switching on Hard difficulty triggers immediate auto-submission!");
          finishExam(newCount);
        } else if (difficulty === "Medium") {
          setWarningMessage(`⚠️ Warning #${newCount}: Tab switch detected! 5 marks will be deducted from your score.`);
        } else if (difficulty === "Easy") {
          setWarningMessage(`⚠️ Warning #${newCount}: Tab switch detected! 2 marks will be deducted per switch.`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [difficulty, finishExam]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(45);
    } else {
      finishExam(tabSwitchesRef.current);
    }
  }, [currentIndex, questions.length, finishExam]);

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
  }, [timeLeft, questions.length, handleNext]);

  const handleSelectOption = (optionText) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionText
    });
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">No Active Quiz Found</h2>
        <p className="text-slate-400 mb-6">Please configure your mission and generate an exam first.</p>
        <button 
          type="button"
          onClick={() => navigate('/exam')}
          className="bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all"
        >
          Go to Exam Setup ⚙️
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};

  return (
    <div className="max-w-2xl mx-auto p-6 pt-16">
      {warningMessage && (
        <div className="bg-red-600/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center justify-between animate-bounce">
          <span className="font-bold">{warningMessage}</span>
          <button type="button" onClick={() => setWarningMessage(null)} className="text-red-400 font-bold px-2">✕</button>
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
        <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
          {renderLaTeX(currentQ.question || "Loading question...")}
        </h2>
        
        {/* Explicit vertical stacking for options */}
        <div className="flex flex-col space-y-3 w-full">
          {currentQ.options?.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option.text;
            return (
              <label
                key={idx}
                onClick={() => handleSelectOption(option.text)}
                className={`w-full text-left p-4 rounded-xl border font-medium transition-all flex items-center space-x-4 cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentIndex}`}
                  checked={isSelected}
                  onChange={() => handleSelectOption(option.text)}
                  className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <span className="flex-1">{renderLaTeX(option.text)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
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