import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExamSetup() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    grade: '10',
    subject: 'Biology',
    difficulty: 'Medium'
  });

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    // In Day 6, we will connect this to Agent 1 and Agent 2 via FastAPI
    // For now, we simulate the AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
      // Navigate to the active exam engine (to be built next)
      navigate('/exam/active'); 
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pt-20">
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Configure Your Mission</h1>
        <p className="text-slate-400 mb-8">Select your parameters to generate a custom AI exam.</p>
        
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Subject</label>
            <select 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
            >
              <option value="Biology">Biology</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-4">
              {['Easy', 'Medium', 'Hard'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({...formData, difficulty: level})}
                  className={`p-3 rounded-lg border font-bold transition-all ${
                    formData.difficulty === level 
                      ? level === 'Hard' ? 'bg-red-500/20 border-red-500 text-red-400'
                      : level === 'Medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {formData.difficulty === 'Hard' && (
              <p className="text-xs text-red-400 mt-2">🔥 Warning: Hard mode calculates towards your True Mastery and impacts rank heavily.</p>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isGenerating}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-lg py-4 rounded-xl transition-all"
          >
            {isGenerating ? 'Agents Generating Quiz...' : 'Initialize Exam Engine ⚡'}
          </button>
        </form>
      </div>
    </div>
  );
}