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

    // Determine endpoint and payload based on mode
    const endpoint = isLogin ? `${import.meta.env.VITE_API_URL}/login` : `${import.meta.env.VITE_API_URL}/register`;
    const payload = isLogin ? { username } : { username, grade };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract backend error message (e.g., "Username not available" or "User not found")
        throw new Error(data.detail || (isLogin ? "Login failed" : "Registration failed"));
      }
      
      // Save the real UUID returned from Supabase via FastAPI into localStorage
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('grade', data.user.grade);

      navigate('/');
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "Failed to connect. Ensure your FastAPI backend is running!");
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Shikho AI 🇧🇩</h1>
          <p className="text-slate-400">
            {isLogin ? 'Log in to continue your streak' : 'Gamified competitive learning for Bangladeshi students'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Full Name or Username</label>
            <input 
              type="text"
              required
              placeholder="e.g. Tanvir Ahmed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Grade selection is only required during registration */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Your Class / Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              >
                <option value="9-10">Class 9-10 (SSC Curriculum)</option>
                <option value="HSC">Class 11-12 (HSC Curriculum)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Login to Account 🔓' : 'Create Account & Start Competing 🚀')}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-6 text-center space-y-3">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrorMessage(''); }}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
          </button>

          <div>
            <button
              onClick={handleGuestMode}
              className="text-sm text-slate-400 hover:text-white underline transition-colors"
            >
              Or continue as Guest (Progress won't be saved)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}