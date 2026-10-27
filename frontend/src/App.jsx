import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import ActiveExam from './pages/ActiveExam';
import ExamResult from './pages/ExamResult';
import Onboarding from './pages/Onboarding';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import 'katex/dist/katex.min.css';

function RequireAuth({ children }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (!userId) {
      navigate('/onboarding');
    }
  }, [userId, navigate]);

  return userId ? children : null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global CSS Reset injected directly to kill Vite's default centered #root and ugly button defaults */}
      <style>{`
        * {
          box-sizing: border-box;
        }
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-height: 100vh !important;
          max-width: none !important;
          text-align: left !important;
          display: block !important;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background-color: #050816;
          color: #f8fafc;
          overflow-x: hidden;
        }
        /* Aesthetic High-Res Dark Nebula/Cyber Background fixed to full viewport */
        .app-bg-wrapper {
          min-height: 100vh;
          width: 100%;
          background-image: 
            radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.18) 0%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(139, 92, 246, 0.18) 0%, transparent 40%),
            linear-gradient(180deg, rgba(5, 8, 22, 0.82) 0%, rgba(10, 15, 36, 0.92) 100%),
            url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2000&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          background-repeat: no-repeat;
        }
        .nav-btn:hover {
          background-color: rgba(59, 130, 246, 0.15) !important;
          border-color: rgba(96, 165, 250, 0.5) !important;
          transform: translateY(-1px);
        }
        .coin-badge:hover {
          border-color: #facc15 !important;
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.45) !important;
          transform: scale(1.06);
        }
        .coin-badge:hover .coin-emoji {
          transform: scale(1.3) rotate(12deg);
          filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.9));
        }
        .point-badge:hover {
          border-color: #38bdf8 !important;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.45) !important;
          transform: scale(1.06);
        }
        .point-badge:hover .point-emoji {
          transform: scale(1.3) rotate(-12deg);
          filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.9));
        }
      `}</style>

      <div className="app-bg-wrapper">
        <Navbar />
        <main style={{ width: '100%', paddingBottom: '60px' }}>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/exam" element={<RequireAuth><ExamSetup /></RequireAuth>} />
            <Route path="/exam/active" element={<RequireAuth><ActiveExam /></RequireAuth>} />
            <Route path="/exam/result" element={<RequireAuth><ExamResult /></RequireAuth>} />
            <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}