import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import katex from 'katex';
import 'katex/dist/katex.min.css';

// Direct KaTeX rendering helper (immune to Vite export bugs)
function renderLaTeX(text) {
  if (!text || typeof text !== 'string') return text;
  
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  return parts.map((part, i) => {
    try {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const html = katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const html = katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      }
    } catch (e) {
      return part;
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

  // Anti-Cheat & Anti-Copy Protection Effect
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

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X' || e.key === 'a' || e.key === 'A' || e.key === 'u' || e.key === 'U')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j'))
      ) {
        e.preventDefault();
        setWarningMessage("⚠️ Copying text or opening developer tools is restricted during active exams!");
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      setWarningMessage("⚠️ Copying exam questions is strictly prohibited!");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
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
    if (questions.length === 0 || isSubmitting) return;
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions.length, handleNext, isSubmitting]);

  const handleSelectOption = (optionText) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionText
    });
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center text-white select-none">
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
    <div 
      className="max-w-2xl mx-auto p-6 pt-16 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {warningMessage && (
        <div className="bg-red-600/20 border border-red-500 text-red-300 p-4 rounded-xl mb-6 flex items-center justify-between">
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

        {/* Display Matplotlib graph if image_url is provided */}
        {currentQ.image_url && (
          <div className="mb-6 flex justify-center bg-slate-900 p-4 rounded-xl border border-slate-700 pointer-events-none">
            <img 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/${currentQ.image_url}`} 
              alt="Question Visual" 
              className="max-h-64 rounded-lg object-contain select-none"
            />
          </div>
        )}
        
        {/* Strictly vertical stack layout forced via inline styles to override global CSS conflicts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {currentQ.options?.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option.text;
            return (
              <label
                key={idx}
                onClick={() => handleSelectOption(option.text)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: '16px',
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.25)' : '#0f172a',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 15px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <input
                  type="radio"
                  name={`question-${currentIndex}`}
                  checked={isSelected}
                  onChange={() => handleSelectOption(option.text)}
                  style={{
                    marginTop: '3px',
                    width: '18px',
                    height: '18px',
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.6' }}>
                  {renderLaTeX(option.text)}
                </span>
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
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
        >
          {isSubmitting ? 'Logging to Database...' : currentIndex === questions.length - 1 ? 'Submit Exam 🚀' : 'Next Question ➡'}
        </button>
      </div>
    </div>
  );
}