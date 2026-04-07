import { getFormattedDateParts } from '@/utils/caseUtils.js';

function getSegmentStyle(segment, direction) {
  const baseStyle = {
    display: 'inline-block',
    unicodeBidi: 'isolate',
    direction: segment.role === 'day' || segment.role === 'month' || segment.role === 'year' || segment.role === 'composite'
      ? (/^\d/.test(String(segment.value || '')) ? 'ltr' : direction)
      : direction,
  };

  if (segment.role === 'separator') {
    return {
      ...baseStyle,
      opacity: 0.7,
      fontWeight: 400,
      margin: direction === 'rtl' ? '0 4px 0 0' : '0 0 0 4px',
    };
  }

  if (segment.role === 'day') {
    return {
      ...baseStyle,
      fontWeight: 800,
    };
  }

  if (segment.role === 'month') {
    return {
      ...baseStyle,
      fontWeight: 400,
      opacity: 0.9,
    };
  }

  if (segment.role === 'year') {
    return {
      ...baseStyle,
      fontWeight: 500,
      opacity: 0.85,
    };
  }

  return baseStyle;
}

export default function DateDisplay({
  value,
  options = {},
  className = '',
  style = {},
  title,
}) {
  const formatted = getFormattedDateParts(value, options);
  const direction = formatted.direction || 'rtl';
  const isTextual = formatted.format === 'D MMMM' || formatted.format === 'D MMMM YYYY';

  return (
    <span
      className={className}
      title={title || formatted.text.replace(/[\u200e\u200f]/g, '')}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: isTextual ? 6 : 0,
        direction,
        unicodeBidi: 'isolate',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {formatted.segments.map((segment, index) => (
        <span key={`${segment.role}-${index}`} style={getSegmentStyle(segment, direction)}>
          {segment.value}
        </span>
      ))}
    </span>
  );
}
