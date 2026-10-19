import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = localStorage.getItem('user_id') || "123e4567-e89b-12d3-a456-426614174000";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/history/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.history) {
          setHistory(data.history);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching exam history:", err);
        setLoading(false);
      });
  }, [currentUserId]);

  return (
    <div className="max-w-3xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">📈 Exam History & Analytics</h1>
          <p className="text-slate-400">Review your past performance and track your growth.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 hover:text-white transition-all"
        >
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading history...</div>
      ) : (
        <div className="space-y-4">
          {history.map((exam, index) => {
            const percentage = Math.round((exam.correct_answers / exam.total_questions) * 100);
            const dateStr = new Date(exam.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div 
                key={exam.id || index}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs px-3 py-1 rounded-full font-bold">
                      {exam.difficulty} Mode
                    </span>
                    <span className="text-xs text-slate-400">{dateStr}</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    Score: {exam.correct_answers} / {exam.total_questions} ({percentage}%)
                  </p>
                  {exam.tab_switches_detected > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ Tab switches recorded: {exam.tab_switches_detected}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-black ${
                    percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700 text-slate-400">
              <p className="text-lg font-bold mb-2">No exam history found yet!</p>
              <p className="text-sm mb-6">Complete your first mission to populate your analytics.</p>
              <button 
                onClick={() => navigate('/exam')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
              >
                Start an Exam ⚡
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}