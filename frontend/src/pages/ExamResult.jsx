import { useLocation, useNavigate } from 'react-router-dom';

import katex from 'katex';
import 'katex/dist/katex.min.css';

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
    <div className="max-w-2xl mx-auto p-6 pt-12">
      {/* Score Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 border border-blue-500/30 text-center mb-8 shadow-2xl">
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
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg"
        >
          Return to Dashboard 🚀
        </button>
      </div>

      {/* Detailed Question Review */}
      <h2 className="text-2xl font-bold text-white mb-6">Question Breakdown & Review</h2>
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const studentAnswer = selectedAnswers[idx];
          const correctOption = q.options.find(opt => opt.is_correct);
          const isCorrect = studentAnswer === correctOption?.text;

          return (
            <div key={idx} className={`bg-slate-800 rounded-xl p-6 border ${isCorrect ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(51, 65, 85, 0.6)' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#cbd5e1' }}>
                  Question {idx + 1}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 12px', 
                  borderRadius: '9999px', 
                  fontWeight: 'bold', 
                  backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                  color: isCorrect ? '#6ee7b7' : '#fca5a5', 
                  border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' 
                }}>
                  {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-4 leading-relaxed">
                {renderLaTeX(q.question)}
              </h3>
              
              <div className="space-y-2 mb-4 text-sm">
                <p className="text-slate-300">
                  Your Answer: <strong className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{renderLaTeX(studentAnswer) || 'Not Answered'}</strong>
                </p>
                {!isCorrect && (
                  <p className="text-slate-300">
                    Correct Answer: <strong className="text-emerald-400">{renderLaTeX(correctOption?.text)}</strong>
                  </p>
                )}
              </div>

              {q.explanation && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                  <strong className="text-indigo-300 block mb-1">Explanation:</strong>
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