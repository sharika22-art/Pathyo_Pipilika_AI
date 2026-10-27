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
    version: localStorage.getItem('version') || 'English', // 'English' (EV) or 'Bengali' (BV)
  });

  useEffect(() => {
    const userGrade = localStorage.getItem('grade') || '9-10';

    fetch(`${import.meta.env.VITE_API_URL}/syllabus?grade=${userGrade}&subject=${formData.subject}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.chapters) {
          setChapters(data.chapters);
          if (data.chapters.length > 0) {
            setFormData((prev) => ({ ...prev, syllabus_id: data.chapters[0].id }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load chapters, using mock chapters:', err);
        setChapters([
          { id: 'a1111111-1111-1111-1111-111111111111', chapter_number: 1, chapter_name: 'Physical Quantities and Measurement' },
          { id: 'a2222222-2222-2222-2222-222222222222', chapter_number: 2, chapter_name: 'Motion' },
          { id: 'a3333333-3333-3333-3333-333333333333', chapter_number: 3, chapter_name: 'Force' },
        ]);
        setFormData((prev) => ({ ...prev, syllabus_id: 'a1111111-1111-1111-1111-111111111111' }));
      });
  }, [formData.subject]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

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
          version: formData.version,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate AI quiz package');

      const data = await response.json();

      localStorage.setItem('active_quiz', JSON.stringify(data.quiz));
      localStorage.setItem('active_syllabus_id', formData.syllabus_id);
      localStorage.setItem('active_difficulty', formData.difficulty);

      navigate('/exam/active', {
        state: {
          syllabus_id: formData.syllabus_id,
          difficulty: formData.difficulty,
          quizData: data.quiz,
          chapterName: data.chapter,
        },
      });
    } catch (error) {
      console.error('Error triggering AI generation:', error);
      alert('Failed to generate quiz. Make sure your FastAPI backend and RAG database are ready!');
      setIsGenerating(false);
    }
  };

  const subjects = [
    { value: 'Physics', icon: '⚛️', label: 'Physics (পদার্থবিজ্ঞান)' },
    { value: 'Chemistry', icon: '🧪', label: 'Chemistry (রসায়ন)' },
    { value: 'Mathematics', icon: '📐', label: 'Mathematics (গণিত)' },
    { value: 'Higher Mathematics', icon: '♾️', label: 'Higher Mathematics (উচ্চতর গণিত)' },
  ];

  const difficulties = [
    {
      level: 'Easy',
      icon: '🌱',
      desc: 'Foundational Recall',
      border: '#10b981',
      bg: 'rgba(16, 185, 129, 0.18)',
      glow: '0 0 20px rgba(16, 185, 129, 0.35)',
      textColor: '#6ee7b7',
    },
    {
      level: 'Medium',
      icon: '🔥',
      desc: 'Standard Board Exam',
      border: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.18)',
      glow: '0 0 20px rgba(245, 158, 11, 0.35)',
      textColor: '#fcd34d',
    },
    {
      level: 'Hard',
      icon: '💀',
      desc: 'Strict Anti-Cheat',
      border: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.18)',
      glow: '0 0 20px rgba(239, 68, 68, 0.35)',
      textColor: '#fca5a5',
    },
  ];

  return (
    <div style={{ maxWidth: '760px', margin: '10px auto', padding: '0 24px' }}>
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.92))',
          backdropFilter: 'blur(18px)',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '24px',
          padding: '36px 40px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 25px rgba(59, 130, 246, 0.12)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '30px', borderBottom: '1px solid rgba(148, 163, 184, 0.18)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '26px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                borderRadius: '12px',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ⚡
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Configure Your Mission
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
                Select your curriculum version, subject, and chapter to generate a 20-question AI exam.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {/* 1. Curriculum Version (EV / BV) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 800,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '12px',
              }}
            >
              🌐 Curriculum Version (EV / BV)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {[
                { id: 'English', icon: '🇬🇧', title: 'English Version (EV)', sub: 'Standard NCTB English Medium' },
                { id: 'Bengali', icon: '🇧🇩', title: 'Bengali Version (BV)', sub: 'বাংলা ভার্সন (NCTB পাঠ্যপুস্তক)' },
              ].map((ver) => {
                const isSelected = formData.version === ver.id;
                return (
                  <div
                    key={ver.id}
                    onClick={() => setFormData({ ...formData, version: ver.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px 18px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid #3b82f6' : '2px solid rgba(51, 65, 85, 0.8)',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.22)' : 'rgba(2, 6, 23, 0.65)',
                      boxShadow: isSelected ? '0 0 20px rgba(37, 99, 235, 0.35)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '26px' }}>{ver.icon}</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                        {ver.title}
                      </div>
                      <div style={{ fontSize: '12px', color: isSelected ? '#93c5fd' : '#64748b', marginTop: '2px', fontWeight: 600 }}>
                        {ver.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Target Subject Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 800,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '10px',
              }}
            >
              📚 Target Subject
            </label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#050816',
                color: '#ffffff',
                border: '2px solid rgba(71, 85, 105, 0.8)',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '15px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {subjects.map((sub) => (
                <option key={sub.value} value={sub.value} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  {sub.icon} {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Target Chapter Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 800,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '10px',
              }}
            >
              📖 Target Chapter
            </label>
            <select
              value={formData.syllabus_id}
              onChange={(e) => setFormData({ ...formData, syllabus_id: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#050816',
                color: '#ffffff',
                border: '2px solid rgba(71, 85, 105, 0.8)',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '15px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  Chapter {ch.chapter_number}: {ch.chapter_name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Difficulty Level Cards */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 800,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '12px',
              }}
            >
              🎯 Challenge Difficulty
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {difficulties.map((d) => {
                const isSelected = formData.difficulty === d.level;
                return (
                  <div
                    key={d.level}
                    onClick={() => setFormData({ ...formData, difficulty: d.level })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '18px 12px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isSelected ? `2px solid ${d.border}` : '2px solid rgba(51, 65, 85, 0.8)',
                      backgroundColor: isSelected ? d.bg : 'rgba(2, 6, 23, 0.65)',
                      boxShadow: isSelected ? d.glow : 'none',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '26px', marginBottom: '6px' }}>{d.icon}</span>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 900,
                        color: isSelected ? d.textColor : '#cbd5e1',
                      }}
                    >
                      {d.level}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
                      {d.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Submit Button */}
          <button
            type="submit"
            disabled={isGenerating}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '18px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(96, 165, 250, 0.5)',
              background: isGenerating
                ? 'linear-gradient(135deg, #1e3a8a, #312e81)'
                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#ffffff',
              fontSize: '17px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.25s ease',
            }}
          >
            {isGenerating ? (
              <span>⏳ Agents 1 & 2 Crafting 20 Board Questions...</span>
            ) : (
              <span>Initialize Exam Engine 🚀</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}