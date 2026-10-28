import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = localStorage.getItem('user_id') || "123e4567-e89b-12d3-a456-426614174000";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/history/${currentUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.history) {
          setHistory(data.history);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching exam history:", err);
        setLoading(false);
      });
  }, [currentUserId]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
            📈 Exam History & Analytics
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Review your past mission performance, subjects, chapters, and anti-cheat telemetry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            color: '#cbd5e1',
            border: '1px solid rgba(71, 85, 105, 0.8)',
            borderRadius: '12px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0', fontSize: '16px', fontWeight: 600 }}>
          Loading mission history... ⚡
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map((exam, index) => {
            const percentage = Math.round((exam.correct_answers / exam.total_questions) * 100);

            const dateStr = exam.completed_at && !isNaN(new Date(exam.completed_at).getTime())
              ? new Date(exam.completed_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent Mission';

            const scoreColor = percentage >= 80 ? '#34d399' : percentage >= 50 ? '#facc15' : '#f87171';

            const subjectName = exam.subject || exam.syllabus?.subject || 'SSC Subject';
            const chapterNum = exam.chapter_number || exam.syllabus?.chapter_number;
            const chapterName = exam.chapter_name || exam.syllabus?.chapter_name || 'Chapter Assessment';

            return (
              <div
                key={exam.id || index}
                style={{
                  background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95))',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: '18px',
                  padding: '22px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div>
                  {/* Top Badges: Subject + Difficulty + Date */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <span
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(167, 139, 250, 0.5)',
                        color: '#c4b5fd',
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 800,
                        letterSpacing: '0.4px',
                      }}
                    >
                      📚 {subjectName}
                    </span>

                    <span
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        color: '#60a5fa',
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {exam.difficulty} Mode
                    </span>

                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{dateStr}</span>
                  </div>

                  {/* Chapter Title */}
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#e2e8f0', marginBottom: '6px' }}>
                    {chapterNum ? `Chapter ${chapterNum}: ${chapterName}` : chapterName}
                  </div>

                  {/* Score Readout */}
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#94a3b8' }}>
                    Score:{' '}
                    <span style={{ color: '#ffffff', fontWeight: 800 }}>
                      {exam.correct_answers} / {exam.total_questions}
                    </span>{' '}
                    ({percentage}%)
                  </div>

                  {exam.tab_switches_detected > 0 && (
                    <div style={{ fontSize: '12px', color: '#f87171', marginTop: '6px', fontWeight: 700 }}>
                      ⚠️ Tab switches recorded: {exam.tab_switches_detected}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: scoreColor,
                      textShadow: `0 0 15px ${scoreColor}44`,
                    }}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95))',
                borderRadius: '24px',
                padding: '60px 24px',
                textAlign: 'center',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
                No exam history found yet!
              </p>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
                Complete your first mission to populate your analytics and performance curve.
              </p>
              <button
                type="button"
                onClick={() => navigate('/exam')}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#ffffff',
                  border: '1px solid rgba(147, 197, 253, 0.4)',
                  borderRadius: '14px',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                }}
              >
                Start an Exam ⚡
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}