import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import ActiveExam from './pages/ActiveExam';
import ExamResult from './pages/ExamResult';
import Onboarding from './pages/Onboarding';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/exam" element={<ExamSetup />} />
          <Route path="/exam/active" element={<ActiveExam />} />
          <Route path="/exam/result" element={<ExamResult />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App;