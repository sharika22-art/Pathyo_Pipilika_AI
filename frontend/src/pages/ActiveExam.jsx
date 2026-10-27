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
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '40px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>No Active Quiz Found</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Please configure your mission and generate an exam first.</p>
        <button 
          type="button"
          onClick={() => navigate('/exam')}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            color: '#fff',
            fontWeight: 800,
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Go to Exam Setup ⚙️
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div 
      style={{ maxWidth: '820px', margin: '20px auto', padding: '0 24px 60px 24px', userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Warning Notification Banner */}
      {warningMessage && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          color: '#fca5a5',
          padding: '16px 20px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
        }}>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{warningMessage}</span>
          <button type="button" onClick={() => setWarningMessage(null)} style={{ background: 'none', border: 'none', color: '#f87171', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Top HUD Telemetry Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '18px',
        padding: '18px 24px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span style={{ color: '#475569' }}>•</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
            Tab Switches: <strong style={{ color: '#ffffff' }}>{tabSwitches}</strong> ({difficulty} Mode)
          </span>
        </div>

        {/* Countdown Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(2, 6, 23, 0.8)',
          padding: '8px 16px',
          borderRadius: '12px',
          border: timeLeft < 10 ? '1px solid rgba(239, 68, 68, 0.8)' : '1px solid rgba(51, 65, 85, 0.8)',
          boxShadow: timeLeft < 10 ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none'
        }}>
          <span style={{ fontSize: '16px' }}>⏳</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: timeLeft < 10 ? '#ef4444' : '#ffffff' }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95))',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(59, 130, 246, 0.35)',
        borderRadius: '24px',
        padding: '36px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px'
      }}>
        {/* Progress Bar Top Line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: 'rgba(51, 65, 85, 0.6)' }}>
          <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.4s ease' }} />
        </div>

        {/* Question Text */}
        <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#ffffff', marginBottom: '24px', lineHeight: '1.6' }}>
          {renderLaTeX(currentQ.question || "Loading question...")}
        </h2>

        {/* Optional Visual / Matplotlib Graph */}
        {currentQ.image_url && (
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center', backgroundColor: '#050816', padding: '16px', borderRadius: '16px', border: '1px solid rgba(51, 65, 85, 0.8)' }}>
            <img 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/${currentQ.image_url}`} 
              alt="Question Visual" 
              style={{ maxHeight: '260px', borderRadius: '10px', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
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
                  padding: '18px 20px',
                  borderRadius: '16px',
                  border: isSelected ? '2px solid #3b82f6' : '2px solid rgba(51, 65, 85, 0.7)',
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.22)' : 'rgba(2, 6, 23, 0.7)',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 20px rgba(37, 99, 235, 0.35)' : 'none',
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
                <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.6', fontSize: '16px', fontWeight: 600 }}>
                  {renderLaTeX(option.text)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleNext}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '16px',
            padding: '16px 36px',
            borderRadius: '16px',
            border: '1px solid rgba(147, 197, 253, 0.4)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.45)',
            transition: 'all 0.2s ease',
          }}
        >
          {isSubmitting ? '⏳ Logging telemetry...' : currentIndex === questions.length - 1 ? 'Submit Exam 🚀' : 'Next Question ➡'}
        </button>
      </div>
    </div>
  );
}