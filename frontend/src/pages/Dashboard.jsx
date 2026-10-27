import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [coachMessage, setCoachMessage] = useState("Loading your coach's advice...");

  useEffect(() => {
    const currentUserId = localStorage.getItem('user_id');
    
    if (!currentUserId || currentUserId === 'guest') {
      navigate('/onboarding');
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/dashboard/${currentUserId}`)
      .then(res => {
        if (!res.ok) throw new Error("User not found or backend offline");
        return res.json();
      })
      .then(data => {
        setUserData(data.profile);
        setCoachMessage(data.coach_message);
      })
      .catch(err => {
        console.error(err);
        localStorage.removeItem('user_id');
        navigate('/onboarding');
      });
  }, [navigate]);

  const handleLogout = () => {
    // Clear user session data from localStorage
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('grade');
    localStorage.removeItem('active_quiz');
    localStorage.removeItem('active_syllabus_id');
    localStorage.removeItem('active_difficulty');
    
    // Redirect to onboarding/login
    navigate('/onboarding');
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="p-10 text-xl text-slate-300 animate-pulse">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pt-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {userData.username}</h1>
          <p className="text-slate-400">Class {userData.grade} | Rank: #{userData.current_rank || 'Unranked'}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => navigate('/leaderboard')}
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold px-4 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
          >
            Leaderboard 🏆
          </button>
          <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
            <span className="text-yellow-400">🪙</span>
            <span className="font-bold text-white">{userData.coins}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
            <span className="text-blue-400">🏆</span>
            <span className="font-bold text-white">{userData.total_points} pts</span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold px-3 py-2 rounded-lg border border-red-500/30 transition-all"
            title="Log out"
          >
            Logout 🚪
          </button>
        </div>
      </div>

      {/* Agent 4 Coach Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-6 mb-8 border border-indigo-500/30 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🤖</span>
          <h2 className="text-lg font-bold text-indigo-200">Agent 4 Coach says:</h2>
        </div>
        <p className="text-white text-lg font-medium italic">"{coachMessage}"</p>
      </div>

      {/* True Mastery Progress */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-8 border border-slate-700">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-white">True Syllabus Mastery</h2>
          <span className="text-emerald-400 font-bold">{userData.mastery_percentage}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-4 mb-2 overflow-hidden border border-slate-700">
          <div 
            className="bg-emerald-500 h-4 rounded-full transition-all duration-1000" 
            style={{ width: `${userData.mastery_percentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-slate-400">Calculated from Medium & Hard mode curriculum benchmarks.</p>
      </div>

      {/* Action Area */}
      <button 
        onClick={() => navigate('/exam')}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-4 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.5)]"
      >
        Start New Mission (Quiz) 🚀
      </button>
    </div>
  );
}