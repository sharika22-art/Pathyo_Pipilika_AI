import { useLocation, useNavigate } from 'react-router-dom';

export default function ExamResult() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract results passed from ActiveExam via router state
  const resultData = location.state || {
    score: 0,
    total: 3,
    correctCount: 0,
    questions: [],
    selectedAnswers: {}
  };

  const { correctCount, total, questions, selectedAnswers } = resultData;
  const pointsEarned = correctCount * 10; // Weighted point calculation
  const coinsEarned = correctCount * 5;

  return (
    <div className="max-w-2xl mx-auto p-6 pt-12">
      {/* Score Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 border border-blue-500/30 text-center mb-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Mission Accomplished! 🎉</h1>
        <p className="text-slate-300 mb-6">Here is how you performed on this challenge.</p>
        
        <div className="flex justify-center gap-6 mb-6">
          <div className="bg-slate-900/60 px-6 py-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400">Score</p>
            <p className="text-3xl font-bold text-white">{correctCount} / {total}</p>
          </div>
          <div className="bg-slate-900/60 px-6 py-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400">Points Earned</p>
            <p className="text-3xl font-bold text-blue-400">+{pointsEarned} pts</p>
          </div>
          <div className="bg-slate-900/60 px-6 py-4 rounded-xl border border-slate-700">
            <p className="text-sm text-slate-400">Coins Earned</p>
            <p className="text-3xl font-bold text-yellow-400">🪙 +{coinsEarned}</p>
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
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-bold text-slate-400">Question {idx + 1}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">{q.question}</h3>
              
              <div className="space-y-2 mb-4 text-sm">
                <p className="text-slate-300">
                  Your Answer: <strong className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{studentAnswer || 'Not Answered'}</strong>
                </p>
                {!isCorrect && (
                  <p className="text-slate-300">
                    Correct Answer: <strong className="text-emerald-400">{correctOption?.text}</strong>
                  </p>
                )}
              </div>

              {q.explanation && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                  <strong className="text-indigo-300 block mb-1">Explanation:</strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}