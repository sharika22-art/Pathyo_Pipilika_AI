import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import ActiveExam from './pages/ActiveExam';
import ExamResult from './pages/ExamResult';
import Onboarding from './pages/Onboarding';
import Leaderboard from './pages/Leaderboard';
import 'katex/dist/katex.min.css';

// Optional helper component to protect routes if user_id is missing
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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Protected Routes: Redirects to /onboarding if not logged in */}
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/exam" element={<RequireAuth><ExamSetup /></RequireAuth>} />
          <Route path="/exam/active" element={<RequireAuth><ActiveExam /></RequireAuth>} />
          <Route path="/exam/result" element={<RequireAuth><ExamResult /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;