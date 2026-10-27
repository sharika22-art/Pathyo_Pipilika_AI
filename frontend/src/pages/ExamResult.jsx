import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

export default function ExamResult() {
  const navigate = useNavigate();
  const location = useLocation();

  // Invalidate cached coach message upon viewing results so the dashboard fetches a fresh reaction
  useEffect(() => {
    const currentUserId = localStorage.getItem('user_id');
    if (currentUserId) {
      localStorage.removeItem(`coach_msg_${currentUserId}`);
      localStorage.removeItem(`exam_count_${currentUserId}`);
    }
  }, []);
  
  const resultData = location.state || {
    correctCount: 0,
    total: 10,
    questions: [],
    selectedAnswers: {},
    difficulty: "Medium",
    tabSwitches: 0
  };

  const { correctCount, total, questions, selectedAnswers, difficulty = "Medium", tabSwitches = 0 } = resultData;

  let penaltyMarks = 0;
  if (difficulty === "Easy") {
    penaltyMarks = tabSwitches * 2;
  } else if (difficulty === "Medium") {
    penaltyMarks = tabSwitches * 5;
  }

  const finalMarks = Math.max(0, correctCount - penaltyMarks);
  const pointsEarned = finalMarks * 10;
  const coinsEarned = finalMarks * 5;

  return (
    <div className="max-w-3xl mx-auto p-6 pt-12">
      {/* Score Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 border border-blue-500/30 text-center mb-10 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Mission Accomplished! 🎉</h1>
        <p className="text-slate-300 mb-6">Here is how you performed on this challenge.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Final Marks</p>
            <p className="text-2xl font-bold text-white">{finalMarks} / {total} <span className="text-xs text-slate-400 font-normal">(Raw: {correctCount})</span></p>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Tab Penalties</p>
            <p className="text-2xl font-bold text-red-400">-{penaltyMarks} marks</p>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Points Earned</p>
            <p className="text-2xl font-bold text-blue-400">+{pointsEarned} pts</p>
          </div>
          <div className="bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Coins Earned</p>
            <p className="text-2xl font-bold text-yellow-400">🪙 +{coinsEarned}</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
        >
          Return to Dashboard 🚀
        </button>
      </div>

      {/* Detailed Question Review */}
      <h2 className="text-2xl font-bold text-white mb-6">Question Breakdown & Review</h2>
      <div className="space-y-8">
        {questions.map((q, idx) => {
          const studentAnswer = selectedAnswers[idx];
          const correctOption = q.options?.find(opt => opt.is_correct);
          const isCorrect = studentAnswer === correctOption?.text;

          return (
            <div 
              key={idx} 
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                border: isCorrect ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid rgba(239, 68, 68, 0.4)',
                padding: '24px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Card Header: Question Number & Correct/Incorrect Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  Question {idx + 1}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 12px', 
                  borderRadius: '9999px', 
                  fontWeight: 'bold', 
                  backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: isCorrect ? '#6ee7b7' : '#fca5a5', 
                  border: isCorrect ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)' 
                }}>
                  {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                </span>
              </div>

              {/* Question Text */}
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '20px', lineHeight: '1.6' }}>
                {renderLaTeX(q.question)}
              </h3>
              
              {/* Answer Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '14px', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ color: '#cbd5e1' }}>
                  Your Answer: <strong style={{ color: isCorrect ? '#34d399' : '#f87171' }}>{renderLaTeX(studentAnswer) || 'Not Answered'}</strong>
                </div>
                {!isCorrect && (
                  <div style={{ color: '#cbd5e1' }}>
                    Correct Answer: <strong style={{ color: '#34d399' }}>{renderLaTeX(correctOption?.text)}</strong>
                  </div>
                )}
              </div>

              {/* Step-by-Step Explanation */}
              {q.explanation && (
                <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid #334155', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '6px' }}>Explanation:</strong>
                  {renderLaTeX(q.explanation)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}