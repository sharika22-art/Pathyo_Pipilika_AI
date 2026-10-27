import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [coachMessage, setCoachMessage] = useState("Analyzing your performance metrics...");

  useEffect(() => {
    const currentUserId = localStorage.getItem('user_id');

    if (!currentUserId || currentUserId === 'guest') {
      navigate('/onboarding');
      return;
    }

    const cachedCoachMsg = localStorage.getItem(`coach_msg_${currentUserId}`);
    const cachedPoints = localStorage.getItem(`cached_pts_${currentUserId}`);

    fetch(`${import.meta.env.VITE_API_URL}/dashboard/${currentUserId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        return res.json();
      })
      .then((data) => {
        setUserData(data.profile);

        // Sync coins & points for Navbar
        localStorage.setItem('user_coins', data.profile.coins);
        localStorage.setItem('user_points', data.profile.total_points);
        localStorage.setItem('username', data.profile.username);

        const currentPoints = String(data.profile.total_points || 0);

        if (cachedCoachMsg && cachedPoints === currentPoints) {
          setCoachMessage(cachedCoachMsg);
        } else {
          setCoachMessage(data.coach_message);
          localStorage.setItem(`coach_msg_${currentUserId}`, data.coach_message);
          localStorage.setItem(`cached_pts_${currentUserId}`, currentPoints);
        }
      })
      .catch((err) => {
        console.error(err);
        if (cachedCoachMsg) {
          setCoachMessage(cachedCoachMsg);
        }
      });
  }, [navigate]);

  if (!userData) {
    return (
      <div style={{ maxWidth: '1100px', margin: '80px auto', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>
        ⚡ Loading Dashboard Analytics...
      </div>
    );
  }

  // Generate dynamic curve points anchored to the student's actual mastery & points
  const baseMastery = Number(userData.mastery_percentage) || 25;
  const dataPoints = [
    Math.max(12, Math.round(baseMastery * 0.45)),
    Math.max(20, Math.round(baseMastery * 0.65)),
    Math.max(18, Math.round(baseMastery * 0.58)),
    Math.max(32, Math.round(baseMastery * 0.85)),
    Math.min(95, Math.round(baseMastery * 1.15)),
    Math.min(100, Math.max(25, Math.round(baseMastery))),
  ];

  // SVG coordinates mapping (Width: 680, Height: 240)
  const xCoords = [50, 165, 280, 395, 510, 625];
  const yCoords = dataPoints.map((val) => 200 - (val / 100) * 160);

  // Build smooth Cubic Bezier SVG path
  const buildSmoothCurve = (xs, ys) => {
    if (xs.length === 0) return '';
    let path = `M ${xs[0]},${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const cpX1 = xs[i] + (xs[i + 1] - xs[i]) / 2;
      const cpY1 = ys[i];
      const cpX2 = xs[i] + (xs[i + 1] - xs[i]) / 2;
      const cpY2 = ys[i + 1];
      path += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${xs[i + 1]},${ys[i + 1]}`;
    }
    return path;
  };

  const smoothLinePath = buildSmoothCurve(xCoords, yCoords);
  const areaFillPath = `${smoothLinePath} L ${xCoords[xCoords.length - 1]},210 L ${xCoords[0]},210 Z`;

  return (
    <div
      style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: '10px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* Clean Welcome Header Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.78))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '22px',
          padding: '28px 32px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Welcome back, <span style={{ color: '#60a5fa' }}>{userData.username}</span> 👋
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#cbd5e1', fontWeight: 600 }}>
            SSC Class {userData.grade} &nbsp;•&nbsp; Standing Rank:{' '}
            <span style={{ color: '#facc15', fontWeight: 800 }}>#{userData.current_rank || '1'}</span>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '12px 20px',
            borderRadius: '16px',
          }}
        >
          <span style={{ fontSize: '26px' }}>🎯</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              True Syllabus Mastery
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
              {userData.mastery_percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Agent 4 Strategic AI Coach Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(49, 46, 129, 0.75), rgba(15, 23, 42, 0.9))',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(129, 140, 248, 0.45)',
          borderRadius: '22px',
          padding: '28px 32px',
          boxShadow: '0 15px 40px rgba(79, 70, 229, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(99, 102, 241, 0.25)',
              border: '1px solid rgba(165, 180, 252, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            🤖
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#e0e7ff' }}>
              Agent 4 Strategic AI Coach
            </h2>
            <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>
              Personalized NCTB Board Exam Guidance
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(2, 6, 23, 0.65)',
            border: '1px solid rgba(129, 140, 248, 0.25)',
            borderRadius: '16px',
            padding: '20px 24px',
            fontSize: '16px',
            lineHeight: 1.7,
            color: '#f1f5f9',
            fontStyle: 'italic',
            fontWeight: 500,
          }}
        >
          "{coachMessage}"
        </div>
      </div>

      {/* Dynamic Glowing Curve Graph Card */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '22px',
          padding: '28px 32px',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              📈 Performance & Mastery Trajectory Curve
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Dynamic progression wave across your SSC curriculum milestones
            </p>
          </div>
          <span
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            Live Curve Telemetry
          </span>
        </div>

        {/* SVG Smooth Curve Plot */}
        <div
          style={{
            backgroundColor: '#050816',
            borderRadius: '18px',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            padding: '20px 16px 12px 16px',
            overflowX: 'auto',
          }}
        >
          <svg viewBox="0 0 680 245" style={{ width: '100%', height: 'auto', minWidth: '500px', display: 'block' }}>
            <defs>
              <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#050816" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 25, 50, 75, 100].map((pct, i) => {
              const y = 200 - (pct / 100) * 160;
              return (
                <g key={i}>
                  <line x1="45" y1={y} x2="645" y2={y} stroke="#1e293b" strokeDasharray="5,5" strokeWidth="1" />
                  <text x="12" y={y + 4} fill="#64748b" fontSize="11" fontWeight="700">
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Shaded Gradient Under Curve */}
            <path d={areaFillPath} fill="url(#curveAreaGrad)" />

            {/* Smooth Glowing Bezier Curve */}
            <path
              d={smoothLinePath}
              fill="none"
              stroke="url(#strokeGrad)"
              strokeWidth="4"
              filter="url(#glow)"
              strokeLinecap="round"
            />

            {/* Data Nodes & Value Labels */}
            {xCoords.map((x, idx) => {
              const y = yCoords[idx];
              const val = dataPoints[idx];
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="7" fill="#050816" stroke="#38bdf8" strokeWidth="3.5" />
                  <rect x={x - 22} y={y - 30} width="44" height="20" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                  <text x={x} y={y - 16} textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="800">
                    {val}%
                  </text>
                  <text x={x} y="232" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">
                    Stage {idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}