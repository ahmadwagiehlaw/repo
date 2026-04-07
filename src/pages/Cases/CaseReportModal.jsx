export default function CaseReportModal({ open, onClose, onPrint, caseData = {} }) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 500,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: 'min(860px, calc(100vw - 24px))',
          maxHeight: '88vh',
          overflowY: 'auto',
          zIndex: 501,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          📄 تقرير القضية
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ✕
          </button>
        </div>

        <div id="printable-case-report" className="print-only-formal" style={{ padding: '20px', color: '#000', fontFamily: 'Cairo, sans-serif', direction: 'rtl', background: 'white' }}>

          {/* Header / Letterhead */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>تقرير حالة دعوى</h1>
              <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 600 }}>نظام إدارة القضايا</div>
            </div>
            <div style={{ textAlign: 'left', fontSize: '12px' }}>
              <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
              <div>رقم المرجع المطبوع: {caseData.id?.substring(0, 8) || 'N/A'}</div>
            </div>
          </div>

          {/* Main Case Identity (Grid) */}
          <div style={{ display: 'flex', border: '2px solid #000', marginBottom: '24px', fontWeight: 700 }}>
            <div style={{ flex: 1, padding: '12px', borderLeft: '2px solid #000' }}>
              <span style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>رقم الدعوى والسنة</span>
              <span style={{ fontSize: '18px' }}>{caseData.caseNumber} لسنة {caseData.caseYear}</span>
            </div>
            <div style={{ flex: 1, padding: '12px', borderLeft: '2px solid #000' }}>
              <span style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>المحكمة والدائرة</span>
              <span style={{ fontSize: '16px' }}>{caseData.court || '—'} {caseData.circuit ? `(${caseData.circuit})` : ''}</span>
            </div>
            <div style={{ flex: 1, padding: '12px' }}>
              <span style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>الحالة الحالية</span>
              <span style={{ fontSize: '16px' }}>{caseData.status || 'متداولة'}</span>
            </div>
          </div>

          {/* Parties Section */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #000' }}>
            <tbody>
              <tr>
                <td style={{ width: '15%', padding: '10px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 700 }}>المدعـــي:</td>
                <td style={{ width: '35%', padding: '10px', border: '1px solid #000', fontWeight: 700 }}>{caseData.plaintiffName || '—'}</td>
                <td style={{ width: '15%', padding: '10px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 700 }}>الصفة القانونية:</td>
                <td style={{ width: '35%', padding: '10px', border: '1px solid #000', fontWeight: 700 }}>{caseData.roleCapacity || '—'}</td>
              </tr>
              <tr>
                <td style={{ width: '15%', padding: '10px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 700 }}>المدعى عليه:</td>
                <td colSpan="3" style={{ padding: '10px', border: '1px solid #000', fontWeight: 700 }}>{caseData.defendantName || '—'}</td>
              </tr>
              {(caseData.firstInstanceNumber || caseData.firstInstanceCourt) && (
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #000', background: '#f5f5f5', fontWeight: 700 }}>بيانات الطعن:</td>
                  <td colSpan="3" style={{ padding: '10px', border: '1px solid #000' }}>طعناً على الحكم رقم {caseData.firstInstanceNumber || '—'} محكمة {caseData.firstInstanceCourt || '—'}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Critical Dates & Sessions */}
          <div style={{ border: '2px solid #000', marginBottom: '24px' }}>
            <div style={{ background: '#000', color: '#fff', padding: '8px 12px', fontWeight: 800, fontSize: '14px' }}>موقف الجلسات</div>
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, padding: '12px', borderLeft: '1px solid #000' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>آخر جلسة: {caseData.lastSessionDate || '—'}</div>
                <div style={{ fontSize: '14px' }}>القرار: <strong>{caseData.sessionResult || '—'}</strong></div>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#fefce8' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>الجلسة القادمة: {caseData.nextSessionDate || '—'}</div>
                <div style={{ fontSize: '14px' }}>النوع: <strong>{caseData.nextSessionType || '—'}</strong></div>
              </div>
            </div>
          </div>

          {/* Judgments & Procedures Summary */}
          {(caseData.summaryDecision || caseData.judgmentPronouncement) && (
            <div style={{ border: '2px solid #000', marginBottom: '24px', pageBreakInside: 'avoid' }}>
              <div style={{ background: '#000', color: '#fff', padding: '8px 12px', fontWeight: 800, fontSize: '14px' }}>منطوق الحكم / القرار النهائي</div>
              <div style={{ padding: '16px', fontSize: '15px', lineHeight: '1.6', fontWeight: 700, whiteSpace: 'pre-wrap' }}>
                {caseData.judgmentPronouncement || caseData.summaryDecision}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '16px', fontSize: '11px', textAlign: 'center', color: '#555' }}>
            تم استخراج هذا التقرير آلياً من نظام LawBase لإدارة المكاتب القانونية. تعتبر هذه البيانات سرية وخاصة بأطراف الدعوى.
          </div>

        </div>

        <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={onPrint}
            className="btn-primary"
            style={{ width: '100%', padding: '10px' }}
          >
            🖨️ طباعة وحفظ PDF
          </button>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ width: '100%', padding: '10px' }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}
