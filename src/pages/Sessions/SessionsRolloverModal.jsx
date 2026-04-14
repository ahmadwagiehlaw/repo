const ROLLOVER_ROUTES = ['next_session', 'judgments', 'archive'];

function printSessionBeforeRollover(session) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8"/>
      <title>بيانات الجلسة قبل الترحيل</title>
      <style>
        body { font-family: 'Cairo', Arial, sans-serif; direction: rtl;
               padding: 24px; font-size: 14px; color: #1e293b; }
        h2 { margin-bottom: 8px; font-size: 18px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; }
        th { background: #f8fafc; font-weight: 700; }
        @media print { @page { size: A4 portrait; margin: 12mm; } }
      </style>
    </head>
    <body>
      <h2>بيانات الجلسة قبل الترحيل</h2>
      <div class="meta">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
      <table>
        <tr><th>رقم الدعوى</th><td>${session.caseNumber || '—'}${session.caseYear ? '/' + session.caseYear : ''}</td></tr>
        <tr><th>المدعي</th><td>${session.clientName || '—'}</td></tr>
        <tr><th>المحكمة</th><td>${session.court || '—'}</td></tr>
        <tr><th>الجلسة الحالية</th><td>${session.date || '—'}</td></tr>
        <tr><th>الجلسة القادمة</th><td>${session.nextDate || '—'}</td></tr>
        <tr><th>نوع الجلسة</th><td>${session.sessionType || '—'}</td></tr>
        <tr><th>القرار</th><td>${session.decision || '—'}</td></tr>
        <tr><th>محضر الجلسة</th><td>${session.sessionMinute || '—'}</td></tr>
        <tr><th>طلبات الإطلاع</th><td>${session.inspectionRequests || '—'}</td></tr>
        <tr><th>مكان الملف</th><td>${session.fileLocation || '—'}</td></tr>
        <tr><th>ملاحظات</th><td>${session.notes || '—'}</td></tr>
      </table>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 400);
}

export default function SessionsRolloverModal({
  rollingOver,
  rolloverRoute,
  onRouteChange,
  onClose,
  onConfirm,
}) {
  if (!rollingOver) return null;

  const handlePrintThenConfirm = () => {
    printSessionBeforeRollover(rollingOver);
    onConfirm();
  };

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
          minWidth: '340px',
          fontFamily: 'Cairo',
          direction: 'rtl',
        }}
      >
        <h3 style={{ margin: '0 0 8px' }}>تحريك الجلسة</h3>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px' }}>
          القضية:{' '}
          <strong>
            {rollingOver.caseNumber}
            {rollingOver.caseYear ? `/${rollingOver.caseYear}` : ''}
          </strong>
          {rollingOver.clientName ? ` — ${rollingOver.clientName}` : ''}
        </p>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
          {ROLLOVER_ROUTES.map((route) => (
            <label
              key={route}
              style={{
                display: 'flex', gap: '8px',
                alignItems: 'center', cursor: 'pointer',
              }}
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

        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo',
              background: 'white',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handlePrintThenConfirm}
            style={{
              padding: '8px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo',
              background: '#f8fafc',
              color: '#475569',
            }}
          >
            🖨️ طباعة ثم ترحيل
          </button>
          <button onClick={onConfirm} className="btn-primary">
            تأكيد الترحيل
          </button>
        </div>
      </div>
    </div>
  );
}
