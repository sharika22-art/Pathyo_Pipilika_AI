import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false); // Toggle between Login and Register modes
  const [username, setUsername] = useState('');
  const [grade, setGrade] = useState('9-10');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    const endpoint = isLogin ? `${import.meta.env.VITE_API_URL}/login` : `${import.meta.env.VITE_API_URL}/register`;
    const payload = isLogin ? { username } : { username, grade };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || (isLogin ? 'Login failed' : 'Registration failed'));
      }

      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('grade', data.user.grade);

      navigate('/');
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || 'Failed to connect. Ensure your FastAPI backend is running!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    localStorage.setItem('user_id', 'guest');
    localStorage.setItem('username', 'Guest Student');
    localStorage.setItem('grade', '9-10');
    navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            🚀
          </div>
          <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
            পাঠ্য<span style={{ color: '#60a5fa' }}>পিপীলিকা</span> 🇧🇩
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>
            {isLogin ? 'Log in to continue your streak and board preparation' : 'Gamified competitive learning for Bangladeshi students'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              marginBottom: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              padding: '14px 18px',
              borderRadius: '14px',
              fontSize: '13px',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
              👤 Your Full Name or Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tanvir Ahmed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              }}
            />
          </div>

          {!isLogin && (
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
                🎓 Select Your Class / Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
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
                <option value="9-10" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  Class 9-10 (SSC Curriculum)
                </option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '16px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(147, 197, 253, 0.4)',
              background: isLoading
                ? 'linear-gradient(135deg, #1e3a8a, #312e81)'
                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 900,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.45)',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading
              ? '⏳ Authenticating...'
              : isLogin
              ? 'Login to Account 🔓'
              : 'Create Account & Start Competing 🚀'}
          </button>
        </form>

        {/* Mode Switcher & Guest Link */}
        <div style={{ marginTop: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isLogin ? "Don't have an account? Register here ➔" : "Already have an account? Login here ➔"}
          </button>

          <div>
            <button
              type="button"
              onClick={handleGuestMode}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Or continue as Guest (Progress won't be saved)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}