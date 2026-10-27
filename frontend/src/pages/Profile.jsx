import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Student';
  const grade = localStorage.getItem('grade') || '9-10';
  const userId = localStorage.getItem('user_id') || 'N/A';
  const coins = localStorage.getItem('user_coins') || '645';
  const points = localStorage.getItem('user_points') || '1290';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/onboarding');
  };

  return (
    <div style={{ maxWidth: '720px', margin: '20px auto', padding: '0 24px' }}>
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '2px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Top Profile Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '20px',
            paddingBottom: '24px',
            marginBottom: '24px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 900,
              color: '#ffffff',
              boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
            }}
          >
            🎓
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#ffffff' }}>{username}</h1>
            <p style={{ margin: '4px 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>
              Bangladesh NCTB Secondary Curriculum Scholar
            </p>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              Class {grade}
            </span>
          </div>
        </div>

        {/* Coins & Points Showcase */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.7)',
              border: '1px solid rgba(250, 204, 21, 0.35)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span style={{ fontSize: '36px' }}>🪙</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#fde047', textTransform: 'uppercase' }}>
                Available Coins
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>{coins}</div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span style={{ fontSize: '36px' }}>💎</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                Total Points
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>{points} pts</div>
            </div>
          </div>
        </div>

        {/* Account ID Box */}
        <div
          style={{
            backgroundColor: 'rgba(2, 6, 23, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Student ID</span>
          <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>{userId}</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⬅ Back to Dashboard
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#f87171',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Logout Securely 🚪
          </button>
        </div>
      </div>
    </div>
  );
}