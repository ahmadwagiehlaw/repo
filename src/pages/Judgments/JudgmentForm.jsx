export default function JudgmentForm({
  caseItem,
  form,
  judgmentTypes,
  workspaceSettings,
  executionStatusLabels,
  nextActionOptions,
  onJudgmentDateChange,
  onJudgmentTypeChange,
  onFieldChange,
  onSave,
  onCancel,
}) {
  void workspaceSettings;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 18,
        background: 'white',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}
    >
      <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>تسجيل حكم جديد</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {/* طبيعة الحكم تتحكم في مسار القضية: التمهيدي يعود للجلسات، والنهائي يفتح متابعة الطعن. */}
        <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
          <label className="form-label">طبيعة الحكم</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {[
              { value: false, label: 'تمهيدي', desc: 'نقطة عبور: يمكن إعادة الدعوى للمرافعة.' },
              { value: true, label: 'نهائي', desc: 'يغلق المسار ويفتح متابعة ميعاد الطعن عند اللزوم.' },
            ].map((option) => {
              const active = Boolean(form.isFinal) === option.value;
              return (
                <label
                  key={option.label}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    background: active ? 'var(--primary-light)' : 'var(--bg-page)',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name={`jFinal-${caseItem.id}`}
                      checked={active}
                      onChange={() => onFieldChange('isFinal', option.value)}
                    />
                    {option.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{option.desc}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">تاريخ جلسة الحكم</label>
          <input
            type="date"
            className="form-input"
            value={form.judgmentDate || ''}
            onChange={(e) => onJudgmentDateChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">نوع الحكم</label>
          <select
            className="form-input"
            value={form.judgmentType || ''}
            onChange={(e) => onJudgmentTypeChange(e.target.value)}
          >
            <option value="">اختر نوع الحكم...</option>
            {judgmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">الحكم المختصر</label>
          <input
            className="form-input"
            value={form.summaryDecision || ''}
            onChange={(e) => onFieldChange('summaryDecision', e.target.value)}
            placeholder="مثال: رفض الطعن، عدم قبول الدعوى، إلغاء القرار..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">تصنيف الحكم</label>
          <input
            className="form-input"
            value={form.judgmentCategory || ''}
            onChange={(e) => onFieldChange('judgmentCategory', e.target.value)}
            placeholder="يُملأ تلقائيًا من نوع الحكم ويمكن تعديله عند الحاجة"
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">وصف الحكم</label>
          <input
            className="form-input"
            value={form.judgmentSummary || ''}
            onChange={(e) => onFieldChange('judgmentSummary', e.target.value)}
            placeholder="مثال: رفض الطعن وتأييد القرار المطعون فيه..."
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">منطوق الحكم</label>
          <textarea
            className="form-input"
            rows={3}
            value={form.judgmentPronouncement || ''}
            onChange={(e) => onFieldChange('judgmentPronouncement', e.target.value)}
            placeholder="اكتب منطوق الحكم الكامل إن كان متاحًا..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">ميعاد الطعن</label>
          <input
            type="date"
            className="form-input"
            value={form.appealDeadlineDate || ''}
            onChange={(e) => onFieldChange('appealDeadlineDate', e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            يُحسب تلقائيًا عند اختيار نوع الحكم
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">نوع جلسة المنشأ</label>
          <input
            className="form-input"
            value={form.originSessionType || ''}
            onChange={(e) => onFieldChange('originSessionType', e.target.value)}
            placeholder="مثال: فحص، موضوع..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">تاريخ جلسة المنشأ</label>
          <input
            type="date"
            className="form-input"
            value={form.originSessionDate || ''}
            onChange={(e) => onFieldChange('originSessionDate', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">الإجراء التالي (للتمهيدي)</label>
          <input
            className="form-input"
            list={`next-action-opts-${caseItem.id}`}
            value={form.nextAction || ''}
            onChange={(e) => onFieldChange('nextAction', e.target.value)}
            placeholder="مثال: إرجاع للمرافعة، تقرير خبير..."
          />
          <datalist id={`next-action-opts-${caseItem.id}`}>
            {nextActionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">مرفق الحكم</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input"
              value={form.attachmentUrl || ''}
              onChange={(e) => onFieldChange('attachmentUrl', e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ flex: 1, minWidth: 180 }}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
              onClick={async () => {
                const { default: lfi } = await import('@/services/LocalFileIndex.js');
                const file = await lfi.pickFile('application/pdf,.doc,.docx,image/*');
                if (!file) return;
                const localId = `jdg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                const saved = await lfi.saveFile(localId, file);
                if (saved) {
                  onFieldChange('attachmentUrl', `local://${localId}`);
                  onFieldChange('attachmentLocalId', localId);
                  onFieldChange('attachmentName', file.name);
                }
              }}
            >
              📁 رفع محلي
            </button>
            {form.attachmentLocalId && (
              <span style={{ fontSize: 11, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                💾 {form.attachmentName || 'ملف محفوظ'}
                <button type="button"
                  onClick={() => {
                    onFieldChange('attachmentUrl', '');
                    onFieldChange('attachmentLocalId', '');
                    onFieldChange('attachmentName', '');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">حالة التنفيذ</label>
          <select
            className="form-input"
            value={form.executionStatus || 'pending'}
            onChange={(e) => onFieldChange('executionStatus', e.target.value)}
          >
            {Object.entries(executionStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">ملاحظات</label>
          <textarea
            className="form-input"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn-primary" onClick={onSave}>
          حفظ الحكم
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
