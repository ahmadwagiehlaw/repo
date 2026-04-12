import { useState } from 'react';
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
  onEditJudgment,
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

  const [expandedCases, setExpandedCases] = useState(new Set());
  const [isCompactMode, setIsCompactMode] = useState(true);

  const toggleExpand = (caseId) => {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const getPronouncementPreview = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.length > 90 ? `${text.slice(0, 90)}...` : text;
  };

  if (viewMode === 'cards') {
    return (
      <>
        {/* Global Actions Bar for Cards */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            عرض {pagedCases.length} قضية
          </div>
          <button
            type="button"
            onClick={() => setIsCompactMode(!isCompactMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isCompactMode ? 'var(--bg-page)' : 'var(--primary)',
              border: `1px solid ${isCompactMode ? 'var(--border)' : 'var(--primary)'}`,
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              color: isCompactMode ? 'var(--text-primary)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontFamily: 'Cairo',
            }}
          >
            {isCompactMode ? '⏬ عرض التفاصيل الكاملة' : '⏫ طي جميع الكروت'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px', alignItems: 'start' }}>
          {pagedCases.map((caseItem) => {
          const caseJudgments = (judgmentsByCaseId.get(String(caseItem.id || '')) || [])
            .slice()
            .sort((a, b) => new Date(b.judgmentDate || 0) - new Date(a.judgmentDate || 0));
          const hasLegacyJudgment = Boolean(
            String(caseItem.summaryDecision || '').trim()
              || String(caseItem.judgmentPronouncement || '').trim()
              || String(caseItem.judgmentCategory || caseItem.judgmentType || '').trim()
          );
          if (caseJudgments.length === 0 && hasLegacyJudgment) {
            // يحافظ على الأحكام المستوردة قديمًا قبل إنشاء subcollection للأحكام.
            caseJudgments.push({
              id: `legacy_${caseItem.id}`,
              judgmentDate: caseItem.lastSessionDate || '',
              judgmentType: caseItem.judgmentType || caseItem.judgmentCategory || 'other',
              summaryDecision: caseItem.summaryDecision,
              judgmentCategory: caseItem.judgmentCategory || caseItem.judgmentType || 'other',
              judgmentPronouncement: caseItem.judgmentPronouncement,
              isFinal: true,
              isLegacy: true,
            });
          }
          const isPlaintiff = isPlaintiffForCase(caseItem);
          const form = getFormState(caseItem);
          const isExpanded = expandedCases.has(caseItem.id);
          const visibleJudgments = isCompactMode ? caseJudgments.slice(0, 1) : (isExpanded ? caseJudgments : caseJudgments.slice(0, 1));
          const hiddenCount = caseJudgments.length - 1;

          return (
            <div
              key={caseItem.id}
              className="card"
              style={{
                marginBottom: 2,
                padding: 0,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', padding: '16px 18px 12px', borderBottom: '1px solid var(--border-light)', background: 'white', gap: 12 }}>
                <div style={{ flex: 1, paddingRight: '8px', minWidth: 0 }}>
                  {/* Row 1: Case Number */}
                  <div style={{ marginBottom: '8px' }}>
                    <CaseNumberBadge
                      caseNumber={caseItem.caseNumber}
                      caseYear={caseItem.caseYear}
                      caseData={caseItem}
                      variant="pill"
                      displayOrder={caseNumberDisplayOrder}
                      style={{ fontSize: '13px', background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}
                    />
                  </div>

                  {/* Row 2: Parties */}
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: '1.5' }}>
                    <span style={{ color: isPlaintiff ? '#2563eb' : 'inherit' }}>{caseItem.plaintiffName || '—'}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 8px', fontSize: '12px', fontWeight: 500 }}>ضد</span>
                    <span>{caseItem.defendantName || '—'}</span>
                  </div>

                  {/* Row 3: Court */}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>🏛️ {caseItem.court || '—'}</span>
                    {caseItem.circuit && <span>(دائرة {caseItem.circuit})</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', justifyContent: 'center', borderRadius: '6px' }}
                    onClick={() => onOpenCase(caseItem.id)}
                  >
                    👁️ فتح القضية
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px', justifyContent: 'center', borderRadius: '6px' }}
                    onClick={() => onStartAddJudgment(caseItem.id)}
                  >
                    + إضافة حكم
                  </button>
                </div>
              </div>

              {/* Timeline Container للأحكام المتعددة */}
              <div style={{ display: 'grid', gap: 8, marginTop: 12, padding: '16px 18px', background: '#fbfdff' }}>
                {caseJudgments.length === 0 ? (
                  <div style={{ padding: '16px', background: 'var(--bg-page)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    ⚖️ محجوزة للحكم — في انتظار النطق بالحكم
                    {caseItem.nextSessionDate && (
                      <div style={{ marginTop: 8, color: 'var(--primary)', fontWeight: 700 }}>
                        موعد الجلسة: <DateDisplay value={caseItem.nextSessionDate} options={dateDisplayOptions} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="judgments-timeline"
                    style={{
                      borderRight: '2px solid var(--border)',
                      paddingRight: 16,
                      marginRight: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {visibleJudgments.map((judgment, index) => (
                      <JudgmentDetails
                        key={judgment.id || index}
                        judgment={judgment}
                        isLatest={index === 0}
                        typeConfig={getTypeConfig(judgment.judgmentType)}
                        urgency={getDeadlineUrgency(judgment.appealDeadlineDate)}
                        isPlaintiff={isPlaintiff}
                        isCompact={isCompactMode}
                        dateDisplayOptions={dateDisplayOptions}
                        onDateClick={onDateClick}
                        onOpenAttachment={onOpenAttachment}
                        onEdit={() => onEditJudgment?.(caseItem, judgment)}
                      />
                    ))}
                  </div>
                )}
                {!isCompactMode && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(caseItem.id)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '8px',
                      background: 'var(--bg-page-alt)',
                      border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'Cairo',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-page-alt)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {isExpanded ? '⬆️ طي السجل التاريخي' : `⬇️ عرض السجل السابق (${hiddenCount} أحكام سابقة)`}
                  </button>
                )}
              </div>

              {/* شريط الإجراءات الذكي (Smart Action Bar) */}
              {!isCompactMode && (
                <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', background: 'white', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
                    onClick={() => onStartAddJudgment(caseItem.id)}
                  >
                    + إضافة حكم جديد
                  </button>
                  {(caseJudgments.length === 0 || !caseJudgments[0]?.isFinal) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
                      onClick={() => onReturnToSessions(caseItem)}
                    >
                      ↺ إعادة للمرافعة
                    </button>
                  )}
                  {caseJudgments.some((judgment) => !judgment.isFinal) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
                      onClick={() => onSendToChamber(caseItem)}
                    >
                      📂 إرسال للشعبة
                    </button>
                  )}
                </div>
              )}

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
      </>
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
                  {!merged.isFinal ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => onReturnToSessions(merged)}
                    >
                      إعادة للمرافعة
                    </button>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
