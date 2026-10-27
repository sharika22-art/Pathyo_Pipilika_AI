import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [coins, setCoins] = useState(localStorage.getItem('user_coins') || '645');
  const [points, setPoints] = useState(localStorage.getItem('user_points') || '1290');
  const [pulseCoins, setPulseCoins] = useState(false);
  const [pulsePoints, setPulsePoints] = useState(false);

  useEffect(() => {
    const syncRewards = (e) => {
      setCoins(localStorage.getItem('user_coins') || '645');
      setPoints(localStorage.getItem('user_points') || '1290');

      if (e?.detail?.type === 'points') {
        setPulsePoints(true);
        setTimeout(() => setPulsePoints(false), 900);
      } else if (e?.detail?.type === 'coins') {
        setPulseCoins(true);
        setTimeout(() => setPulseCoins(false), 900);
      } else {
        setPulsePoints(true);
        setPulseCoins(true);
        setTimeout(() => {
          setPulsePoints(false);
          setPulseCoins(false);
        }, 900);
      }
    };

    window.addEventListener('rewardsUpdated', syncRewards);
    window.addEventListener('storage', syncRewards);
    return () => {
      window.removeEventListener('rewardsUpdated', syncRewards);
      window.removeEventListener('storage', syncRewards);
    };
  }, []);

  // Re-sync whenever route changes
  useEffect(() => {
    setCoins(localStorage.getItem('user_coins') || '645');
    setPoints(localStorage.getItem('user_points') || '1290');
  }, [location.pathname]);

  // Hide Navbar ONLY during active exam or onboarding
  if (location.pathname === '/exam/active' || location.pathname === '/onboarding') {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Quiz', path: '/exam', icon: '⚡' },
    { name: 'History', path: '/history', icon: '📈' },
    { name: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
    { name: 'Profile', path: '/profile', icon: '👤' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: '16px',
        zIndex: 1000,
        maxWidth: '1240px',
        margin: '0 auto 28px auto',
        padding: '0 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(59, 130, 246, 0.45)',
          borderRadius: '20px',
          padding: '14px 24px',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.15)',
        }}
      >
        {/* Left: Brand Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            🚀
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              Shikho <span style={{ color: '#60a5fa' }}>AI</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>
              SSC Class 9-10 Arena
            </div>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(2, 6, 23, 0.7)',
            padding: '6px',
            borderRadius: '14px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => navigate(item.path)}
                className="nav-btn"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: isActive ? '1px solid #60a5fa' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  boxShadow: isActive ? '0 4px 15px rgba(37, 99, 235, 0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Live Interactive Coins & Points Badges */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Coins Badge */}
          <div
            className="coin-badge"
            onClick={() => navigate('/profile')}
            title="Your Coins"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: pulseCoins ? 'rgba(250, 204, 21, 0.28)' : 'rgba(2, 6, 23, 0.85)',
              border: pulseCoins ? '2px solid #facc15' : '2px solid rgba(250, 204, 21, 0.35)',
              borderRadius: '14px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: pulseCoins ? 'scale(1.18)' : 'scale(1)',
              boxShadow: pulseCoins ? '0 0 30px rgba(250, 204, 21, 0.8)' : 'none',
            }}
          >
            <span className="coin-emoji" style={{ fontSize: '22px', display: 'inline-block', transition: 'all 0.25s ease' }}>
              🪙
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#fde047', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Coins
              </span>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                {coins}
              </span>
            </div>
          </div>

          {/* Points Badge */}
          <div
            className="point-badge"
            onClick={() => navigate('/leaderboard')}
            title="Your Total Points"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: pulsePoints ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 6, 23, 0.85)',
              border: pulsePoints ? '2px solid #38bdf8' : '2px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: pulsePoints ? 'scale(1.18)' : 'scale(1)',
              boxShadow: pulsePoints ? '0 0 30px rgba(56, 189, 248, 0.8)' : 'none',
            }}
          >
            <span className="point-emoji" style={{ fontSize: '22px', display: 'inline-block', transition: 'all 0.25s ease' }}>
              💎
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Points
              </span>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                {points}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}