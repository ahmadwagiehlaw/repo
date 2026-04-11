/**
 * Batch 12.2 — SmartAttachmentUpload
 * Modal for uploading legal documents with type + metadata + autoLog
 */
import { useState } from 'react';
import { ATTACHMENT_TYPES } from '@/core/Constants.js';
import localFileIndex from '@/services/LocalFileIndex.js';
import attachmentService from '@/services/AttachmentService.js';

export default function SmartAttachmentUpload({ onSave, onCancel, caseData }) {
  const [step, setStep] = useState('type'); // 'type' | 'details'
  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [localId, setLocalId] = useState('');
  const [localName, setLocalName] = useState('');
  const [saving, setSaving] = useState(false);

  const typeConfig = selectedType
    ? ATTACHMENT_TYPES.find((t) => t.id === selectedType)
    : null;

  const handlePickLocal = async () => {
    const file = await localFileIndex.pickFile('application/pdf,.doc,.docx,image/*');
    if (!file) return;
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const saved = await localFileIndex.saveFile(id, file);
    if (saved) {
      setLocalId(id);
      setLocalName(file.name);
      setFileUrl('');
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleClearLocal = () => {
    setLocalId('');
    setLocalName('');
  };

  const handleSave = async () => {
    if (!selectedType) return;
    if (!fileUrl && !localId) {
      alert('يرجى رفع ملف أو إدخال رابط');
      return;
    }
    setSaving(true);
    try {
      const record = attachmentService.buildRecord({
        url: fileUrl || '',
        title: title || typeConfig?.label || 'مرفق',
        localId: localId || null,
        source: localId ? 'local' : 'url',
      });
      record.attachmentType = selectedType;
      record.sessionDate = sessionDate || null;
      record.autoLogged = typeConfig?.autoLog || false;
      record.logTemplate = typeConfig?.logTemplate || null;
      await onSave(record);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl', fontFamily: 'Cairo',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        width: 'min(560px, 95vw)', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            📎 إضافة مرفق قانوني
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {step === 'type' && (
          <>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>اختر نوع المستند</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ATTACHMENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type.id); setStep('details'); }}
                  style={{
                    padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${type.color}20`,
                    background: type.bg,
                    display: 'flex', alignItems: 'center', gap: 10,
                    textAlign: 'right', fontFamily: 'Cairo',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = type.color; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${type.color}20`; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span style={{ fontSize: 24 }}>{type.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: type.color }}>{type.label}</div>
                    {type.autoLog && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>📝 يُسجَّل تلقائياً</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'details' && typeConfig && (
          <>
            {/* Back button */}
            <button onClick={() => setStep('type')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3b82f6', fontSize: 13, fontFamily: 'Cairo',
              marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ← تغيير النوع
            </button>

            {/* Selected type badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20,
              background: typeConfig.bg, color: typeConfig.color,
              fontWeight: 700, fontSize: 13, marginBottom: 20,
              border: `1px solid ${typeConfig.color}40`,
            }}>
              {typeConfig.icon} {typeConfig.label}
              {typeConfig.autoLog && <span style={{ fontSize: 10, opacity: 0.7 }}>· يُسجَّل تلقائياً</span>}
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                عنوان المستند
              </label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`مثال: ${typeConfig.label} - جلسة يناير 2026`}
              />
            </div>

            {/* Session date (if applicable) */}
            {typeConfig.hasSessionDate && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  تاريخ الجلسة المرتبطة
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
              </div>
            )}

            {/* File upload — LOCAL FIRST */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
                الملف
              </label>

              {localId ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 10,
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                }}>
                  <span style={{ fontSize: 20 }}>💾</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>{localName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>محفوظ محلياً</div>
                  </div>
                  <button onClick={handleClearLocal} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18,
                  }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <button
                    onClick={handlePickLocal}
                    style={{
                      padding: '14px', borderRadius: 10, cursor: 'pointer',
                      border: '2px dashed #3b82f6', background: '#eff6ff',
                      color: '#1d4ed8', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    📁 رفع ملف من جهازك
                  </button>
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>أو</div>
                  <input
                    className="form-input"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              )}
            </div>

            {/* AutoLog notice */}
            {typeConfig.autoLog && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: 12, color: '#15803d', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>📝</span>
                <span>سيُسجَّل تلقائياً: <strong>{typeConfig.logTemplate}</strong>
                  {sessionDate && ` — جلسة ${sessionDate}`}
                </span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} className="btn-secondary" style={{ minWidth: 80 }}>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (!fileUrl && !localId)}
                className="btn-primary"
                style={{ minWidth: 120 }}
              >
                {saving ? 'جاري الحفظ...' : '💾 حفظ المرفق'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
