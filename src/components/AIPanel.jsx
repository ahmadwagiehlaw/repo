import { useEffect, useMemo, useRef, useState } from 'react';
import { useCases } from '@/contexts/CaseContext';
import { AssistantService } from '@/ai/AssistantService.js';
import { ContextBuilder } from '@/ai/ContextBuilder.js';

const SUGGESTED_QUESTIONS = [
  'ما هي القضايا العاجلة؟',
  'ما القضايا المحجوزة للحكم؟',
  'كم عدد القضايا النشطة؟',
  'ما آخر جلسة مسجلة؟',
];

export default function AIPanel() {
  const { cases, currentCase } = useCases();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const assistantService = useMemo(() => new AssistantService(apiKey), [apiKey]);
  const contextBuilder = useMemo(() => new ContextBuilder(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content }]);
  };

  const handleSend = async () => {
    const query = String(input || '').trim();
    if (!query || loading) return;

    addMessage('user', query);
    setInput('');
    setLoading(true);

    try {
      if (!apiKey) {
        addMessage('ai', 'يرجى إضافة VITE_GEMINI_API_KEY في ملف .env.local');
        return;
      }

      const context = contextBuilder.buildContext(query, currentCase, cases);
      const answer = await assistantService.ask(query, context);
      addMessage('ai', answer);
    } catch (error) {
      addMessage('ai', `حدث خطأ أثناء التواصل مع المساعد: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <style>{`
        @keyframes aiDots {
          0%, 20% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
          80%, 100% { opacity: 0.2; transform: translateY(0); }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '999px',
          border: 'none',
          background: '#ff8c00',
          color: 'white',
          fontSize: '22px',
          cursor: 'pointer',
          zIndex: 300,
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.18)',
        }}
        aria-label="فتح المساعد الذكي"
      >
        🤖
      </button>

      {open ? (
        <div
          style={{
            position: 'fixed',
            left: '20px',
            bottom: '84px',
            width: '340px',
            height: '500px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.2)',
            border: '1px solid #e2e8f0',
            zIndex: 299,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff7ed',
              fontFamily: 'Cairo',
              fontWeight: 700,
            }}
          >
            <span>المساعد الذكي ⚡</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMessages([])}
                title="مسح المحادثة"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '12px',
                }}
              >
                مسح
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1,
                }}
                aria-label="إغلاق المساعد"
              >
                X
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'grid',
              gap: '10px',
              background: '#f8fafc',
              direction: 'rtl',
            }}
          >
            {messages.length === 0 ? (
              <>
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', paddingTop: '16px' }}>
                  اكتب سؤالك وسأجيب اعتماداً على بيانات النظام
                </div>
                <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => { setInput(question); }}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Cairo',
                        color: '#475569',
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      background: isUser ? '#ffedd5' : '#e5e7eb',
                      color: '#0f172a',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      fontSize: '13px',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    background: '#e5e7eb',
                    color: '#334155',
                    fontSize: '13px',
                  }}
                >
                  <span>جاري التفكير...</span>
                  <span style={{ display: 'inline-flex', gap: '4px', marginInlineStart: '8px' }}>
                    <span style={{ animation: 'aiDots 1s infinite', animationDelay: '0s' }}>.</span>
                    <span style={{ animation: 'aiDots 1s infinite', animationDelay: '0.2s' }}>.</span>
                    <span style={{ animation: 'aiDots 1s infinite', animationDelay: '0.4s' }}>.</span>
                  </span>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'grid', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
              style={{ width: '100%' }}
            />
            <button type="button" className="filter-chip" onClick={handleSend} disabled={loading}>
              إرسال
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}