import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exam" element={<ExamSetup />} />
          <Route path="/exam/active" element={<div className="p-10 text-3xl font-bold text-red-400">Active Exam Engine (Day 4)</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App;