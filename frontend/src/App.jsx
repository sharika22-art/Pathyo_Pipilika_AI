import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import ActiveExam from './pages/ActiveExam';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exam" element={<ExamSetup />} />
          <Route path="/exam/active" element={<ActiveExam />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App;