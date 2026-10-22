import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExamSetup() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chapters, setChapters] = useState([]);
  
  const [formData, setFormData] = useState({
    subject: 'Physics',
    syllabus_id: '',
    difficulty: 'Medium'
  });

  // Fetch chapters when the subject changes
  useEffect(() => {
    const userGrade = localStorage.getItem('grade') || '9-10';
    
    fetch(`${import.meta.env.VITE_API_URL}/syllabus?grade=${userGrade}&subject=${formData.subject}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.chapters) {
          setChapters(data.chapters);
          if (data.chapters.length > 0) {
            setFormData(prev => ({ ...prev, syllabus_id: data.chapters[0].id }));
          }
        }
      })
      .catch(err => {
        console.error("Failed to load chapters, using mock chapters:", err);
        setChapters([
          { id: 'a1111111-1111-1111-1111-111111111111', chapter_number: 1, chapter_name: 'Physical Quantities and Measurement' },
          { id: 'a2222222-2222-2222-2222-222222222222', chapter_number: 2, chapter_name: 'Motion' },
          { id: 'a3333333-3333-3333-3333-333333333333', chapter_number: 3, chapter_name: 'Force' }
        ]);
        setFormData(prev => ({ ...prev, syllabus_id: 'a1111111-1111-1111-1111-111111111111' }));
      });
  }, [formData.subject]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus_id: formData.syllabus_id,
          difficulty: formData.difficulty
        }),
      });

      if (!response.ok) throw new Error("Failed to generate AI quiz package");

      const data = await response.json();
      
      // Save to localStorage as a safety backup against page reloads/refresh errors
      localStorage.setItem('active_quiz', JSON.stringify(data.quiz));
      localStorage.setItem('active_syllabus_id', formData.syllabus_id);
      localStorage.setItem('active_difficulty', formData.difficulty);
      
      navigate('/exam/active', { 
        state: { 
          syllabus_id: formData.syllabus_id, 
          difficulty: formData.difficulty,
          quizData: data.quiz,
          chapterName: data.chapter
        } 
      }); 

    } catch (error) {
      console.error("Error triggering AI generation:", error);
      alert("Failed to generate quiz. Make sure your FastAPI backend and RAG database are ready!");
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pt-20">
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Configure Your Mission</h1>
        <p className="text-slate-400 mb-8">Select your subject and target chapter to generate a precise AI exam.</p>
        
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Subject</label>
            <select 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Higher Mathematics">Higher Mathematics</option>
            </select>
          </div>

          {/* Chapter Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Chapter</label>
            <select 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              value={formData.syllabus_id}
              onChange={(e) => setFormData({...formData, syllabus_id: e.target.value})}
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Chapter {ch.chapter_number}: {ch.chapter_name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Radio Selection Cards */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { level: 'Easy', desc: 'Standard concept verification', color: 'border-green-500 text-green-400 bg-green-500/10' },
                { level: 'Medium', desc: 'Board exam standard', color: 'border-yellow-500 text-yellow-400 bg-yellow-500/10' },
                { level: 'Hard', desc: 'Mastery-level rigorous questions', color: 'border-red-500 text-red-400 bg-red-500/10' }
              ].map(({ level, color }) => (
                <label 
                  key={level}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.difficulty === level 
                      ? `${color} shadow-lg ring-2 ring-offset-2 ring-offset-slate-800 ring-current` 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="difficulty" 
                    value={level}
                    checked={formData.difficulty === level}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="sr-only" 
                  />
                  <span className="font-bold text-base">{level}</span>
                </label>
              ))}
            </div>
            {formData.difficulty === 'Hard' && (
              <p className="text-xs text-red-400 mt-2">🔥 Warning: Hard mode counts towards your True Syllabus Mastery.</p>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isGenerating}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Agents 1 & 2 Crafting & Auditing Quiz...</span>
              </>
            ) : (
              'Initialize Exam Engine ⚡'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}