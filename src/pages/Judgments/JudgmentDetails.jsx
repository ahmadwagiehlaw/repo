import DateDisplay from '@/components/common/DateDisplay.jsx';

export default function JudgmentDetails({
  judgment,
  isLatest = false,
  isCompact = false,
  typeConfig,
  urgency,
  isPlaintiff,
  dateDisplayOptions,
  onDateClick,
  onOpenAttachment,
  onEdit,
}) {
  const getSemanticTheme = (judgmentType, summaryDecision) => {
    const semanticText = [
      judgmentType,
      typeConfig?.label,
      judgment?.judgmentCategory,
      summaryDecision,
      judgment?.judgmentPronouncement,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (semanticText.includes('ضدنا') || semanticText.includes('رفض') || semanticText.includes('against')) {
      return { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'خطر / ضدنا' };
    }

    if (semanticText.includes('لصالحنا') || semanticText.includes('قبول') || semanticText.includes('for_us')) {
      return { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', label: 'لصالحنا' };
    }

    if (semanticText.includes('وقف') || semanticText.includes('جزائي')) {
      return { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', label: 'وقف / تنبيه' };
    }

    if (!judgment?.isFinal) {
      return { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', label: 'تمهيدي' };
    }

    return {
      color: typeConfig?.color || '#64748b',
      bg: '#f8fafc',
      border: '#cbd5e1',
      label: typeConfig?.label || judgment?.judgmentCategory || 'حكم',
    };
  };

  const summaryDecision = judgment.summaryDecision || judgment.judgmentSummary || 'لم يسجل ملخص الحكم';
  const pronouncement = String(judgment.judgmentPronouncement || '').trim();
  const theme = getSemanticTheme(judgment.judgmentType, summaryDecision);
  const categoryLabel = typeConfig?.label || judgment.judgmentCategory || judgment.judgmentType || theme.label;
  const canOpenAttachment = Boolean(judgment.attachmentUrl && onOpenAttachment);

  if (isCompact) {
    const compactText = judgment.judgmentPronouncement || judgment.summaryDecision || 'لم يتم إدخال منطوق';

    return (
      <div
        style={{
          background: theme.bg,
          borderRight: `4px solid ${theme.border}`,
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: theme.color,
              background: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {theme.label || 'حكم'}
          </span>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <DateDisplay value={judgment.judgmentDate} options={dateDisplayOptions} />
          </div>
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={compactText}
        >
          {compactText}
        </div>
      </div>
    );
  }

  return (
    <article
      style={{
        direction: 'rtl',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${theme.color}`,
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: 12,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* نقطة الخط الزمني تتلون حسب دلالة الحكم حتى يقرأ المستخدم الخطر/النجاح بنظرة واحدة. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -24,
          top: 20,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: theme.color,
          border: '3px solid #fff',
          boxShadow: `0 0 0 2px ${theme.border}`,
          zIndex: 2,
        }}
      />

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '12px',
              background: theme.bg,
              color: theme.color,
              border: `1px solid ${theme.border}`,
            }}
          >
            {judgment.isFinal ? 'نهائي' : 'تمهيدي'} {theme.label && theme.label !== 'حكم' ? ` • ${theme.label}` : ''}
          </span>

          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {categoryLabel}
          </span>

          {isLatest && (
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: 999,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              آخر حكم
            </span>
          )}

          {judgment.isLegacy && (
            <span
              style={{
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              بيان مستورد
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onDateClick?.(judgment.judgmentDate)}
            title="اضغط للبحث عن رول الجلسة"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text-secondary)',
              cursor: onDateClick ? 'pointer' : 'default',
              fontFamily: 'Cairo',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: onDateClick ? 'underline dotted' : 'none',
            }}
          >
            <DateDisplay value={judgment.judgmentDate} options={dateDisplayOptions} />
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(judgment);
              }}
              style={{
                background: 'var(--bg-page)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'Cairo',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title="تعديل بيانات الحكم"
            >
              ✏️ تعديل
            </button>
          )}

          {canOpenAttachment && (
            <button
              type="button"
              onClick={() => onOpenAttachment(judgment.attachmentUrl)}
              style={{
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'Cairo',
                fontSize: 11,
                color: '#334155',
                fontWeight: 800,
              }}
              title="فتح مرفق الحكم"
            >
              مرفق
            </button>
          )}
        </div>
      </header>

      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: '#1e293b',
          marginTop: 8,
          lineHeight: 1.6,
        }}
      >
        {summaryDecision}
      </div>

      {pronouncement && (
        <section style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 900, marginBottom: 5 }}>
            المنطوق:
          </div>
          <div
            style={{
              background: '#f8fafc',
              padding: 10,
              borderRight: '3px solid #cbd5e1',
              borderRadius: 4,
              marginTop: 6,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#334155',
              whiteSpace: 'pre-wrap',
            }}
          >
            {pronouncement}
          </div>
        </section>
      )}

      {(judgment.originSessionType || judgment.originSessionDate) && (
        <footer style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(judgment.originSessionType || judgment.originSessionDate) && (
            <span
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                borderRadius: 999,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              جلسة المنشأ: {judgment.originSessionType || '—'}
                {judgment.originSessionDate ? ` — ${judgment.originSessionDate}` : ''}
            </span>
          )}
        </footer>
      )}

      {judgment.isFinal && judgment.appealDeadlineDate && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
            background: urgency?.bg || theme.bg,
            color: urgency?.color || theme.color,
            border: `1px solid ${urgency?.color || theme.border}44`,
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          <span>ينتهي ميعاد الطعن في:</span>
          <span style={{ fontWeight: 800 }}>
            <DateDisplay value={judgment.appealDeadlineDate} options={dateDisplayOptions} />
            {isPlaintiff && urgency?.label ? ` — ${urgency.label}` : ''}
          </span>
        </div>
      )}

      {!judgment.isFinal && judgment.nextAction && (
          <div style={{ marginTop: 8, color: theme.color, fontSize: 12, fontWeight: 900 }}>
          الإجراء التالي: {judgment.nextAction}
        </div>
      )}
    </article>
  );
}
