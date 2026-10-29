import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import katex from 'katex';
import 'katex/dist/katex.min.css';

// Direct KaTeX rendering helper (immune to Vite export bugs)
function renderLaTeX(text) {
  if (!text || typeof text !== 'string') return text;

  let processed = text.trim();

  // If the string has no $ signs at all, check if it is raw LaTeX (like \frac{...})
  if (!processed.includes('$')) {
    const hasLatexCommand =
      processed.includes('\\frac') ||
      processed.includes('\\sqrt') ||
      processed.includes('\\theta') ||
      processed.includes('\\sin') ||
      processed.includes('\\cos') ||
      processed.includes('\\tan') ||
      processed.includes('\\cot') ||
      processed.includes('\\cosec') ||
      processed.includes('\\sec') ||
      processed.includes('\\alpha') ||
      processed.includes('\\beta') ||
      processed.includes('\\pi') ||
      processed.includes('\\pm') ||
      processed.includes('\\times') ||
      processed.includes('\\div') ||
      processed.includes('^') ||
      processed.includes('_');

    if (hasLatexCommand) {
      processed = '$' + processed + '$';
    }
  }

  const parts = processed.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  return parts.map((part, i) => {
    try {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const html = katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const html = katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      }
    } catch (e) {
      return part;
    }
    return part;
  });
}

export default function ExamResult() {
  const navigate = useNavigate();
  const location = useLocation();

  const resultData = location.state || {
    correctCount: 0,
    total: 10,
    questions: [],
    selectedAnswers: {},
    difficulty: 'Medium',
    tabSwitches: 0,
  };

  const { correctCount, total, questions, selectedAnswers, difficulty = 'Medium', tabSwitches = 0 } = resultData;

  let penaltyMarks = 0;
  if (difficulty === 'Easy') {
    penaltyMarks = tabSwitches * 2;
  } else if (difficulty === 'Medium') {
    penaltyMarks = tabSwitches * 5;
  }

  const finalMarks = Math.max(0, correctCount - penaltyMarks);
  const pointsEarned = finalMarks * 10;
  const coinsEarned = finalMarks * 5;

  // Animation Sequence State: 'points_popup' -> 'points_fly' -> 'coins_popup' -> 'coins_fly' -> 'done'
  const [animStage, setAnimStage] = useState('points_popup');

  useEffect(() => {
    const currentUserId = localStorage.getItem('user_id');
    if (currentUserId) {
      localStorage.removeItem(`coach_msg_${currentUserId}`);
      localStorage.removeItem(`cached_pts_${currentUserId}`);
      localStorage.removeItem(`exam_count_${currentUserId}`);
    }

    // Read starting balances before adding newly earned rewards
    const currentPts = parseInt(localStorage.getItem('user_points') || '1290', 10);
    const currentCoins = parseInt(localStorage.getItem('user_coins') || '645', 10);

    // Sequence Timers
    const t1 = setTimeout(() => {
      setAnimStage('points_fly');
    }, 1500);

    const t2 = setTimeout(() => {
      // Update Points in Topbar right when flying gems hit the navbar
      localStorage.setItem('user_points', String(currentPts + pointsEarned));
      window.dispatchEvent(new CustomEvent('rewardsUpdated', { detail: { type: 'points' } }));
      setAnimStage('coins_popup');
    }, 2400);

    const t3 = setTimeout(() => {
      setAnimStage('coins_fly');
    }, 3900);

    const t4 = setTimeout(() => {
      // Update Coins in Topbar right when flying coins hit the navbar
      localStorage.setItem('user_coins', String(currentCoins + coinsEarned));
      window.dispatchEvent(new CustomEvent('rewardsUpdated', { detail: { type: 'coins' } }));
      setAnimStage('done');
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [pointsEarned, coinsEarned]);

  // 8 particle offsets for flying bursts
  const particles = [
    { delay: '0s', offsetX: '-40px', offsetY: '10px' },
    { delay: '0.06s', offsetX: '35px', offsetY: '-15px' },
    { delay: '0.12s', offsetX: '-20px', offsetY: '-30px' },
    { delay: '0.18s', offsetX: '45px', offsetY: '25px' },
    { delay: '0.24s', offsetX: '-50px', offsetY: '-10px' },
    { delay: '0.30s', offsetX: '15px', offsetY: '35px' },
    { delay: '0.36s', offsetX: '-10px', offsetY: '15px' },
    { delay: '0.42s', offsetX: '25px', offsetY: '-25px' },
  ];

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '10px 24px 60px 24px', position: 'relative' }}>
      {/* Keyframe Animations for Popups and Flying Particles */}
      <style>{`
        @keyframes popScale {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes floatPulse {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.12); }
        }
        @keyframes flyToTopRightPoints {
          0% {
            transform: translate(0, 0) scale(1.3) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: translate(-60px, -120px) scale(1.5) rotate(-15deg);
            opacity: 1;
          }
          100% {
            transform: translate(38vw, -44vh) scale(0.25) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes flyToTopRightCoins {
          0% {
            transform: translate(0, 0) scale(1.3) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: translate(50px, -120px) scale(1.5) rotate(20deg);
            opacity: 1;
          }
          100% {
            transform: translate(28vw, -44vh) scale(0.25) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* CELEBRATION OVERLAY: Popups & Flying Rewards */}
      {animStage !== 'done' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: animStage.includes('fly') ? 'rgba(2, 6, 23, 0.35)' : 'rgba(2, 6, 23, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease',
            pointerEvents: 'none',
          }}
        >
          {/* STAGE 1: POINTS POPUP */}
          {animStage === 'points_popup' && (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.9))',
                border: '3px solid #38bdf8',
                borderRadius: '28px',
                padding: '44px 64px',
                textAlign: 'center',
                boxShadow: '0 0 60px rgba(56, 189, 248, 0.6), inset 0 0 30px rgba(56, 189, 248, 0.25)',
                animation: 'popScale 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              <div
                style={{
                  fontSize: '76px',
                  marginBottom: '12px',
                  filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.9))',
                  animation: 'floatPulse 1.2s ease-in-out infinite',
                }}
              >
                💎
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#7dd3fc', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Mission Reward Unlocked
              </div>
              <div
                style={{
                  fontSize: '54px',
                  fontWeight: 900,
                  color: '#ffffff',
                  marginTop: '6px',
                  textShadow: '0 0 25px rgba(56, 189, 248, 0.9)',
                }}
              >
                +{pointsEarned} POINTS!
              </div>
            </div>
          )}

          {/* STAGE 2: FLYING POINTS STREAM */}
          {animStage === 'points_fly' && (
            <div style={{ position: 'relative', width: '1px', height: '1px' }}>
              {particles.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.offsetX,
                    top: p.offsetY,
                    fontSize: '42px',
                    filter: 'drop-shadow(0 0 18px rgba(56, 189, 248, 1))',
                    animation: `flyToTopRightPoints 0.85s cubic-bezier(0.4, 0, 0.2, 1) ${p.delay} forwards`,
                  }}
                >
                  💎
                </div>
              ))}
            </div>
          )}

          {/* STAGE 3: COINS POPUP */}
          {animStage === 'coins_popup' && (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(113, 63, 18, 0.9))',
                border: '3px solid #facc15',
                borderRadius: '28px',
                padding: '44px 64px',
                textAlign: 'center',
                boxShadow: '0 0 60px rgba(250, 204, 21, 0.65), inset 0 0 30px rgba(250, 204, 21, 0.25)',
                animation: 'popScale 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              <div
                style={{
                  fontSize: '76px',
                  marginBottom: '12px',
                  filter: 'drop-shadow(0 0 25px rgba(250, 204, 21, 0.95))',
                  animation: 'floatPulse 1.2s ease-in-out infinite',
                }}
              >
                🪙
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#fde047', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Bonus Treasury Bounty
              </div>
              <div
                style={{
                  fontSize: '54px',
                  fontWeight: 900,
                  color: '#ffffff',
                  marginTop: '6px',
                  textShadow: '0 0 25px rgba(250, 204, 21, 0.95)',
                }}
              >
                +{coinsEarned} COINS!
              </div>
            </div>
          )}

          {/* STAGE 4: FLYING COINS STREAM */}
          {animStage === 'coins_fly' && (
            <div style={{ position: 'relative', width: '1px', height: '1px' }}>
              {particles.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.offsetX,
                    top: p.offsetY,
                    fontSize: '42px',
                    filter: 'drop-shadow(0 0 18px rgba(250, 204, 21, 1))',
                    animation: `flyToTopRightCoins 0.85s cubic-bezier(0.4, 0, 0.2, 1) ${p.delay} forwards`,
                  }}
                >
                  🪙
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Score Summary Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.85), rgba(49, 46, 129, 0.9))',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(96, 165, 250, 0.45)',
          borderRadius: '24px',
          padding: '36px',
          textAlign: 'center',
          marginBottom: '40px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(37, 99, 235, 0.25)',
        }}
      >
        <div style={{ display: 'inline-block', backgroundColor: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(147, 197, 253, 0.4)', borderRadius: '999px', padding: '6px 16px', fontSize: '12px', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          {difficulty} Mode Completed
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '36px', fontWeight: 900, color: '#ffffff' }}>
          Mission Accomplished! 🎉
        </h1>
        <p style={{ margin: '0 0 28px 0', fontSize: '15px', color: '#cbd5e1', fontWeight: 500 }}>
          Your telemetry and board mastery scores have been logged to the arena.
        </p>

        {/* 4 Stat Mini-Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '16px',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.65)',
              padding: '18px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Final Score
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>
              {finalMarks} / {total}{' '}
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>(Raw: {correctCount})</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.65)',
              padding: '18px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '6px' }}>
              Tab Penalties
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#f87171' }}>
              -{penaltyMarks} marks
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.65)',
              padding: '18px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', marginBottom: '6px' }}>
              Points Earned
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8' }}>
              💎 +{pointsEarned}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.65)',
              padding: '18px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(250, 204, 21, 0.4)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fde047', textTransform: 'uppercase', marginBottom: '6px' }}>
              Coins Earned
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#facc15' }}>
              🪙 +{coinsEarned}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '16px',
              padding: '14px 32px',
              borderRadius: '14px',
              border: '1px solid rgba(147, 197, 253, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(37, 99, 235, 0.45)',
            }}
          >
            Return to Dashboard 🚀
          </button>

          <button
            type="button"
            onClick={() => setAnimStage('points_popup')}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              color: '#cbd5e1',
              fontWeight: 700,
              fontSize: '14px',
              padding: '14px 22px',
              borderRadius: '14px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              cursor: 'pointer',
            }}
          >
            Replay Celebration ✨
          </button>
        </div>
      </div>

      {/* Detailed Question Breakdown & Review */}
      <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', marginBottom: '20px' }}>
        📋 Question Breakdown & Review
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {questions.map((q, idx) => {
          const studentAnswer = selectedAnswers[idx];
          const correctOption = q.options?.find((opt) => opt.is_correct);
          const isCorrect = studentAnswer === correctOption?.text;

          return (
            <div
              key={idx}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '20px',
                border: isCorrect ? '2px solid rgba(16, 185, 129, 0.45)' : '2px solid rgba(239, 68, 68, 0.45)',
                padding: '26px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              }}
            >
              {/* Card Header: Question Number & Correct/Incorrect Badge */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #334155',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    letterSpacing: '0.06em',
                  }}
                >
                  Question {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isCorrect ? '#6ee7b7' : '#fca5a5',
                    border: isCorrect ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(239, 68, 68, 0.45)',
                  }}
                >
                  {isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                </span>
              </div>

              {/* Question Text */}
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '20px', lineHeight: '1.6' }}>
                {renderLaTeX(q.question)}
              </h3>

              {/* Answer Details */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  backgroundColor: '#050816',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid #334155',
                }}
              >
                <div style={{ color: '#cbd5e1' }}>
                  Your Answer:{' '}
                  <strong style={{ color: isCorrect ? '#34d399' : '#f87171' }}>
                    {renderLaTeX(studentAnswer) || 'Not Answered'}
                  </strong>
                </div>
                {!isCorrect && (
                  <div style={{ color: '#cbd5e1' }}>
                    Correct Answer: <strong style={{ color: '#34d399' }}>{renderLaTeX(correctOption?.text)}</strong>
                  </div>
                )}
              </div>

              {/* Step-by-Step Explanation */}
              {q.explanation && (
                <div
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.55)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    fontSize: '14px',
                    color: '#e2e8f0',
                    lineHeight: '1.65',
                  }}
                >
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '6px' }}>💡 Explanation:</strong>
                  {renderLaTeX(q.explanation)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}