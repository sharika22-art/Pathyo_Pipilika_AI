import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = localStorage.getItem('user_id');
  const userGrade = localStorage.getItem('grade') || '9-10';

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/leaderboard/${userGrade}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching leaderboard:", err);
        setLoading(false);
      });
  }, [userGrade]);

  return (
    <div className="max-w-2xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">🏆 Class {userGrade} Leaderboard</h1>
        <button 
          onClick={() => navigate('/')}
          className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 hover:text-white transition-all"
        >
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading rankings...</div>
      ) : (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          {leaderboard.map((user, index) => {
            const isMe = user.id === currentUserId;
            return (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-4 border-b border-slate-700/50 ${
                  isMe ? 'bg-blue-600/20 border-blue-500/50' : 'hover:bg-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg w-8 text-center ${
                    index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      {user.username} {isMe && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">You</span>}
                    </p>
                    <p className="text-xs text-slate-400">Mastery: {user.mastery_percentage || 0}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-blue-400">{user.total_points} pts</p>
                    <p className="text-xs text-yellow-400">🪙 {user.coins} coins</p>
                  </div>
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-slate-400">No students ranked yet. Be the first to take an exam!</div>
          )}
        </div>
      )}
    </div>
  );
}