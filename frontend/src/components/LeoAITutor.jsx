import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import katex from 'katex';
import 'katex/dist/katex.min.css';

// KaTeX rendering helper for math formulas in chat
function renderLaTeX(text) {
  if (!text || typeof text !== 'string') return text;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
  return parts.map((part, i) => {
    try {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const html = katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false });
        return <span key={i} className="katex-display-wrapper" dangerouslySetInnerHTML={{ __html: html }} />;
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

export default function LeoAITutor() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm **Leo**, your personal NCTB AI Tutor. Each question costs **10 coins** 🪙. Ask me anything about your SSC syllabus!" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Hide Leo during active exam or onboarding
  if (location.pathname === '/exam/active' || location.pathname === '/onboarding') {
    return null;
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userText = inputValue.trim();
    setInputValue('');

    const currentHistory = messages.map(m => ({ role: m.role, content: m.content }));
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsThinking(true);

    const userId = localStorage.getItem('user_id') || 'guest';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/leo-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: userText,
          history: currentHistory,
          subject: "SSC Curriculum"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to reach Leo");
      }

      // Update local storage coins and trigger Navbar coin counter refresh
      if (data.remaining_coins !== undefined && userId !== 'guest') {
        localStorage.setItem('user_coins', data.remaining_coins);
        window.dispatchEvent(new Event('storage'));
      }

      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error("Leo AI error:", error);
      setMessages([...updatedMessages, { role: 'assistant', content: `⚠️ ${error.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Injected style to force KaTeX formulas to wrap/scroll cleanly */}
      <style>{`
        .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          max-width: 100%;
          padding: 4px 0;
        }
        .leo-msg-bubble .katex {
          white-space: normal !important;
        }
      `}</style>

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '2px solid rgba(129, 140, 248, 0.6)',
            borderRadius: '999px',
            padding: '12px 22px',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(79, 70, 229, 0.45)',
            transition: 'all 0.25s ease',
            fontWeight: 800,
            fontSize: '15px',
          }}
          className="leo-float-btn"
        >
          <span style={{ fontSize: '22px' }}>🤖</span>
          <span>Ask Leo AI Tutor</span>
          <span style={{ fontSize: '12px', color: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.15)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(250, 204, 21, 0.4)' }}>10 🪙</span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          style={{
            width: '390px',
            maxWidth: '90vw',
            height: '520px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(129, 140, 248, 0.5)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(79, 70, 229, 0.3)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.85), rgba(37, 99, 235, 0.85))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(165, 180, 252, 0.3)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>Leo AI Tutor</div>
                <div style={{ fontSize: '11px', color: '#c7d2fe', fontWeight: 600 }}>Costs 10 Coins per message 🪙</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 900,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: '1 1 0',
              minHeight: 0,
              padding: '16px',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#050816',
              boxSizing: 'border-box',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className="leo-msg-bubble"
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  width: 'fit-content',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#1e293b',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  boxSizing: 'border-box',
                  border: m.role === 'assistant' ? '1px solid rgba(129, 140, 248, 0.3)' : 'none',
                }}
              >
                {renderLaTeX(m.content)}
              </div>
            ))}
            {isThinking && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontStyle: 'italic',
                }}
              >
                Leo is reviewing your textbook context... ⚡
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '12px 16px',
              backgroundColor: '#0f172a',
              borderTop: '1px solid rgba(51, 65, 85, 0.8)',
              display: 'flex',
              gap: '10px',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <input
              type="text"
              placeholder="Ask Leo a doubt (Costs 10 coins)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#050816',
                border: '1px solid #475569',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0 16px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
}