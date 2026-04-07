import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import JudgmentDetails from './JudgmentDetails.jsx';
import JudgmentForm from './JudgmentForm.jsx';

export default function JudgmentsList({
  viewMode,
  pagedCases,
  filteredTableJudgments,
  judgmentsByCaseId,
  judgmentTypes,
  workspaceSettings,
  tableEdits,
  editingCell,
  addingJudgment,
  getFormState,
  getTypeConfig,
  getDeadlineUrgency,
  isPlaintiffForCase,
  caseNumberDisplayOrder,
  dateDisplayOptions,
  defaultJudgmentType,
  nextActionOptions,
  executionStatusLabels,
  onOpenCase,
  onStartAddJudgment,
  onCancelAddJudgment,
  onDateClick,
  onOpenAttachment,
  onReturnToSessions,
  onSendToChamber,
  onJudgmentDateChange,
  onJudgmentTypeChange,
  onJudgmentFormFieldChange,
  onSaveJudgment,
  onSetEditingCell,
  onSetRowEdit,
  onSaveTableEdits,
  savingEdits,
  hasPendingTableEdits,
}) {
  void workspaceSettings;

  const getPronouncementPreview = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.length > 90 ? `${text.slice(0, 90)}...` : text;
  };

  if (viewMode === 'cards') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        {pagedCases.map((caseItem) => {
          const caseJudgments = (judgmentsByCaseId.get(String(caseItem.id || '')) || [])
            .slice()
            .sort((a, b) => new Date(b.judgmentDate || 0) - new Date(a.judgmentDate || 0));
          const isPlaintiff = isPlaintiffForCase(caseItem);
          const form = getFormState(caseItem);

          return (
            <div key={caseItem.id} className="card" style={{ marginBottom: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: 'var(--primary)', color: 'white', padding: '3px 12px', borderRadius: 20, fontWeight: 800, fontSize: 14 }}>
                      <CaseNumberBadge
                        caseNumber={caseItem.caseNumber}
                        caseYear={caseItem.caseYear}
                        caseData={caseItem}
                        variant="pill"
                        displayOrder={caseNumberDisplayOrder}
                        style={{ fontSize: 14 }}
                      />
                    </span>
                    {isPlaintiff && (
                      <span style={{ fontSize: 11, background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: 12 }}>
                        لصالح موكلنا
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {caseItem.plaintiffName || '—'} — {caseItem.court || '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => onOpenCase(caseItem.id)}
                  >
                    القضية
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => onStartAddJudgment(caseItem.id)}
                  >
                    + حكم
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {caseJudgments.length === 0 ? (
                  <div style={{ padding: '12px', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    محجوزة للحكم — لم يُسجل حكم بعد
                    {caseItem.nextSessionDate && (
                      <div style={{ marginTop: 4, color: 'var(--primary)', fontWeight: 600 }}>
                        جلسة الحكم: <DateDisplay value={caseItem.nextSessionDate} options={dateDisplayOptions} />
                      </div>
                    )}
                  </div>
                ) : (
                  caseJudgments.map((judgment, index) => (
                    <JudgmentDetails
                      key={judgment.id || index}
                      judgment={judgment}
                      typeConfig={getTypeConfig(judgment.judgmentType)}
                      urgency={getDeadlineUrgency(judgment.appealDeadlineDate)}
                      isPlaintiff={isPlaintiff}
                      dateDisplayOptions={dateDisplayOptions}
                      onDateClick={onDateClick}
                      onOpenAttachment={onOpenAttachment}
                    />
                  ))
                )}
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => onReturnToSessions(caseItem)}
                >
                  إعادة للمرافعة
                </button>
                {caseJudgments.some((judgment) => !judgment.isFinal) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={() => onSendToChamber(caseItem)}
                  >
                    إرسال للشعبة
                  </button>
                )}
              </div>

              {addingJudgment === caseItem.id && (
                <JudgmentForm
                  caseItem={caseItem}
                  form={form}
                  judgmentTypes={judgmentTypes}
                  workspaceSettings={workspaceSettings}
                  executionStatusLabels={executionStatusLabels}
                  nextActionOptions={nextActionOptions}
                  onJudgmentDateChange={(value) => onJudgmentDateChange(caseItem, form, value)}
                  onJudgmentTypeChange={(value) => onJudgmentTypeChange(caseItem, form, value)}
                  onFieldChange={(field, value) => onJudgmentFormFieldChange(caseItem.id, field, value)}
                  onSave={() => onSaveJudgment(caseItem)}
                  onCancel={onCancelAddJudgment}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>اضغط مرتين على الخانات القابلة للتعديل</div>
        <button
          type="button"
          className="btn-primary"
          onClick={onSaveTableEdits}
          disabled={savingEdits || !hasPendingTableEdits}
        >
          {savingEdits ? 'جاري الحفظ...' : 'حفظ تعديلات الجدول'}
        </button>
      </div>

      <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}>رقم الدعوى</th>
            <th style={{ width: 160 }}>المدعي</th>
            <th style={{ width: 130 }}>التصنيف</th>
            <th style={{ width: 220 }}>الحكم المختصر</th>
            <th style={{ width: 90 }}>نوع الحكم</th>
            <th style={{ width: 110 }}>تاريخ الحكم</th>
            <th style={{ width: 110 }}>ميعاد الطعن</th>
            <th style={{ width: 170 }}>الإجراء التالي</th>
            <th style={{ width: 80 }}>المرفق</th>
            <th style={{ width: 120 }}>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {filteredTableJudgments.map((judgment) => {
            const edit = tableEdits[judgment.id] || {};
            const merged = { ...judgment, ...edit };
            const typeConfig = judgmentTypes.find((type) => type.value === merged.judgmentType);
            const urgency = getDeadlineUrgency(merged.appealDeadlineDate);

            return (
              <tr key={judgment.id} style={{ background: typeConfig?.bg || 'white' }}>
                <td>
                  <span
                    onClick={() => onOpenCase(merged.caseId)}
                    style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 700 }}
                  >
                    <CaseNumberBadge
                      caseNumber={merged.caseNumber}
                      caseYear={merged.caseYear}
                      caseData={merged}
                      variant="inline"
                      displayOrder={caseNumberDisplayOrder}
                      style={{ color: 'var(--primary)', fontWeight: 700 }}
                    />
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{merged.plaintiffName || '—'}</td>
                <td onDoubleClick={() => onSetEditingCell({ id: judgment.id, field: 'judgmentType' })}>
                  {editingCell?.id === judgment.id && editingCell?.field === 'judgmentType' ? (
                    <select
                      className="form-input"
                      value={merged.judgmentType || defaultJudgmentType}
                      onChange={(e) => onSetRowEdit(judgment.id, 'judgmentType', e.target.value)}
                      onBlur={() => onSetEditingCell(null)}
                      autoFocus
                    >
                      {judgmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ background: typeConfig?.color || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                      {typeConfig?.label || merged.judgmentType || '—'}
                    </span>
                  )}
                </td>
                <td onDoubleClick={() => onSetEditingCell({ id: judgment.id, field: 'judgmentSummary' })} style={{ fontSize: 12 }}>
                  {editingCell?.id === judgment.id && editingCell?.field === 'judgmentSummary' ? (
                    <input
                      className="form-input"
                      value={merged.summaryDecision || ''}
                      onChange={(e) => onSetRowEdit(judgment.id, 'summaryDecision', e.target.value)}
                      onBlur={() => onSetEditingCell(null)}
                      autoFocus
                    />
                  ) : (
                    <div>
                      <div>{merged.summaryDecision || merged.judgmentSummary || '—'}</div>
                      {merged.judgmentPronouncement && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {getPronouncementPreview(merged.judgmentPronouncement)}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: 11, color: merged.isFinal ? '#16a34a' : '#d97706', background: merged.isFinal ? '#dcfce7' : '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
                    {merged.isFinal ? 'نهائي' : 'تمهيدي'}
                  </span>
                </td>
                <td onDoubleClick={() => onSetEditingCell({ id: judgment.id, field: 'judgmentDate' })} style={{ fontSize: 13 }}>
                  {editingCell?.id === judgment.id && editingCell?.field === 'judgmentDate' ? (
                    <input
                      type="date"
                      className="form-input"
                      value={merged.judgmentDate || ''}
                      onChange={(e) => onSetRowEdit(judgment.id, 'judgmentDate', e.target.value)}
                      onBlur={() => onSetEditingCell(null)}
                      autoFocus
                    />
                  ) : (
                    <DateDisplay value={merged.judgmentDate} options={dateDisplayOptions} />
                  )}
                </td>
                <td>
                  {urgency && merged.isPlaintiff ? (
                    <span style={{ background: urgency.bg, color: urgency.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {urgency.label}
                    </span>
                  ) : '—'}
                </td>
                <td onDoubleClick={() => onSetEditingCell({ id: judgment.id, field: 'nextAction' })} style={{ fontSize: 12 }}>
                  {editingCell?.id === judgment.id && editingCell?.field === 'nextAction' ? (
                    <input
                      className="form-input"
                      value={merged.nextAction || ''}
                      onChange={(e) => onSetRowEdit(judgment.id, 'nextAction', e.target.value)}
                      onBlur={() => onSetEditingCell(null)}
                      autoFocus
                    />
                  ) : (
                    <div>
                      <div>{merged.nextAction || '—'}</div>
                      {(merged.originSessionType || merged.originSessionDate) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {merged.originSessionType || 'جلسة منشأ'}
                          {merged.originSessionDate ? ` — ${merged.originSessionDate}` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {merged.attachmentUrl ? (
                    <button
                      type="button"
                      onClick={() => onOpenAttachment(merged.attachmentUrl)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                      title="فتح مرفق الحكم"
                    >
                      ▣
                    </button>
                  ) : '—'}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => onReturnToSessions(merged)}
                  >
                    إعادة للمرافعة
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
