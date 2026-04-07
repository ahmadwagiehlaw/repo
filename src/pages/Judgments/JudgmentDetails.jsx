import DateDisplay from '@/components/common/DateDisplay.jsx';

export default function JudgmentDetails({
  judgment,
  typeConfig,
  urgency,
  isPlaintiff,
  dateDisplayOptions,
  onDateClick,
  onOpenAttachment,
}) {
  const pronouncementPreview = judgment.judgmentPronouncement
    ? `${String(judgment.judgmentPronouncement).slice(0, 180)}${String(judgment.judgmentPronouncement).length > 180 ? '...' : ''}`
    : '';
  const categoryLabel = judgment.judgmentCategory === judgment.judgmentType && typeConfig?.label
    ? typeConfig.label
    : judgment.judgmentCategory;

  return (
    <div
      style={{
        padding: '10px 14px',
        background: typeConfig?.bg || 'var(--bg-page)',
        borderRadius: 'var(--radius-sm)',
        borderRight: `3px solid ${typeConfig?.color || 'var(--border)'}`,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span
            style={{
              background: typeConfig?.color || '#6b7280',
              color: 'white',
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              marginLeft: 8,
            }}
          >
            {typeConfig?.label || judgment.judgmentType}
          </span>

          <span
            style={{
              fontSize: 11,
              color: judgment.isFinal ? '#16a34a' : '#d97706',
              background: judgment.isFinal ? '#dcfce7' : '#fef3c7',
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            {judgment.isFinal ? 'نهائي' : 'تمهيدي'}
          </span>
        </div>

        <span
          style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline dotted' }}
          title="اضغط للبحث عن رول الجلسة"
          onClick={() => onDateClick(judgment.judgmentDate)}
        >
          <DateDisplay value={judgment.judgmentDate} options={dateDisplayOptions} />
        </span>
      </div>

      {judgment.summaryDecision && (
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          <strong>{judgment.summaryDecision}</strong>
        </div>
      )}

      {judgment.judgmentSummary && judgment.judgmentSummary !== judgment.summaryDecision && (
        <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {judgment.judgmentSummary}
        </div>
      )}

      {(judgment.judgmentCategory || judgment.originSessionType || judgment.originSessionDate) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {categoryLabel && (
            <span style={{ background: 'rgba(255,255,255,0.55)', padding: '2px 8px', borderRadius: 12 }}>
              التصنيف: {categoryLabel}
            </span>
          )}
          {(judgment.originSessionType || judgment.originSessionDate) && (
            <span style={{ background: 'rgba(255,255,255,0.55)', padding: '2px 8px', borderRadius: 12 }}>
              جلسة المنشأ: {judgment.originSessionType || '—'}
              {judgment.originSessionDate ? ` — ${judgment.originSessionDate}` : ''}
            </span>
          )}
        </div>
      )}

      {pronouncementPreview && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.45)',
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          {pronouncementPreview}
        </div>
      )}

      {isPlaintiff && urgency && (
        <div
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: urgency.bg,
            color: urgency.color,
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ميعاد الطعن: {urgency.label}
          <span style={{ fontWeight: 400, fontSize: 11 }}>
            (<DateDisplay value={judgment.appealDeadlineDate} options={dateDisplayOptions} />)
          </span>
        </div>
      )}

      {judgment.attachmentUrl && (
        <button
          type="button"
          onClick={() => onOpenAttachment(judgment.attachmentUrl)}
          style={{
            marginTop: 6,
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '3px 10px',
            cursor: 'pointer',
            fontFamily: 'Cairo',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          مرفق الحكم
        </button>
      )}

      {!judgment.isFinal && judgment.nextAction && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
          ← {judgment.nextAction}
        </div>
      )}
    </div>
  );
}
