import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { loading, error, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');

  const isRegisterMode = mode === 'register';

  const onSubmitEmail = async () => {
    if (!email || !password) return;
    if (isRegisterMode) {
      await signUpWithEmail(email, password);
      return;
    }
    await signInWithEmail(email, password);
  };

  const errorMessage = useMemo(() => {
    if (!error) return '';
    if (error?.code === 'auth/user-not-found') return 'المستخدم غير موجود.';
    if (error?.code === 'auth/wrong-password') return 'كلمة المرور غير صحيحة.';
    if (error?.code === 'auth/invalid-email') return 'البريد الإلكتروني غير صالح.';
    if (error?.code === 'auth/email-already-in-use') return 'البريد الإلكتروني مستخدم بالفعل.';
    if (error?.code === 'auth/weak-password') return 'كلمة المرور ضعيفة.';
    return 'تعذر تنفيذ عملية تسجيل الدخول. يرجى المحاولة مرة أخرى.';
  }, [error]);

  return (
    <div
      className="dashboard-widget-system"
      style={{ minHeight: '100vh', placeItems: 'center', padding: '24px' }}
    >
      <div
        className="dashboard-widget-card"
        style={{
          width: 'min(100%, 420px)',
          textAlign: 'center',
          padding: '32px 28px',
        }}
      >
        <div className="widget-body" style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <h1 style={{ margin: 0, color: 'var(--db-primary)', fontSize: '40px', fontWeight: 800 }}>LawBase</h1>
            <p style={{ margin: 0, color: 'var(--db-text-muted)', fontSize: '14px', fontWeight: 700 }}>
              النظام القانوني المتكامل
            </p>
          </div>

          <div className="filter-chips" style={{ marginBottom: 0, justifyContent: 'center' }}>
            <button
              type="button"
              className={`filter-chip ${!isRegisterMode ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              className={`filter-chip ${isRegisterMode ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              إنشاء حساب
            </button>
          </div>

          <div style={{ display: 'grid', gap: '10px', textAlign: 'right' }}>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              البريد الإلكتروني
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontFamily: 'Cairo, sans-serif',
                  direction: 'ltr',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              كلمة المرور
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontFamily: 'Cairo, sans-serif',
                  direction: 'ltr',
                }}
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="dashboard-load-error">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <button
            type="button"
            className="utility-icon-btn"
            onClick={onSubmitEmail}
            disabled={loading || !email || !password}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '48px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              gap: '10px',
              padding: '0 18px',
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : (isRegisterMode ? 'إنشاء حساب بالإيميل' : 'دخول بالإيميل')}
          </button>

          <button
            type="button"
            className="utility-icon-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '48px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              gap: '10px',
              padding: '0 18px',
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بـ Google'}
          </button>
        </div>
      </div>
    </div>
  );
}