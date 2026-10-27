import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = localStorage.getItem('user_id');
  const userGrade = localStorage.getItem('grade') || '9-10';

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/leaderboard/${userGrade}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching leaderboard:", err);
        setLoading(false);
      });
  }, [userGrade]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', paddingTop: '48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff' }}>
          🏆 Class {userGrade} Leaderboard
        </h1>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#1e293b',
            color: '#cbd5e1',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #475569',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px' }}>Loading rankings...</div>
      ) : (
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '2px solid #475569',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid #475569' }}>
                <th style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #475569', width: '90px' }}>Rank</th>
                <th style={{ padding: '16px', borderRight: '1px solid #475569' }}>Student Name</th>
                <th style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #475569', width: '110px' }}>Mastery</th>
                <th style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #475569', width: '110px' }}>Coins</th>
                <th style={{ padding: '16px', textAlign: 'right', width: '130px' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, index) => {
                const isMe = user.id === currentUserId;
                return (
                  <tr 
                    key={user.id} 
                    style={{
                      backgroundColor: isMe ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                      borderBottom: '1px solid #334155',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {/* Rank */}
                    <td style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #334155' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        backgroundColor: index === 0 ? 'rgba(234, 179, 8, 0.2)' : index === 1 ? 'rgba(203, 213, 225, 0.2)' : index === 2 ? 'rgba(217, 119, 6, 0.2)' : '#0f172a',
                        color: index === 0 ? '#facc15' : index === 1 ? '#e2e8f0' : index === 2 ? '#f59e0b' : '#94a3b8',
                        border: '1px solid #475569'
                      }}>
                        #{index + 1}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td style={{ padding: '16px', color: '#ffffff', fontWeight: '500', borderRight: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{user.username}</span>
                        {isMe && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontWeight: 'bold'
                          }}>
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Mastery */}
                    <td style={{ padding: '16px', textAlign: 'center', color: '#34d399', fontWeight: '600', borderRight: '1px solid #334155' }}>
                      {Math.round(user.mastery_percentage || 0)}%
                    </td>

                    {/* Coins */}
                    <td style={{ padding: '16px', textAlign: 'center', color: '#facc15', fontWeight: '600', borderRight: '1px solid #334155' }}>
                      🪙 {user.coins || 0}
                    </td>

                    {/* Points */}
                    <td style={{ padding: '16px', textAlign: 'right', color: '#60a5fa', fontWeight: 'bold' }}>
                      {user.total_points || 0} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {leaderboard.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
              No students ranked yet. Be the first to take an exam!
            </div>
          )}
        </div>
      )}
    </div>
  );
}