import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [grade, setGrade] = useState('9-10');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);

    try {
      // Send registration request to a backend endpoint (we will create this in FastAPI)
      // Or directly talk to Supabase if preferred. Let's hit a backend route: /register
      const response = await `${import.meta.env.VITE_API_URL}/register`;
      // For now, let's simulate the backend response creating the user and returning a UUID:
      const dummyUserId = crypto.randomUUID(); 
      
      // Store the dynamic user ID and info in localStorage
      localStorage.setItem('user_id', dummyUserId);
      localStorage.setItem('username', username);
      localStorage.setItem('grade', grade);

      navigate('/');
    } catch (err) {
      console.error("Registration error:", err);
      alert("Failed to create profile. Ensure backend is running.");
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
          <p className="text-slate-400">Gamified competitive learning for Bangladeshi students</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
          >
            {isLoading ? 'Creating Profile...' : 'Create Account & Start Competing 🚀'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleGuestMode}
            className="text-sm text-slate-400 hover:text-white underline transition-colors"
          >
            Or continue as Guest (Progress won't be saved)
          </button>
        </div>
      </div>
    </div>
  );
}