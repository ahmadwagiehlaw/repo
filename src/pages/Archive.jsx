import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import { formatDisplayDate } from '@/utils/caseUtils.js';
import { confirmDialog } from '@/utils/browserFeedback.js';

const ARCHIVE_SECTIONS = [
  { id: 'all', label: 'كل الأقسام', icon: '📁' },
  { id: 'session_rolls', label: 'رولات الجلسات', icon: '📅' },
  { id: 'judgment_rolls', label: 'رولات الأحكام', icon: '⚖️' },
  { id: 'circulars', label: 'التعليمات والمنشورات', icon: '📑' },
  { id: 'custom', label: 'قسم مخصص', icon: '➕' },
];

const DEFAULT_SESSION_TYPE_OPTIONS = ['عادي', 'استئناف', 'إداري', 'أحكام'];

function mapSessionTypeLabel(type) {
  if (type === 'regular') return 'عادي';
  if (type === 'appeal') return 'استئناف';
  if (type === 'admin') return 'إداري';
  if (type === 'judgment') return 'أحكام';
  return String(type || '').trim();
}

function normalizeSessionTypeOptions(rawItems) {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const normalized = list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      if (item.isActive === false) return '';
      return String(item.label || '').trim();
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : DEFAULT_SESSION_TYPE_OPTIONS;
}

function mapJudgmentTypeLabel(type) {
  if (type === 'reserved') return 'محجوزة للحكم';
  if (type === 'pronounced') return 'نطق حكم';
  if (type === 'postponed') return 'تأجيل حكم';
  return type || '';
}

export default function Archive() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = String(currentWorkspace?.id || '').trim();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('session_rolls');
  const [searchText, setSearchText] = useState('');
  const [sessionTypeOptions, setSessionTypeOptions] = useState(DEFAULT_SESSION_TYPE_OPTIONS);
  const [showSessionTypeManager, setShowSessionTypeManager] = useState(false);
  const [newSessionType, setNewSessionType] = useState('');

  const [rollForm, setRollForm] = useState({
    title: '',
    sessionDate: '',
    sessionType: '',
    court: '',
    fileUrl: '',
    notes: '',
    section: 'session_rolls',
  });

  const [judgmentRollForm, setJudgmentRollForm] = useState({
    title: '',
    judgmentDate: '',
    judgmentType: '',
    linkedCaseId: '',
    court: '',
    fileUrl: '',
    notes: '',
    section: 'judgment_rolls',
  });

  const [generalForm, setGeneralForm] = useState({
    title: '',
    section: 'circulars',
    fileUrl: '',
    notes: '',
  });
  const [showSessionRollForm, setShowSessionRollForm] = useState(false);
  const [showJudgmentRollForm, setShowJudgmentRollForm] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    fileUrl: '',
    notes: '',
    court: '',
    sessionDate: '',
    sessionType: '',
    judgmentDate: '',
    judgmentType: '',
    linkedCaseId: '',
  });

  const loadDocuments = async () => {
    if (!workspaceId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await storage.listArchiveDocuments(workspaceId);
      setDocuments(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments().catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    let active = true;

    if (!workspaceId) {
      setSessionTypeOptions(DEFAULT_SESSION_TYPE_OPTIONS);
      return () => {
        active = false;
      };
    }

    storage.getWorkspaceOptions(workspaceId, 'sessionTypes')
      .then((items) => {
        if (!active) return;
        setSessionTypeOptions(normalizeSessionTypeOptions(items));
      })
      .catch(() => {
        if (!active) return;
        setSessionTypeOptions(DEFAULT_SESSION_TYPE_OPTIONS);
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const saveSessionTypeOptions = async (next) => {
    const normalized = normalizeSessionTypeOptions(next);
    setSessionTypeOptions(normalized);
    if (!workspaceId) return;

    const payload = normalized.map((label, index) => ({
      id: `sessionTypes_${index}_${label}`,
      label,
      isActive: true,
      sortOrder: index,
    }));
    await storage.saveWorkspaceOptions(workspaceId, 'sessionTypes', payload);
  };

  const filteredDocuments = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    return documents.filter((doc) => {
      if (activeSection !== 'all' && String(doc?.section || '') !== activeSection) return false;
      if (!query) return true;
      const searchable = [doc?.title, doc?.court, doc?.notes, doc?.sessionDate, doc?.judgmentDate]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return searchable.includes(query);
    });
  }, [activeSection, documents, searchText]);

  const rollsByMonth = useMemo(() => {
    const rolls = filteredDocuments.filter((d) => d.section === 'session_rolls');
    const groups = new Map();
    rolls.forEach((roll) => {
      const date = roll.sessionDate || roll.uploadDate || '';
      const [y, m] = String(date).split('-');
      const key = y && m ? `${y}-${m}` : 'غير محدد';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(roll);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, rollsList]) => ({
        key,
        label: key === 'غير محدد'
          ? 'غير محدد'
          : (() => {
            const [y, m] = key.split('-');
            return new Date(Number(y), Number(m) - 1).toLocaleDateString('ar-EG', {
              month: 'long',
              year: 'numeric',
            });
          })(),
        rolls: rollsList.sort((a, b) => String(b.sessionDate || '').localeCompare(String(a.sessionDate || ''))),
      }));
  }, [filteredDocuments]);

  const judgmentRollsByMonth = useMemo(() => {
    const rolls = filteredDocuments.filter((d) => d.section === 'judgment_rolls');
    const groups = new Map();
    rolls.forEach((roll) => {
      const date = roll.judgmentDate || roll.uploadDate || '';
      const [y, m] = String(date).split('-');
      const key = y && m ? `${y}-${m}` : 'غير محدد';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(roll);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, rollsList]) => ({
        key,
        label: key === 'غير محدد'
          ? 'غير محدد'
          : (() => {
            const [y, m] = key.split('-');
            return new Date(Number(y), Number(m) - 1).toLocaleDateString('ar-EG', {
              month: 'long',
              year: 'numeric',
            });
          })(),
        rolls: rollsList.sort((a, b) => String(b.judgmentDate || '').localeCompare(String(a.judgmentDate || ''))),
      }));
  }, [filteredDocuments]);

  const handleCreateSessionRoll = async () => {
    if (!workspaceId) return;
    if (!rollForm.sessionDate || !rollForm.fileUrl) {
      alert('تاريخ الجلسة ورابط الملف مطلوبان');
      return;
    }

    await storage.createArchiveDocument(workspaceId, {
      ...rollForm,
      uploadDate: new Date().toISOString().split('T')[0],
      linkedSessionDate: rollForm.sessionDate,
      createdAt: new Date().toISOString(),
    });

    setRollForm({
      title: '',
      sessionDate: '',
      sessionType: '',
      court: '',
      fileUrl: '',
      notes: '',
      section: 'session_rolls',
    });
    setShowSessionRollForm(false);

    await loadDocuments();
    alert('تم رفع الرول بنجاح ✅');
  };

  const handleCreateJudgmentRoll = async () => {
    if (!workspaceId) return;
    if (!judgmentRollForm.judgmentDate || !judgmentRollForm.fileUrl) {
      alert('تاريخ الحكم ورابط الملف مطلوبان');
      return;
    }

    await storage.createArchiveDocument(workspaceId, {
      ...judgmentRollForm,
      uploadDate: new Date().toISOString().split('T')[0],
      linkedJudgmentDate: judgmentRollForm.judgmentDate,
      createdAt: new Date().toISOString(),
    });

    setJudgmentRollForm({
      title: '',
      judgmentDate: '',
      judgmentType: '',
      linkedCaseId: '',
      court: '',
      fileUrl: '',
      notes: '',
      section: 'judgment_rolls',
    });
    setShowJudgmentRollForm(false);

    await loadDocuments();
    alert('تم رفع رول الحكم بنجاح ✅');
  };

  const handleCreateGeneralDocument = async () => {
    if (!workspaceId) return;
    if (!generalForm.title || !generalForm.fileUrl) {
      alert('عنوان الوثيقة ورابط الملف مطلوبان');
      return;
    }

    await storage.createArchiveDocument(workspaceId, {
      ...generalForm,
      uploadDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });

    setGeneralForm({ title: '', section: activeSection === 'custom' ? 'custom' : 'circulars', fileUrl: '', notes: '' });
    setShowGeneralForm(false);
    await loadDocuments();
    alert('تم رفع الوثيقة بنجاح ✅');
  };

  const openEditModal = (doc) => {
    if (!doc) return;
    setEditingDoc(doc);
    setEditForm({
      title: doc.title || '',
      fileUrl: doc.fileUrl || '',
      notes: doc.notes || '',
      court: doc.court || '',
      sessionDate: doc.sessionDate || '',
      sessionType: doc.sessionType || '',
      judgmentDate: doc.judgmentDate || '',
      judgmentType: doc.judgmentType || '',
      linkedCaseId: doc.linkedCaseId || '',
    });
  };

  const saveEditModal = async () => {
    if (!workspaceId || !editingDoc?.id) return;
    if (!editForm.fileUrl.trim()) {
      alert('رابط الملف مطلوب');
      return;
    }

    const updates = {
      title: editForm.title,
      fileUrl: editForm.fileUrl,
      notes: editForm.notes,
      court: editForm.court,
    };

    if (editingDoc.section === 'session_rolls') {
      updates.sessionDate = editForm.sessionDate;
      updates.linkedSessionDate = editForm.sessionDate;
      updates.sessionType = editForm.sessionType;
    }

    if (editingDoc.section === 'judgment_rolls') {
      updates.judgmentDate = editForm.judgmentDate;
      updates.linkedJudgmentDate = editForm.judgmentDate;
      updates.judgmentType = editForm.judgmentType;
      updates.linkedCaseId = editForm.linkedCaseId;
    }

    await storage.updateArchiveDocument(workspaceId, editingDoc.id, updates);
    setEditingDoc(null);
    await loadDocuments();
    alert('تم تحديث المرفق بنجاح ✅');
  };

  if (!workspaceId) {
    return <div style={{ padding: 20, textAlign: 'center' }}>لا توجد مساحة عمل محددة</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="page-header">
        <h1 className="page-title">أرشيف الرولات</h1>
        <input
          className="form-input"
          style={{ width: 260 }}
          placeholder="بحث في الأرشيف..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="filter-chips" style={{ marginBottom: 0 }}>
        {ARCHIVE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`filter-chip ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => {
              setActiveSection(section.id);
              if (section.id === 'custom' || section.id === 'circulars') {
                setGeneralForm((prev) => ({ ...prev, section: section.id }));
              }
            }}
          >
            {section.icon} {section.label}
          </button>
        ))}
      </div>

      {loading && <div className="card" style={{ textAlign: 'center' }}>جاري تحميل الأرشيف...</div>}
      {error && <div className="card" style={{ color: '#b91c1c', textAlign: 'center' }}>حدث خطأ أثناء تحميل الأرشيف</div>}

      {activeSection === 'session_rolls' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>📅 رولات الجلسات</h3>
            <button className="btn-primary" onClick={() => setShowSessionRollForm((s) => !s)}>
              {showSessionRollForm ? 'إغلاق الإضافة' : '+ إضافة رول جلسة'}
            </button>
          </div>

          {showSessionRollForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>📤 رفع رول جلسة</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">تاريخ الجلسة *</label>
                <input
                  type="date"
                  className="form-input"
                  value={rollForm.sessionDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    const [y, m, d] = date.split('-');
                    const dateDisplay = d ? `${d}/${m}/${y}` : date;
                    setRollForm((f) => ({
                      ...f,
                      sessionDate: date,
                      title: f.title || `رول جلسة ${dateDisplay}`,
                    }));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">المحكمة / الدائرة</label>
                <input
                  className="form-input"
                  value={rollForm.court}
                  onChange={(e) => setRollForm((f) => ({ ...f, court: e.target.value }))}
                  placeholder="مثال: الدائرة الأولى إدارية..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم الرول</label>
                <input
                  className="form-input"
                  value={rollForm.title}
                  onChange={(e) => setRollForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: رول جلسة 08/04/2026"
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>نوع الجلسة</label>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setShowSessionTypeManager(true)}
                  >
                    + تعديل الاختيارات
                  </button>
                </div>
                <select
                  className="form-input"
                  value={rollForm.sessionType}
                  onChange={(e) => setRollForm((f) => ({ ...f, sessionType: e.target.value }))}
                >
                  <option value="">اختر النوع...</option>
                  {sessionTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">رابط الملف (Google Drive) *</label>
                <input
                  className="form-input"
                  value={rollForm.fileUrl}
                  onChange={(e) => setRollForm((f) => ({ ...f, fileUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/..."
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  افتح الملف في Drive ← مشاركة ← نسخ الرابط ← الصقه هنا
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={rollForm.notes}
                  onChange={(e) => setRollForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              </div>

              <button className="btn-primary" style={{ marginTop: 8 }} onClick={handleCreateSessionRoll}>📤 رفع الرول</button>
            </div>
          )}

          {rollsByMonth.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد رولات جلسات بعد</div>
          ) : (
            rollsByMonth.map((group) => (
              <div key={group.key} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    background: 'var(--bg-page)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>📅 {group.label}</span>
                  <span>{group.rolls.length} رول</span>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {group.rolls.map((roll) => {
                    const [y, m, d] = String(roll.sessionDate || roll.uploadDate || '').split('-');
                    return (
                      <div
                        key={roll.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          borderRight: '3px solid var(--primary)',
                        }}
                      >
                        <div
                          style={{
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 10px',
                            textAlign: 'center',
                            minWidth: 56,
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d || '—'}</div>
                          <div style={{ fontSize: 10 }}>
                            {m ? new Date(0, Number(m) - 1).toLocaleDateString('ar-EG', { month: 'short' }) : ''}
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{roll.title || 'رول جلسة'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {roll.court && `${roll.court} · `}
                            {mapSessionTypeLabel(roll.sessionType)}
                          </div>
                          {roll.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{roll.notes}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => window.open(roll.fileUrl, '_blank')} className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                            📄 فتح الرول
                          </button>
                          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => openEditModal(roll)}>
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={async () => {
                              const proceed = await confirmDialog('حذف هذا الرول؟', {
                                title: 'تأكيد الحذف',
                                confirmLabel: 'حذف',
                                cancelLabel: 'إلغاء',
                                danger: true,
                              });
                              if (!proceed) return;
                              await storage.deleteArchiveDocument(workspaceId, roll.id);
                              await loadDocuments();
                            }}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 10px',
                              cursor: 'pointer',
                              color: '#dc2626',
                              fontSize: 12,
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {showSessionTypeManager && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.38)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(540px, 100%)',
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: 18,
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>إدارة اختيارات نوع الجلسة</h3>
              <button
                type="button"
                onClick={() => setShowSessionTypeManager(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="form-input"
                placeholder="إضافة نوع جلسة جديد..."
                value={newSessionType}
                onChange={(e) => setNewSessionType(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== 'Enter') return;
                  const value = String(newSessionType || '').trim();
                  if (!value || sessionTypeOptions.includes(value)) return;
                  await saveSessionTypeOptions([...sessionTypeOptions, value]);
                  setNewSessionType('');
                }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: 12, padding: '8px 12px', whiteSpace: 'nowrap' }}
                onClick={async () => {
                  const value = String(newSessionType || '').trim();
                  if (!value || sessionTypeOptions.includes(value)) return;
                  await saveSessionTypeOptions([...sessionTypeOptions, value]);
                  setNewSessionType('');
                }}
              >
                + إضافة
              </button>
            </div>

            <div style={{ display: 'grid', gap: 6, maxHeight: '42vh', overflowY: 'auto' }}>
              {sessionTypeOptions.map((option) => (
                <div
                  key={option}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    background: 'var(--bg-page)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{option}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = sessionTypeOptions.filter((item) => item !== option);
                      if (next.length === 0) return;
                      await saveSessionTypeOptions(next);
                      setRollForm((f) => (f.sessionType === option ? { ...f, sessionType: '' } : f));
                    }}
                    style={{
                      background: '#fee2e2',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 9px',
                      cursor: 'pointer',
                      color: '#dc2626',
                      fontSize: 12,
                    }}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              * هذه الاختيارات تُستخدم في حقل "نوع الجلسة" داخل رفع رول جلسة.
            </div>
          </div>
        </div>
      )}

      {activeSection === 'judgment_rolls' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>⚖️ رولات الأحكام</h3>
            <button className="btn-primary" onClick={() => setShowJudgmentRollForm((s) => !s)}>
              {showJudgmentRollForm ? 'إغلاق الإضافة' : '+ إضافة رول حكم'}
            </button>
          </div>

          {showJudgmentRollForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>📤 رفع رول حكم</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">تاريخ الحكم *</label>
                <input
                  type="date"
                  className="form-input"
                  value={judgmentRollForm.judgmentDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    const [y, m, d] = date.split('-');
                    const dateDisplay = d ? `${d}/${m}/${y}` : date;
                    setJudgmentRollForm((f) => ({
                      ...f,
                      judgmentDate: date,
                      title: f.title || `رول أحكام ${dateDisplay}`,
                    }));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">نوع الحكم</label>
                <select
                  className="form-input"
                  value={judgmentRollForm.judgmentType}
                  onChange={(e) => setJudgmentRollForm((f) => ({ ...f, judgmentType: e.target.value }))}
                >
                  <option value="">اختر النوع...</option>
                  <option value="reserved">محجوزة للحكم</option>
                  <option value="pronounced">نطق حكم</option>
                  <option value="postponed">تأجيل حكم</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المحكمة / الدائرة</label>
                <input
                  className="form-input"
                  value={judgmentRollForm.court}
                  onChange={(e) => setJudgmentRollForm((f) => ({ ...f, court: e.target.value }))}
                  placeholder="اسم المحكمة أو الدائرة"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Linked Case ID</label>
                <input
                  className="form-input"
                  value={judgmentRollForm.linkedCaseId}
                  onChange={(e) => setJudgmentRollForm((f) => ({ ...f, linkedCaseId: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">رابط الملف (Google Drive) *</label>
                <input
                  className="form-input"
                  value={judgmentRollForm.fileUrl}
                  onChange={(e) => setJudgmentRollForm((f) => ({ ...f, fileUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={judgmentRollForm.notes}
                  onChange={(e) => setJudgmentRollForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              </div>
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={handleCreateJudgmentRoll}>📤 رفع رول الأحكام</button>
            </div>
          )}

          {judgmentRollsByMonth.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد رولات أحكام بعد</div>
          ) : (
            judgmentRollsByMonth.map((group) => (
              <div key={group.key} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 12px', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>⚖️ {group.label}</span>
                  <span>{group.rolls.length} رول</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {group.rolls.map((roll) => (
                    <div key={roll.id} className="card" style={{ borderRight: '3px solid #7c3aed', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{roll.title || 'رول حكم'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {formatDisplayDate(roll.judgmentDate || roll.uploadDate)}
                            {roll.court ? ` · ${roll.court}` : ''}
                            {roll.judgmentType ? ` · ${mapJudgmentTypeLabel(roll.judgmentType)}` : ''}
                          </div>
                          {roll.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{roll.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => window.open(roll.fileUrl, '_blank')} className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>📄 فتح الرول</button>
                          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => openEditModal(roll)}>
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={async () => {
                              const proceed = await confirmDialog('حذف هذا الرول؟', {
                                title: 'تأكيد الحذف',
                                confirmLabel: 'حذف',
                                cancelLabel: 'إلغاء',
                                danger: true,
                              });
                              if (!proceed) return;
                              await storage.deleteArchiveDocument(workspaceId, roll.id);
                              await loadDocuments();
                            }}
                            style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {(activeSection === 'circulars' || activeSection === 'custom') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>📑 وثائق القسم</h3>
            <button className="btn-primary" onClick={() => setShowGeneralForm((s) => !s)}>
              {showGeneralForm ? 'إغلاق الإضافة' : '+ إضافة مرفق'}
            </button>
          </div>

          {showGeneralForm && (
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>📤 رفع وثيقة</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">العنوان *</label>
                  <input className="form-input" value={generalForm.title} onChange={(e) => setGeneralForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">رابط الملف *</label>
                  <input className="form-input" value={generalForm.fileUrl} onChange={(e) => setGeneralForm((f) => ({ ...f, fileUrl: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <textarea className="form-input" rows={2} value={generalForm.notes} onChange={(e) => setGeneralForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <button className="btn-primary" onClick={handleCreateGeneralDocument}>📤 رفع الوثيقة</button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {filteredDocuments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد وثائق في هذا القسم</div>
            ) : (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{doc.title || 'وثيقة'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDisplayDate(doc.uploadDate)}</div>
                    {doc.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" onClick={() => window.open(doc.fileUrl, '_blank')}>فتح</button>
                    <button className="btn-secondary" onClick={() => openEditModal(doc)}>✏️ تعديل</button>
                    <button
                      onClick={async () => {
                        const proceed = await confirmDialog('حذف هذه الوثيقة؟', {
                          title: 'تأكيد الحذف',
                          confirmLabel: 'حذف',
                          cancelLabel: 'إلغاء',
                          danger: true,
                        });
                        if (!proceed) return;
                        await storage.deleteArchiveDocument(workspaceId, doc.id);
                        await loadDocuments();
                      }}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeSection === 'all' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>رولات الجلسات</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{documents.filter((d) => d.section === 'session_rolls').length}</div>
            </div>
            <div style={{ background: '#faf5ff', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>رولات الأحكام</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>{documents.filter((d) => d.section === 'judgment_rolls').length}</div>
            </div>
            <div style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>إجمالي الوثائق</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{documents.length}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>آخر الملفات المرفوعة</div>
            {documents.slice(0, 8).map((doc) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.title || 'وثيقة'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDisplayDate(doc.uploadDate)}</div>
                </div>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => window.open(doc.fileUrl, '_blank')}>
                  فتح
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.38)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="card" style={{ width: 'min(680px, 100%)', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>✏️ تعديل المرفق</h3>
              <button type="button" onClick={() => setEditingDoc(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">العنوان</label>
                <input className="form-input" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </div>

              {(editingDoc.section === 'session_rolls' || editingDoc.section === 'judgment_rolls') && (
                <div className="form-group">
                  <label className="form-label">المحكمة / الدائرة</label>
                  <input className="form-input" value={editForm.court} onChange={(e) => setEditForm((f) => ({ ...f, court: e.target.value }))} />
                </div>
              )}

              {editingDoc.section === 'session_rolls' && (
                <>
                  <div className="form-group">
                    <label className="form-label">تاريخ الجلسة</label>
                    <input type="date" className="form-input" value={editForm.sessionDate} onChange={(e) => setEditForm((f) => ({ ...f, sessionDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع الجلسة</label>
                    <select className="form-input" value={editForm.sessionType} onChange={(e) => setEditForm((f) => ({ ...f, sessionType: e.target.value }))}>
                      <option value="">اختر النوع...</option>
                      {sessionTypeOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editingDoc.section === 'judgment_rolls' && (
                <>
                  <div className="form-group">
                    <label className="form-label">تاريخ الحكم</label>
                    <input type="date" className="form-input" value={editForm.judgmentDate} onChange={(e) => setEditForm((f) => ({ ...f, judgmentDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع الحكم</label>
                    <select className="form-input" value={editForm.judgmentType} onChange={(e) => setEditForm((f) => ({ ...f, judgmentType: e.target.value }))}>
                      <option value="">اختر النوع...</option>
                      <option value="reserved">محجوزة للحكم</option>
                      <option value="pronounced">نطق حكم</option>
                      <option value="postponed">تأجيل حكم</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Linked Case ID</label>
                    <input className="form-input" value={editForm.linkedCaseId} onChange={(e) => setEditForm((f) => ({ ...f, linkedCaseId: e.target.value }))} />
                  </div>
                </>
              )}

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">رابط الملف *</label>
                <input className="form-input" value={editForm.fileUrl} onChange={(e) => setEditForm((f) => ({ ...f, fileUrl: e.target.value }))} />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-secondary" onClick={() => setEditingDoc(null)}>إلغاء</button>
              <button className="btn-primary" onClick={saveEditModal}>💾 حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
