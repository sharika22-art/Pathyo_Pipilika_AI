import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [coachMessage, setCoachMessage] = useState("Analyzing your performance metrics...");
  const [graphUrl, setGraphUrl] = useState(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem('user_id');

    if (!currentUserId || currentUserId === 'guest') {
      navigate('/onboarding');
      return;
    }

    const cachedCoachMsg = localStorage.getItem(`coach_msg_${currentUserId}`);
    const cachedPoints = localStorage.getItem(`cached_pts_${currentUserId}`);

    // Fetch dashboard user profile & strategic AI coach message
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

    // Fetch in-memory Base64 progress curve graph from backend (zero disk usage)
    fetch(`${import.meta.env.VITE_API_URL}/user-progress-graph/${currentUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.graph_url) {
          // If it's a base64 data URI, set directly. Otherwise fallback to prepending server URL if relative path.
          const finalUrl = data.graph_url.startsWith('data:') 
            ? data.graph_url 
            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://pathyo-pipilika-ai.onrender.com'}/${data.graph_url}`;
          
          setGraphUrl(finalUrl);
        }
      })
      .catch((err) => console.error("Error loading progress graph:", err));
  }, [navigate]);

  if (!userData) {
    return (
      <div style={{ maxWidth: '1100px', margin: '80px auto', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>
        ⚡ Loading Dashboard Analytics...
      </div>
    );
  }

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

      {/* Actual Matplotlib Server-Rendered Progress Curve Graph Card */}
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
              📈 Actual Performance Progression Curve
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              In-memory cached Matplotlib graph tracking your mission accuracy over time
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
            Live Telemetry Feed
          </span>
        </div>

        {/* Graph Display Container */}
        <div
          style={{
            backgroundColor: '#050816',
            borderRadius: '18px',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '260px',
          }}
        >
          {graphUrl ? (
            <img
              src={graphUrl}
              alt="Student Progress Progression Curve"
              style={{
                borderRadius: '12px',
                maxWidth: '100%',
                height: 'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, alignSelf: 'center' }}>
              Complete your first exam mission to generate your performance curve! 🚀
            </div>
          )}
        </div>
      </div>
    </div>
  );
}