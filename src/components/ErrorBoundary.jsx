import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[LawBase ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            direction: 'rtl',
            fontFamily: "'Cairo', sans-serif",
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            }}
          >
            <h2 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '24px' }}>
              حدث خطأ غير متوقع
            </h2>
            <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '14px', lineHeight: 1.8 }}>
              حدثت مشكلة أثناء عرض الصفحة. يمكنك إعادة تحميل التطبيق والمحاولة مرة أخرى.
            </p>
            {this.state.error?.message ? (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '12px',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 'none',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                padding: '11px 22px',
                fontSize: '14px',
                fontFamily: "'Cairo', sans-serif",
                cursor: 'pointer',
              }}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
