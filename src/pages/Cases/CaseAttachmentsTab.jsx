import { useState, useEffect } from 'react';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import localFileIndex from '@/services/LocalFileIndex.js';
import attachmentService from '@/services/AttachmentService.js';
import { ATTACHMENT_TYPE_MAP } from '@/core/Constants.js';
import SmartAttachmentUpload from '@/components/cases/SmartAttachmentUpload.jsx';
import subscriptionManager from '@/services/SubscriptionManager.js';

const VIEW_MODES = [
  { id: 'grid', icon: '⊞', label: 'شبكة' },
  { id: 'list', icon: '☰', label: 'قائمة' },
];

function AttachmentThumbnail({ attachment, onOpen, onDelete, isOpening, syncStatus }) {
  const typeConfig = ATTACHMENT_TYPE_MAP[attachment.attachmentType] || null;
  const isLocal = Boolean(attachment.localId);
  const icon = typeConfig?.icon || attachmentService.detectKind(attachment.url || '') === 'image' ? '🖼️'
    : attachmentService.detectKind(attachment.url || '') === 'pdf' ? '📄' : '📎';
  const color = typeConfig?.color || '#94a3b8';
  const bg = typeConfig?.bg || '#f8fafc';

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${color}30`,
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${color}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
    >
      {/* Thumbnail area */}
      <div
        onClick={() => onOpen(attachment)}
        style={{
          height: 100, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', borderBottom: `2px solid ${color}20`,
        }}
      >
        {isOpening ? (
          <span style={{ fontSize: 28, animation: 'spin 1s linear infinite' }}>⟳</span>
        ) : (
          <span style={{ fontSize: 40 }}>{typeConfig?.icon || '📎'}</span>
        )}
        {isLocal && (
          <span style={{
            position: 'absolute', top: 6, left: 6,
            background: '#3b82f6', color: 'white',
            fontSize: 9, fontWeight: 700, padding: '2px 6px',
            borderRadius: 10,
          }}>💾 محلي</span>
        )}
        {typeConfig?.autoLog && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            background: '#10b981', color: 'white',
            fontSize: 9, padding: '2px 6px', borderRadius: 10,
          }}>📝</span>
        )}
        {syncStatus && (
          <span style={{
            position: 'absolute', bottom: 6, right: 6,
            background: syncStatus.status === 'done' ? '#10b981'
              : syncStatus.status === 'error' ? '#dc2626'
              : '#3b82f6',
            color: 'white', fontSize: 9,
            padding: '2px 6px', borderRadius: 10,
          }}>
            {syncStatus.status === 'done' ? '☁️ مزامن'
              : syncStatus.status === 'error' ? '⚠️ خطأ'
              : `☁️ ${syncStatus.pct}%`}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px', flex: 1 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: '#1e293b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {attachment.title || 'مرفق'}
        </div>
        {typeConfig && (
          <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600 }}>
            {typeConfig.icon} {typeConfig.label}
          </div>
        )}
        {attachment.sessionDate && (
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            📅 {attachment.sessionDate}
          </div>
        )}
      </div>

      {/* Delete */}
      <div style={{ padding: '4px 8px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(attachment); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444', padding: '2px 6px' }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

export default function CaseAttachmentsTab({
  attachments = [],
  dateDisplayOptions,
  onSaveAttachment,
  onDeleteAttachment,
}) {
  const [viewMode, setViewMode] = useState('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [syncProgress, setSyncProgress] = useState({});
  const isProUser = subscriptionManager.hasFeature('cloudSync');

  useEffect(() => {
    if (!isProUser) return;
    let unsub;
    import('@/services/CloudSyncService.js').then(({ default: cloudSync }) => {
      unsub = cloudSync.onProgress((progress) => setSyncProgress({ ...progress }));
    });
    return () => { if (unsub) unsub(); };
  }, [isProUser]);

  const handleOpen = async (attachment) => {
    if (!attachment.localId) {
      const kind = attachmentService.detectKind(attachment.url || '');
      if (kind === 'pdf' || kind === 'image') {
        setPreview({ url: attachment.url, name: attachment.title || 'مرفق', type: kind });
      } else {
        window.open(attachment.url, '_blank');
      }
      return;
    }
    setOpeningId(attachment.localId);
    try {
      const result = await localFileIndex.openFile(attachment.localId);
      if (!result) { alert('الملف غير متاح محلياً'); return; }
      const isImage = result.type?.startsWith('image/');
      const isPdf = result.type === 'application/pdf';
      if (isImage || isPdf) {
        setPreview({ url: result.url, name: result.name, type: isImage ? 'image' : 'pdf' });
      } else {
        const win = window.open('', '_blank');
        win.document.write(`<iframe src="${result.url}" style="width:100%;height:100vh;border:none"></iframe>`);
      }
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = (attachment) => {
    const idx = attachments.indexOf(attachment);
    if (idx !== -1) onDeleteAttachment(idx);
  };

  return (
    <div style={{ direction: 'rtl' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={() => setShowUpload(true)}
          className="btn-primary"
          style={{ padding: '9px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          📎 إضافة مرفق قانوني
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {VIEW_MODES.map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
              title={m.label}
              style={{
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 16,
                border: viewMode === m.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: viewMode === m.id ? 'var(--primary-light)' : 'white',
                color: viewMode === m.id ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >{m.icon}</button>
          ))}
        </div>
      </div>

      {/* ── Smart Upload Modal ── */}
      {showUpload && (
        <SmartAttachmentUpload
          onSave={async (record) => { await onSaveAttachment(record); setShowUpload(false); }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* ── Inline viewer ── */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10000, direction: 'rtl' }}>
            <span style={{ color: 'white', fontSize: 14, fontFamily: 'Cairo', fontWeight: 600 }}>{preview.name}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.open(preview.url, '_blank')} style={{ background: '#3b82f6', border: 'none', borderRadius: 6, color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo' }}>🔗 فتح خارجي</button>
              <button onClick={() => setPreview(null)} style={{ background: '#ef4444', border: 'none', borderRadius: 6, color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo' }}>✕ إغلاق</button>
            </div>
          </div>
          <div style={{ width: '95vw', height: '90vh', marginTop: 52, borderRadius: 8, overflow: 'hidden', background: 'white' }}>
            {preview.type === 'image'
              ? <img src={preview.url} alt={preview.name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1e293b' }} />
              : <iframe src={preview.url} title={preview.name} style={{ width: '100%', height: '100%', border: 'none' }} />
            }
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {attachments.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>لا توجد مرفقات</div>
          <div style={{ fontSize: 12 }}>اضغط "إضافة مرفق قانوني" لرفع أول مستند</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {attachments.map((att, idx) => (
            <AttachmentThumbnail
              key={idx}
              attachment={att}
              onOpen={handleOpen}
              onDelete={handleDelete}
              isOpening={openingId === att.localId}
              syncStatus={att.id ? syncProgress[att.id] : null}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {attachments.map((att, idx) => {
            const typeConfig = ATTACHMENT_TYPE_MAP[att.attachmentType] || null;
            const isLocal = Boolean(att.localId);
            const isOpening = openingId === att.localId;
            return (
              <div key={idx} style={{
                padding: 12, borderRadius: 10, background: typeConfig?.bg || 'var(--bg-hover)',
                border: `1px solid ${typeConfig?.color || 'var(--border)'}30`,
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <span style={{ fontSize: 24 }}>{typeConfig?.icon || '📎'}</span>
                <div style={{ flex: 1 }}>
                  <button onClick={() => handleOpen(att)} disabled={isOpening}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 14, fontFamily: 'Cairo', padding: 0, display: 'block', textAlign: 'right' }}>
                    {isOpening ? '⟳ جاري الفتح...' : (att.title || 'مرفق')}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 8 }}>
                    {typeConfig && <span style={{ color: typeConfig.color, fontWeight: 600 }}>{typeConfig.label}</span>}
                    {isLocal && <span>💾 محلي</span>}
                    {att.sessionDate && <span>📅 {att.sessionDate}</span>}
                    {att.addedAt && <DateDisplay value={att.addedAt} options={dateDisplayOptions} />}
                  </div>
                </div>
                <button onClick={() => handleDelete(att)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#ef4444' }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
