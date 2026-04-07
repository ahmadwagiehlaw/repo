import DateDisplay from '@/components/common/DateDisplay.jsx';

export default function CaseAttachmentsTab({
  attachments = [],
  dateDisplayOptions,
  onAddAttachment,
  onDeleteAttachment,
}) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <button
        onClick={onAddAttachment}
        className="btn-primary"
        style={{ padding: '10px 16px', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}
      >
        📎 إضافة مرفق
      </button>

      {attachments.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
          لا توجد مرفقات
        </div>
      ) : (
        attachments.map((attachment, idx) => {
          const fileExt = attachment.url?.split('.').pop()?.toUpperCase() || 'FILE';
          const isImage = ['JPG', 'PNG', 'GIF', 'WEBP'].includes(fileExt);
          const isPDF = fileExt === 'PDF';

          return (
            <div
              key={idx}
              style={{
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: '24px' }}>
                  {isPDF ? '📄' : isImage ? '🖼️' : '📎'}
                </div>
                <div style={{ flex: 1 }}>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {attachment.title || attachment.url.split('/').pop() || 'مرفق'}
                  </a>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {fileExt} • {attachment.addedAt ? <DateDisplay value={attachment.addedAt} options={dateDisplayOptions} /> : '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDeleteAttachment(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#ef4444',
                }}
              >
                ✕
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
