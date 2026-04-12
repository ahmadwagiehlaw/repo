import { getCaseNumberPillStyle, formatCaseNumber, getDisplaySettings, getFormattedCaseNumberParts } from '@/utils/caseUtils.js';
import { useSensitiveMode } from '@/hooks/useSensitiveMode.js';

export default function CaseNumberBadge({
  caseNumber,
  caseYear,
  caseData,
  variant = 'pill',
  displayOrder,
  className = '',
  style = {},
  title,
  onClick,
}) {
  const { hidden: sensitiveHidden } = useSensitiveMode();
  const displaySettings = getDisplaySettings();
  const resolvedFormat = displayOrder === 'number-first'
    ? 'number-sanah-year'
    : displayOrder === 'year-first'
      ? 'year-slash-number'
      : (displayOrder || displaySettings.caseNumberDisplayFormat);
  const formatted = getFormattedCaseNumberParts(caseNumber, caseYear, {
    caseNumberDisplayFormat: resolvedFormat,
    useArabicNumerals: displaySettings.useArabicNumerals,
  });
  const contentDirection = resolvedFormat === 'number-sanah-year' ? 'rtl' : 'ltr';
  const pillStyle = variant === 'pill' ? getCaseNumberPillStyle(caseData) : {};
  const baseStyle = variant === 'pill'
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 10px',
        borderRadius: 999,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        unicodeBidi: 'isolate',
        direction: contentDirection,
        fontFamily: 'Cairo',
        ...pillStyle,
      }
    : {
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
        whiteSpace: 'nowrap',
        unicodeBidi: 'isolate',
        direction: contentDirection,
        fontFamily: 'Cairo',
        color: style.color || 'inherit',
      };

  const renderPart = (value, isPrimary, shouldBlur = false) => (
    <span
      style={{
        display: 'inline-block',
        fontWeight: isPrimary ? 800 : 500,
        opacity: isPrimary ? 1 : 0.82,
        color: isPrimary ? 'inherit' : (variant === 'pill' ? 'inherit' : 'var(--text-secondary)'),
        direction: /^[0-9٠-٩]+$/.test(String(value)) ? 'ltr' : contentDirection,
        unicodeBidi: 'isolate',
        filter: shouldBlur ? 'blur(4px)' : 'none',
        userSelect: shouldBlur ? 'none' : 'text',
      }}
    >
      {value}
    </span>
  );

  const content = (
    <>
      {formatted.segments.map((segment, index) => {
        const shouldBlur = sensitiveHidden && (segment.role === 'number' || segment.role === 'year');
        return (
        <span
          key={`${segment.role}-${index}`}
          style={segment.role === 'separator' ? { margin: '0 2px', opacity: 0.85 } : undefined}
        >
          {renderPart(segment.value, segment.isCaseNumber, shouldBlur)}
        </span>
        );
      })}
    </>
  );
  return (
    <span
      className={className}
      title={title || (sensitiveHidden ? 'بيانات حساسة مخفية' : formatCaseNumber(caseNumber, caseYear, { caseNumberDisplayFormat: resolvedFormat }))}
      onClick={onClick}
      style={{ ...baseStyle, ...style }}
    >
      {content}
    </span>
  );
}
