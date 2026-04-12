import { useMemo, useState } from 'react';
import DateDisplay from '@/components/common/DateDisplay.jsx';

const CATEGORY_LABELS = {
  technical: 'إجراء فني',
  administrative: 'إجراء إداري',
};

const CATEGORY_STYLES = {
  technical: {
    border: '#1d4ed8',
    background: '#eff6ff',
    text: '#1e40af',
  },
  administrative: {
    border: '#92400e',
    background: '#fff7ed',
    text: '#9a3412',
  },
};

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function detectAttachmentKind(entry) {
  const source = String(entry?.url || entry?.title || '').toLowerCase();
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)($|\?)/.test(source)) return 'image';
  if (/(\.pdf)($|\?)/.test(source)) return 'pdf';
  if (/(\.doc|\.docx|\.rtf|\.odt)($|\?)/.test(source)) return 'word';
  return 'file';
}

function toOfficeViewerUrl(url) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}

function normalizeOptions(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];
}

function getCategoryOptions(procedureOptions, category) {
  const options = procedureOptions?.[category];
  return normalizeOptions(options);
}

export default function CaseProceduresTab({
  procedures = [],
  procedureOptions = { technical: [], administrative: [] },
  defaultSessionDate = '',
  dateDisplayOptions,
  onAddProcedure,
  onDeleteProcedure,
  onSaveProcedureOptions,
}) {
  const [showForm, setShowForm] = useState(false);
  const [showOptionsManager, setShowOptionsManager] = useState(false);
  const [draftTechnicalOptions, setDraftTechnicalOptions] = useState(() => normalizeOptions(procedureOptions?.technical));
  const [draftAdministrativeOptions, setDraftAdministrativeOptions] = useState(() => normalizeOptions(procedureOptions?.administrative));
  const [newTechnicalOption, setNewTechnicalOption] = useState('');
  const [newAdministrativeOption, setNewAdministrativeOption] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [proceduresFilter, setProceduresFilter] = useState('all');

  const [form, setForm] = useState({
    procedureCategory: 'technical',
    procedureType: getCategoryOptions(procedureOptions, 'technical')[0] || '',
    procedureNumber: '',
    procedureDescription: '',
    procedureDate: todayIso(),
    sessionDate: defaultSessionDate || todayIso(),
    notes: '',
    attachmentTitle: '',
    attachmentUrl: '',
    attachments: [],
  });

  const sortedProcedures = useMemo(() => {
    const list = Array.isArray(procedures) ? [...procedures] : [];
    return list.sort((a, b) => {
      const ad = String(a?.procedureDate || a?.date || '');
      const bd = String(b?.procedureDate || b?.date || '');
      if (ad !== bd) return bd.localeCompare(ad);
      return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
    });
  }, [procedures]);

  const filteredProcedures = useMemo(() => {
    if (proceduresFilter === 'all') return sortedProcedures;
    return sortedProcedures.filter((entry) => {
      const category = entry?.procedureCategory === 'technical' ? 'technical' : 'administrative';
      return category === proceduresFilter;
    });
  }, [sortedProcedures, proceduresFilter]);

  const technicalCount = useMemo(
    () => sortedProcedures.filter((entry) => entry?.procedureCategory === 'technical').length,
    [sortedProcedures]
  );
  const administrativeCount = useMemo(
    () => sortedProcedures.filter((entry) => entry?.procedureCategory !== 'technical').length,
    [sortedProcedures]
  );

  const resetForm = (category = 'technical') => {
    const categoryOptions = getCategoryOptions(procedureOptions, category);
    setForm({
      procedureCategory: category,
      procedureType: categoryOptions[0] || '',
      procedureNumber: '',
      procedureDescription: '',
      procedureDate: todayIso(),
      sessionDate: defaultSessionDate || todayIso(),
      notes: '',
      attachmentTitle: '',
      attachmentUrl: '',
      attachments: [],
    });
  };

  const openForm = (category) => {
    resetForm(category);
    setShowForm(true);
  };

  const addAttachmentToDraft = () => {
    const url = String(form.attachmentUrl || '').trim();
    const title = String(form.attachmentTitle || '').trim();
    if (!url) return;

    const next = {
      id: `proc_att_${Date.now()}`,
      title: title || 'مرفق الإجراء',
      url,
      kind: detectAttachmentKind({ url, title }),
      addedAt: new Date().toISOString(),
    };

    setForm((prev) => ({
      ...prev,
      attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), next],
      attachmentTitle: '',
      attachmentUrl: '',
    }));
  };

  const removeAttachmentFromDraft = (attachmentId) => {
    setForm((prev) => ({
      ...prev,
      attachments: (Array.isArray(prev.attachments) ? prev.attachments : []).filter((entry) => entry.id !== attachmentId),
    }));
  };

  const submitProcedure = async () => {
    const procedureCategory = String(form.procedureCategory || '').trim();
    const procedureType = String(form.procedureType || '').trim();
    const procedureDate = String(form.procedureDate || '').trim();
    if (!procedureCategory || !procedureType || !procedureDate) {
      alert('تصنيف الإجراء ونوعه وتاريخه مطلوبون');
      return;
    }

    try {
      setSaving(true);
      await onAddProcedure({
        procedureCategory,
        procedureType,
        procedureNumber: String(form.procedureNumber || '').trim(),
        procedureDescription: String(form.procedureDescription || '').trim(),
        procedureDate,
        sessionDate: String(form.sessionDate || '').trim(),
        notes: String(form.notes || '').trim(),
        attachments: Array.isArray(form.attachments) ? form.attachments : [],
      });
      resetForm(procedureCategory);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const openWord = (url) => {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return;
    try {
      window.location.href = `ms-word:ofe|u|${safeUrl}`;
    } catch {
      window.open(safeUrl, '_blank');
    }
  };

  const saveOptions = async () => {
    const technical = Array.from(new Set(normalizeOptions(draftTechnicalOptions)));
    const administrative = Array.from(new Set(normalizeOptions(draftAdministrativeOptions)));

    if (!technical.length || !administrative.length) {
      alert('يجب إدخال نوع واحد على الأقل لكل من الإجراءات الفنية والإدارية');
      return;
    }

    await onSaveProcedureOptions({ technical, administrative });
    setShowOptionsManager(false);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          style={{ background: '#1d4ed8', borderColor: '#1d4ed8' }}
          onClick={() => openForm('technical')}
        >
          + إضافة إجراء فني
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => openForm('administrative')}
        >
          + إضافة إجراء إداري
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setDraftTechnicalOptions(getCategoryOptions(procedureOptions, 'technical'));
            setDraftAdministrativeOptions(getCategoryOptions(procedureOptions, 'administrative'));
            setShowOptionsManager(true);
          }}
        >
          ⚙ إدارة الخيارات
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setProceduresFilter('all')}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            borderColor: proceduresFilter === 'all' ? '#334155' : undefined,
            background: proceduresFilter === 'all' ? '#334155' : undefined,
            color: proceduresFilter === 'all' ? 'white' : undefined,
          }}
        >
          الكل ({sortedProcedures.length})
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setProceduresFilter('technical')}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            borderColor: proceduresFilter === 'technical' ? '#1d4ed8' : '#bfdbfe',
            background: proceduresFilter === 'technical' ? '#1d4ed8' : '#eff6ff',
            color: proceduresFilter === 'technical' ? 'white' : '#1e40af',
          }}
        >
          فني ({technicalCount})
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setProceduresFilter('administrative')}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            borderColor: proceduresFilter === 'administrative' ? '#9a3412' : '#fed7aa',
            background: proceduresFilter === 'administrative' ? '#9a3412' : '#fff7ed',
            color: proceduresFilter === 'administrative' ? 'white' : '#9a3412',
          }}
        >
          إداري ({administrativeCount})
        </button>
      </div>

      {!filteredProcedures.length ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
          {sortedProcedures.length ? 'لا توجد إجراءات مطابقة للفلتر الحالي' : 'لا توجد إجراءات مسجلة'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredProcedures.map((procedure) => {
            const attachments = Array.isArray(procedure.attachments) ? procedure.attachments : [];
            const category = procedure?.procedureCategory === 'technical' ? 'technical' : 'administrative';
            const categoryStyle = CATEGORY_STYLES[category];
            return (
              <div
                key={procedure.id}
                style={{
                  border: `1px solid ${categoryStyle.border}`,
                  borderRadius: 'var(--radius-md)',
                  background: categoryStyle.background,
                  padding: 12,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'white',
                      color: categoryStyle.text,
                      border: `1px solid ${categoryStyle.border}`,
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {CATEGORY_LABELS[category]}
                    </span>

                    <span style={{
                      background: '#f8fafc',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {procedure.procedureType || 'إجراء'}
                    </span>

                    {procedure.procedureNumber ? (
                      <span style={{
                        background: 'white',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: 999,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        رقم الإجراء: {procedure.procedureNumber}
                      </span>
                    ) : null}

                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      تاريخ الإجراء: <DateDisplay value={procedure.procedureDate} options={dateDisplayOptions} />
                    </span>

                    {procedure.sessionDate ? (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        تاريخ الجلسة: <DateDisplay value={procedure.sessionDate} options={dateDisplayOptions} />
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onDeleteProcedure(procedure.id)}
                    style={{ padding: '4px 10px', fontSize: 12, color: '#b91c1c' }}
                  >
                    حذف
                  </button>
                </div>

                {procedure.procedureDescription ? (
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, lineHeight: 1.7 }}>
                    {procedure.procedureDescription}
                  </div>
                ) : null}

                {procedure.notes ? (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {procedure.notes}
                  </div>
                ) : null}

                {attachments.length ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>المرفقات</div>
                    {attachments.map((entry) => {
                      const kind = detectAttachmentKind(entry);
                      return (
                        <div
                          key={entry.id || entry.url}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{entry.title || 'مرفق'}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(kind === 'pdf' || kind === 'image' || kind === 'word') ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '2px 8px', fontSize: 12 }}
                                onClick={() => setPreviewAttachment({ ...entry, kind })}
                              >
                                معاينة
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '2px 8px', fontSize: 12 }}
                              onClick={() => window.open(entry.url, '_blank')}
                            >
                              فتح
                            </button>
                            {kind === 'word' ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '2px 8px', fontSize: 12 }}
                                onClick={() => openWord(entry.url)}
                              >
                                فتح في Word
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {showForm ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 14,
            width: 'min(760px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 20,
            display: 'grid',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {form.procedureCategory === 'technical' ? 'إجراء فني جديد' : 'إجراء إداري جديد'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">تصنيف الإجراء</label>
                <select
                  className="form-input"
                  value={form.procedureCategory}
                  onChange={(event) => {
                    const category = event.target.value === 'technical' ? 'technical' : 'administrative';
                    const categoryOptions = getCategoryOptions(procedureOptions, category);
                    setForm((prev) => ({ ...prev, procedureCategory: category, procedureType: categoryOptions[0] || '' }));
                  }}
                >
                  <option value="technical">إجراء فني</option>
                  <option value="administrative">إجراء إداري</option>
                </select>
              </div>

              <div>
                <label className="form-label">نوع الإجراء</label>
                <select
                  className="form-input"
                  value={form.procedureType}
                  onChange={(event) => setForm((prev) => ({ ...prev, procedureType: event.target.value }))}
                >
                  <option value="">اختر الإجراء</option>
                  {getCategoryOptions(procedureOptions, form.procedureCategory).map((entry) => (
                    <option key={`${form.procedureCategory}-${entry}`} value={entry}>{entry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">تاريخ الإجراء</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.procedureDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, procedureDate: event.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">تاريخ الجلسة</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.sessionDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, sessionDate: event.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              <div>
                <label className="form-label">رقم الإجراء (اختياري)</label>
                <input
                  className="form-input"
                  value={form.procedureNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, procedureNumber: event.target.value }))}
                  placeholder="مثال: 12/2026"
                />
              </div>

              <div>
                <label className="form-label">وصف الإجراء (اختياري)</label>
                <input
                  className="form-input"
                  value={form.procedureDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, procedureDescription: event.target.value }))}
                  placeholder="عنوان مختصر للإجراء"
                />
              </div>
            </div>

            <div>
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-input"
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="اكتب الإجراء الفني أو الإداري المتخذ..."
              />
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>مرفقات الإجراء</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="اسم المرفق"
                  value={form.attachmentTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, attachmentTitle: event.target.value }))}
                />
                <input
                  className="form-input"
                  placeholder="رابط المرفق (PDF / صورة / Drive)"
                  value={form.attachmentUrl && !form.attachmentUrl.startsWith('local://') ? form.attachmentUrl : ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, attachmentUrl: event.target.value }))}
                />
                <button type="button" className="btn-secondary" onClick={addAttachmentToDraft}>إضافة رابط</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 10px' }}
                  onClick={async () => {
                    const { default: lfi } = await import('@/services/LocalFileIndex.js');
                    const file = await lfi.pickFile('application/pdf,.doc,.docx,image/*');
                    if (!file) return;
                    const localId = `prc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                    const saved = await lfi.saveFile(localId, file);
                    if (!saved) { alert('فشل حفظ الملف'); return; }
                    const next = {
                      id: `proc_att_${Date.now()}`,
                      title: form.attachmentTitle || file.name,
                      url: '',
                      localId,
                      kind: 'local',
                      addedAt: new Date().toISOString(),
                    };
                    setForm((prev) => ({
                      ...prev,
                      attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), next],
                      attachmentTitle: '',
                      attachmentUrl: '',
                    }));
                  }}
                >
                  📁 رفع ملف محلي
                </button>
                {form.attachmentTitle && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>سيُستخدم "{form.attachmentTitle}" كاسم للملف</span>}
              </div>

              {(Array.isArray(form.attachments) && form.attachments.length > 0) ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {form.attachments.map((entry) => (
                    <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-page)', borderRadius: 8, padding: '6px 10px' }}>
                      <span style={{ fontSize: 12 }}>
                        {entry.localId ? '💾 ' : '🔗 '}{entry.title}
                      </span>
                      <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => removeAttachmentFromDraft(entry.id)}>حذف</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={submitProcedure} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الإجراء'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showOptionsManager ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 610,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 14,
            width: 'min(720px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 20,
            display: 'grid',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>إدارة خيارات الإجراء</h3>
              <button type="button" onClick={() => setShowOptionsManager(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            <div style={{ border: '1px solid #bfdbfe', borderRadius: 10, padding: 10, display: 'grid', gap: 8, background: '#eff6ff' }}>
              <div style={{ fontWeight: 700, color: '#1e40af' }}>الإجراءات الفنية</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {draftTechnicalOptions.map((entry, index) => (
                  <div key={`tech-${entry}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      className="form-input"
                      value={entry}
                      onChange={(event) => {
                        const next = [...draftTechnicalOptions];
                        next[index] = event.target.value;
                        setDraftTechnicalOptions(next);
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#b91c1c' }}
                      onClick={() => setDraftTechnicalOptions(draftTechnicalOptions.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  className="form-input"
                  value={newTechnicalOption}
                  placeholder="إضافة نوع إجراء فني"
                  onChange={(event) => setNewTechnicalOption(event.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const value = String(newTechnicalOption || '').trim();
                    if (!value) return;
                    setDraftTechnicalOptions([...draftTechnicalOptions, value]);
                    setNewTechnicalOption('');
                  }}
                >
                  إضافة
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid #fed7aa', borderRadius: 10, padding: 10, display: 'grid', gap: 8, background: '#fff7ed' }}>
              <div style={{ fontWeight: 700, color: '#9a3412' }}>الإجراءات الإدارية</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {draftAdministrativeOptions.map((entry, index) => (
                  <div key={`admin-${entry}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      className="form-input"
                      value={entry}
                      onChange={(event) => {
                        const next = [...draftAdministrativeOptions];
                        next[index] = event.target.value;
                        setDraftAdministrativeOptions(next);
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#b91c1c' }}
                      onClick={() => setDraftAdministrativeOptions(draftAdministrativeOptions.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  className="form-input"
                  value={newAdministrativeOption}
                  placeholder="إضافة نوع إجراء إداري"
                  onChange={(event) => setNewAdministrativeOption(event.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const value = String(newAdministrativeOption || '').trim();
                    if (!value) return;
                    setDraftAdministrativeOptions([...draftAdministrativeOptions, value]);
                    setNewAdministrativeOption('');
                  }}
                >
                  إضافة
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-primary" onClick={saveOptions} style={{ flex: 1 }}>حفظ الخيارات</button>
              <button type="button" className="btn-secondary" onClick={() => setShowOptionsManager(false)} style={{ flex: 1 }}>إلغاء</button>
            </div>
          </div>
        </div>
      ) : null}

      {previewAttachment ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 620,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 'min(980px, 100%)',
            height: 'min(88vh, 760px)',
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{previewAttachment.title || 'معاينة مرفق'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => window.open(previewAttachment.url, '_blank')}>فتح</button>
                {previewAttachment.kind === 'word' ? (
                  <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openWord(previewAttachment.url)}>فتح في Word</button>
                ) : null}
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPreviewAttachment(null)}>إغلاق</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc' }}>
              {previewAttachment.kind === 'image' ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                  <img src={previewAttachment.url} alt={previewAttachment.title || 'preview'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <iframe
                  title="preview"
                  src={previewAttachment.kind === 'word' ? toOfficeViewerUrl(previewAttachment.url) : previewAttachment.url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
