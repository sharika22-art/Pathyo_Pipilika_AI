import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExamSetup() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chapters, setChapters] = useState([]);
  
  const [formData, setFormData] = useState({
    subject: 'Physics',
    syllabus_id: '',
    difficulty: 'Medium',
    version: localStorage.getItem('version') || 'English' // 'English' (EV) or 'Bengali' (BV)
  });

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
    
    // Save version preference
    localStorage.setItem('version', formData.version);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syllabus_id: formData.syllabus_id,
          difficulty: formData.difficulty,
          version: formData.version // Send version to backend
        }),
      });

      if (!response.ok) throw new Error("Failed to generate AI quiz package");

      const data = await response.json();
      
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
        <p className="text-slate-400 mb-8">Select your subject, curriculum version, and chapter to generate a precise AI exam.</p>
        
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Version Toggle (EV / BV) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Curriculum Version (EV / BV)</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'English', label: 'English Version (EV)' },
                { id: 'Bengali', label: 'Bengali Version (BV - বাংলা ভার্সন)' }
              ].map(({ id, label }) => (
                <label 
                  key={id}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.version === id 
                      ? 'border-blue-500 text-white bg-blue-500/20 shadow' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="version" 
                    value={id}
                    checked={formData.version === id}
                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                    className="sr-only" 
                  />
                  <span className="font-bold text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

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

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { level: 'Easy', color: 'border-green-500 text-green-400 bg-green-500/10' },
                { level: 'Medium', color: 'border-yellow-500 text-yellow-400 bg-yellow-500/10' },
                { level: 'Hard', color: 'border-red-500 text-red-400 bg-red-500/10' }
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
          </div>

          <button 
            type="submit"
            disabled={isGenerating}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            {isGenerating ? (
              <span>Agents 1 & 2 Crafting Quiz...</span>
            ) : (
              'Initialize Exam Engine ⚡'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}