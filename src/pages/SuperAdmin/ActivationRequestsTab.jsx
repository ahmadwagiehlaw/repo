const STATUS_CONFIG = {
  pending: { bg: '#fef3c7', color: '#d97706', label: 'معلق' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'موافق عليه' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: 'مرفوض' },
};

export default function ActivationRequestsTab({
  requests,
  processingRequestId,
  onApprove,
  onReject,
  formatArabicDate,
}) {
  if (!requests.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#64748b', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>لا توجد طلبات</div>
        <div style={{ marginTop: 8, fontSize: 12 }}>طلبات التفعيل الجديدة ستظهر هنا.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {requests.map((request) => {
        const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
        const isProcessing = processingRequestId === request.id;
        return (
          <div key={request.id} style={{ padding: '14px 18px', borderRadius: 12, background: 'white', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{request.userName || 'مستخدم'}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color }}>{status.label}</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {request.phone && <span>الهاتف: {request.phone}</span>}
                  {request.email && <span>البريد: {request.email}</span>}
                  {request.workspaceName && <span>المساحة: {request.workspaceName}</span>}
                  {request.message && <span style={{ color: '#64748b' }}>الرسالة: {request.message}</span>}
                  {request.createdAt && <span>التاريخ: {formatArabicDate(request.createdAt)}</span>}
                </div>
              </div>
              {request.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => onApprove(request)} disabled={isProcessing} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                    {isProcessing ? '...' : 'اعتماد Pro'}
                  </button>
                  <button
                    onClick={() => onReject(request)}
                    disabled={isProcessing}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 8, color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: '6px 14px', fontFamily: 'Cairo' }}
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
