const ROLLOVER_ROUTES = ['next_session', 'judgments', 'archive'];

export default function SessionsRolloverModal({
  rollingOver,
  rolloverRoute,
  onRouteChange,
  onClose,
  onConfirm,
}) {
  if (!rollingOver) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '320px',
          fontFamily: 'Cairo',
          direction: 'rtl',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>تحريك الجلسة</h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          القضية: {rollingOver.caseId}
        </p>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
          {ROLLOVER_ROUTES.map((route) => (
            <label
              key={route}
              style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
            >
              <input
                type="radio"
                name="route"
                value={route}
                checked={rolloverRoute === route}
                onChange={() => onRouteChange(route)}
              />
              {route === 'next_session'
                ? 'جلسة قادمة'
                : route === 'judgments'
                  ? 'أجندة الأحكام'
                  : 'أرشفة القضية'}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo',
            }}
          >
            إلغاء
          </button>
          <button onClick={onConfirm} className="btn-primary">
            تأكيد التحريك
          </button>
        </div>
      </div>
    </div>
  );
}
