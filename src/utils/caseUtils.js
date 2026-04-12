// Returns true if the task is an inspection task (طلب اطلاع)
export function isInspectionTask(task) {
  const title = String(task?.title || '');
  return title.startsWith('طلب اطلاع:') || task?.source === 'inspection';
}
const DISPLAY_SETTINGS_KEY = 'lb_display_settings';
const DISPLAY_SETTINGS_EVENT = 'lawbase:display-settings-changed';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EN_MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const DEFAULT_DISPLAY_SETTINGS = {
  caseNumberDisplayFormat: 'year-slash-number',
  dateDisplayFormat: 'DD/MM/YYYY',
  useArabicNumerals: false,
};

function resolveDateDisplayFormat(format) {
  const normalized = String(format || '').trim();
  if (!normalized) return DEFAULT_DISPLAY_SETTINGS.dateDisplayFormat;
  if (normalized === 'gregorian') return 'YYYY-MM-DD';
  if (normalized === 'both') return 'both';
  return normalized;
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

export function normalizeDigits(value) {
  return String(value || '').replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

export function formatNumerals(value, useArabicNumerals = false) {
  const text = String(value || '');
  if (useArabicNumerals) {
    return text.replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]);
  }
  return text.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseMonthName(monthText) {
  const normalized = normalizeWhitespace(monthText).toLowerCase();
  if (!normalized) return null;

  const arabicMonths = {
    'يناير': 1,
    'فبراير': 2,
    'مارس': 3,
    'أبريل': 4,
    'ابريل': 4,
    'مايو': 5,
    'يونيو': 6,
    'يوليو': 7,
    'أغسطس': 8,
    'اغسطس': 8,
    'سبتمبر': 9,
    'أكتوبر': 10,
    'اكتوبر': 10,
    'نوفمبر': 11,
    'ديسمبر': 12,
  };

  if (arabicMonths[normalized]) return arabicMonths[normalized];
  return EN_MONTHS[normalized] || null;
}

function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return '';
  }

  return date.toISOString().split('T')[0];
}

export function getDisplaySettings() {
  const stored = safeLocalStorageGet(DISPLAY_SETTINGS_KEY);
  const parsed = stored ? (() => {
    try {
      return JSON.parse(stored) || {};
    } catch {
      return {};
    }
  })() : {};

  const caseNumberDisplayFormat = (() => {
    if (parsed.caseNumberDisplayFormat === 'number-sanah-year' || parsed.caseNumberDisplayFormat === 'year-slash-number') {
      return parsed.caseNumberDisplayFormat;
    }
    if (parsed.caseNumberDisplayOrder === 'number-first') {
      return 'number-sanah-year';
    }
    return DEFAULT_DISPLAY_SETTINGS.caseNumberDisplayFormat;
  })();
  const dateDisplayFormat = resolveDateDisplayFormat(parsed.dateDisplayFormat || parsed.dateFormat || DEFAULT_DISPLAY_SETTINGS.dateDisplayFormat);
  const useArabicNumerals = typeof parsed.useArabicNumerals === 'boolean'
    ? parsed.useArabicNumerals
    : typeof parsed.arabicNumerals === 'boolean'
      ? parsed.arabicNumerals
      : safeLocalStorageGet('lb_arabic_numerals') === 'true';

  return {
    caseNumberDisplayFormat,
    caseNumberDisplayOrder: caseNumberDisplayFormat === 'number-sanah-year' ? 'number-first' : 'year-first',
    dateDisplayFormat,
    dateFormat: parsed.dateFormat || dateDisplayFormat,
    useArabicNumerals,
    arabicNumerals: useArabicNumerals,
  };
}

export function setDisplaySettings(nextSettings = {}) {
  const current = getDisplaySettings();
  const nextFormat = nextSettings.caseNumberDisplayFormat === 'number-sanah-year'
    ? 'number-sanah-year'
    : nextSettings.caseNumberDisplayFormat === 'year-slash-number'
      ? 'year-slash-number'
      : (nextSettings.caseNumberDisplayOrder === 'number-first' ? 'number-sanah-year' : current.caseNumberDisplayFormat);
  const merged = {
    ...current,
    ...nextSettings,
    caseNumberDisplayFormat: nextFormat,
    caseNumberDisplayOrder: nextFormat === 'number-sanah-year' ? 'number-first' : 'year-first',
    dateDisplayFormat: resolveDateDisplayFormat(nextSettings.dateDisplayFormat || nextSettings.dateFormat || current.dateDisplayFormat || DEFAULT_DISPLAY_SETTINGS.dateDisplayFormat),
    dateFormat: resolveDateDisplayFormat(nextSettings.dateFormat || nextSettings.dateDisplayFormat || current.dateFormat || current.dateDisplayFormat || DEFAULT_DISPLAY_SETTINGS.dateDisplayFormat),
    useArabicNumerals: Boolean(nextSettings.useArabicNumerals ?? nextSettings.arabicNumerals ?? current.useArabicNumerals),
    arabicNumerals: Boolean(nextSettings.arabicNumerals ?? nextSettings.useArabicNumerals ?? current.arabicNumerals),
  };

  safeLocalStorageSet(DISPLAY_SETTINGS_KEY, JSON.stringify(merged));
  safeLocalStorageSet('lb_arabic_numerals', String(merged.useArabicNumerals));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISPLAY_SETTINGS_EVENT, { detail: merged }));
  }

  return merged;
}

export function getDateDisplayOptions(settings = {}) {
  const fallback = getDisplaySettings();
  const source = { ...fallback, ...(settings || {}) };
  const dateFormat = resolveDateDisplayFormat(source.dateFormat || source.dateDisplayFormat || fallback.dateDisplayFormat);
  const arabicNumerals = typeof source.arabicNumerals === 'boolean'
    ? source.arabicNumerals
    : Boolean(source.useArabicNumerals);

  return {
    format: dateFormat,
    dateFormat,
    dateDisplayFormat: dateFormat,
    arabicNumerals,
    useArabicNumerals: arabicNumerals,
  };
}

function normalizeCaseYear(value) {
  const raw = normalizeDigits(value).replace(/[^0-9]/g, '').trim();
  if (!raw) return '';
  return raw.slice(0, 4);
}

function normalizeCaseNumberValue(value) {
  const raw = normalizeDigits(value);
  return normalizeWhitespace(raw.replace(/[\u200e\u200f]/g, ''));
}

export function parseCaseNumberInput(rawValue, rawYear = '') {
  const inputValue = normalizeCaseNumberValue(rawValue);
  const explicitYear = normalizeCaseYear(rawYear);

  if (!inputValue && !explicitYear) {
    return { caseNumber: '', caseYear: '' };
  }

  const slashMatch = inputValue.match(/^(\d+)\s*[\/\\]\s*(\d+)$/);
  if (slashMatch) {
    const first = slashMatch[1];
    const second = slashMatch[2];

    if (explicitYear) {
      const numberCandidate = first === explicitYear ? second : first;
      return { caseNumber: numberCandidate.trim(), caseYear: explicitYear };
    }

    if (first.length <= 2 && second.length > 2) {
      return { caseNumber: second.trim(), caseYear: first.trim() };
    }

    if (second.length <= 2 && first.length > 2) {
      return { caseNumber: first.trim(), caseYear: second.trim() };
    }

    return { caseNumber: first.trim(), caseYear: second.trim() };
  }

  const sentenceMatch = inputValue.match(/^(\d+)\s*(?:لسنة|سنة)\s*(\d+)$/i);
  if (sentenceMatch) {
    return {
      caseNumber: sentenceMatch[1].trim(),
      caseYear: sentenceMatch[2].trim(),
    };
  }

  const numberOnly = inputValue.match(/^(\d+)$/);
  if (numberOnly) {
    return {
      caseNumber: numberOnly[1].trim(),
      caseYear: explicitYear,
    };
  }

  const combinedYear = explicitYear || '';
  const normalizedInput = inputValue
    .replace(/\b(?:لسنة|سنة)\b.*$/i, '')
    .replace(/\/.*$/, '')
    .trim();

  return {
    caseNumber: normalizedInput,
    caseYear: combinedYear,
  };
}

export function normalizeCaseNumberFields(caseNumber, caseYear) {
  return parseCaseNumberInput(caseNumber, caseYear);
}

export function getCaseNumberParts(caseNumber, caseYear) {
  const normalized = normalizeCaseNumberFields(caseNumber, caseYear);
  return {
    caseNumber: normalized.caseNumber,
    caseYear: normalized.caseYear,
    number: normalized.caseNumber,
    year: normalized.caseYear,
  };
}

export function getFormattedCaseNumberParts(caseNumber, caseYear, options = {}) {
  const { caseNumber: number, caseYear: year } = getCaseNumberParts(caseNumber, caseYear);
  const settings = getDisplaySettings();
  const format = options.caseNumberDisplayFormat
    || (options.displayOrder === 'number-first' ? 'number-sanah-year' : options.displayOrder === 'year-first' ? 'year-slash-number' : options.displayOrder)
    || settings.caseNumberDisplayFormat;
  const useArabicNumerals = typeof options.useArabicNumerals === 'boolean'
    ? options.useArabicNumerals
    : settings.useArabicNumerals;

  const formattedNumber = formatNumerals(number, useArabicNumerals);
  const formattedYear = formatNumerals(year, useArabicNumerals);

  if (format === 'number-sanah-year') {
    if (formattedNumber && formattedYear) {
      return {
        format,
        text: `${formattedNumber} لسنة ${formattedYear}`,
        segments: [
          { value: formattedNumber, role: 'number', isCaseNumber: true },
          { value: 'لسنة', role: 'separator', isCaseNumber: false },
          { value: formattedYear, role: 'year', isCaseNumber: false },
        ],
      };
    }

    if (formattedNumber) {
      return {
        format,
        text: formattedNumber,
        segments: [{ value: formattedNumber, role: 'number', isCaseNumber: true }],
      };
    }

    if (formattedYear) {
      return {
        format,
        text: formattedYear,
        segments: [{ value: formattedYear, role: 'year', isCaseNumber: false }],
      };
    }

    return {
      format,
      text: '—',
      segments: [{ value: '—', role: 'placeholder', isCaseNumber: false }],
    };
  }

  if (formattedYear && formattedNumber) {
    return {
      format: 'year-slash-number',
      text: `${formattedYear}/${formattedNumber}`,
      segments: [
        { value: formattedYear, role: 'year', isCaseNumber: false },
        { value: '/', role: 'separator', isCaseNumber: false },
        { value: formattedNumber, role: 'number', isCaseNumber: true },
      ],
    };
  }

  if (formattedNumber) {
    return {
      format: 'year-slash-number',
      text: formattedNumber,
      segments: [{ value: formattedNumber, role: 'number', isCaseNumber: true }],
    };
  }

  if (formattedYear) {
    return {
      format: 'year-slash-number',
      text: formattedYear,
      segments: [{ value: formattedYear, role: 'year', isCaseNumber: false }],
    };
  }

  return {
    format: 'year-slash-number',
    text: '—',
    segments: [{ value: '—', role: 'placeholder', isCaseNumber: false }],
  };
}

export function formatCaseNumber(caseNumber, caseYear, options = {}) {
  return getFormattedCaseNumberParts(caseNumber, caseYear, options).text;
}

export function CaseNumberDisplay({ caseNumber, caseYear, style = {} }) {
  const text = formatCaseNumber(caseNumber, caseYear);
  return {
    text,
    style: { unicodeBidi: 'embed', direction: 'ltr', display: 'inline-block', ...style },
  };
}

function resolveDateParts(value) {
  if (value === null || value === undefined || value === '') return null;

  const raw = normalizeWhitespace(String(value)).replace(/\u200e|\u200f/g, '');
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoMatch) {
    return { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] };
  }

  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const a = Number(normalizeDigits(dmyMatch[1]));
    const b = Number(normalizeDigits(dmyMatch[2]));
    const c = normalizeDigits(dmyMatch[3]);
    const year = c.length === 2 ? `20${c}` : c;

    if (a > 12 && b <= 12) return { day: String(a), month: String(b), year };
    if (b > 12 && a <= 12) return { day: String(b), month: String(a), year };
    return { day: String(a), month: String(b), year };
  }

  const monthNameMatch = raw.match(/^(\d{1,2})\s+([\p{L}ء-ي]+)(?:\s+(\d{2,4}))?$/u);
  if (monthNameMatch) {
    const day = normalizeDigits(monthNameMatch[1]);
    const month = parseMonthName(monthNameMatch[2]);
    const year = monthNameMatch[3] ? normalizeDigits(monthNameMatch[3]) : String(new Date().getFullYear());
    if (month) return { day, month: String(month), year: year.length === 2 ? `20${year}` : year };
  }

  const slashWithoutYear = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashWithoutYear) {
    const todayYear = String(new Date().getFullYear());
    return { day: normalizeDigits(slashWithoutYear[1]), month: normalizeDigits(slashWithoutYear[2]), year: todayYear };
  }

  return null;
}

function formatArabicDateParts(date, includeYear) {
  const formatter = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
  return formatter.format(date);
}

export function normalizeStoredDate(value) {
  const parts = resolveDateParts(value);
  if (!parts) return '';
  return toIsoDate(parts.year, parts.month, parts.day);
}

export function getFormattedDateParts(value, options = {}) {
  const raw = value;
  if (!raw) {
    return {
      text: '—',
      format: 'placeholder',
      direction: 'rtl',
      segments: [{ value: '—', role: 'placeholder' }],
    };
  }

  const normalized = normalizeStoredDate(raw) || String(raw).trim();
  if (!normalized) {
    return {
      text: '—',
      format: 'placeholder',
      direction: 'rtl',
      segments: [{ value: '—', role: 'placeholder' }],
    };
  }

  const dateOptions = getDateDisplayOptions(options);
  const format = resolveDateDisplayFormat(options.format || dateOptions.dateFormat || dateOptions.dateDisplayFormat);
  const useArabicNumerals = dateOptions.arabicNumerals;
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!isoMatch) {
    const text = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)
      ? `\u200E${formatNumerals(normalized, useArabicNumerals)}`
      : normalized;
    return {
      text,
      format: 'raw',
      direction: /^\d/.test(normalized) ? 'ltr' : 'rtl',
      segments: [{ value: text.replace(/[\u200e\u200f]/g, ''), role: 'text' }],
    };
  }

  const [, y, m, d] = isoMatch;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) {
    return {
      text: '—',
      format: 'placeholder',
      direction: 'rtl',
      segments: [{ value: '—', role: 'placeholder' }],
    };
  }

  const day = formatNumerals(d, useArabicNumerals);
  const monthNumber = formatNumerals(m, useArabicNumerals);
  const year = formatNumerals(y, useArabicNumerals);
  const monthName = formatNumerals(new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date), useArabicNumerals);
  const gregorianText = `${year}-${monthNumber}-${day}`;
  const shortText = `${day}/${monthNumber}/${year}`;

  switch (format) {
    case 'gregorian':
    case 'YYYY-MM-DD':
      return {
        text: gregorianText,
        format: 'YYYY-MM-DD',
        direction: 'ltr',
        segments: [
          { value: year, role: 'year' },
          { value: '-', role: 'separator' },
          { value: monthNumber, role: 'month' },
          { value: '-', role: 'separator' },
          { value: day, role: 'day' },
        ],
      };
    case 'both':
      return {
        text: `\u200E${gregorianText}\u200F / \u200E${shortText}`,
        format: 'both',
        direction: 'ltr',
        segments: [
          { value: gregorianText, role: 'composite' },
          { value: '/', role: 'separator' },
          { value: shortText, role: 'composite' },
        ],
      };
    case 'MM/DD/YYYY':
      return {
        text: `\u200E${monthNumber}/${day}/${year}`,
        format: 'MM/DD/YYYY',
        direction: 'ltr',
        segments: [
          { value: monthNumber, role: 'month' },
          { value: '/', role: 'separator' },
          { value: day, role: 'day' },
          { value: '/', role: 'separator' },
          { value: year, role: 'year' },
        ],
      };
    case 'DD/MM':
      return {
        text: `\u200E${day}/${monthNumber}`,
        format: 'DD/MM',
        direction: 'ltr',
        segments: [
          { value: day, role: 'day' },
          { value: '/', role: 'separator' },
          { value: monthNumber, role: 'month' },
        ],
      };
    case 'D MMMM':
      return {
        text: `${day} ${monthName}`,
        format: 'D MMMM',
        direction: 'rtl',
        segments: [
          { value: day, role: 'day' },
          { value: monthName, role: 'month' },
        ],
      };
    case 'D MMMM YYYY':
      return {
        text: `${day} ${monthName} ${year}`,
        format: 'D MMMM YYYY',
        direction: 'rtl',
        segments: [
          { value: day, role: 'day' },
          { value: monthName, role: 'month' },
          { value: year, role: 'year' },
        ],
      };
    case 'DD/MM/YYYY':
    default:
      return {
        text: `\u200E${shortText}`,
        format: 'DD/MM/YYYY',
        direction: 'ltr',
        segments: [
          { value: day, role: 'day' },
          { value: '/', role: 'separator' },
          { value: monthNumber, role: 'month' },
          { value: '/', role: 'separator' },
          { value: year, role: 'year' },
        ],
      };
  }
}

export function formatDisplayDate(value, options = {}) {
  return getFormattedDateParts(value, options).text;

  const raw = value;
  if (!raw) return '—';

  const normalized = normalizeStoredDate(raw) || String(raw).trim();
  if (!normalized) return '—';

  const settings = getDisplaySettings();
  const format = resolveDateDisplayFormat(options.format || options.dateFormat || settings.dateFormat || settings.dateDisplayFormat);
  const useArabicNumerals = typeof options.useArabicNumerals === 'boolean'
    ? options.useArabicNumerals
    : typeof options.arabicNumerals === 'boolean'
      ? options.arabicNumerals
      : (typeof settings.arabicNumerals === 'boolean' ? settings.arabicNumerals : settings.useArabicNumerals);
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)) return `\u200E${formatNumerals(normalized, useArabicNumerals)}`;
    return normalized;
  }

  const [, y, m, d] = isoMatch;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return '—';

  const gregorianText = formatNumerals(`${y}-${m}-${d}`, useArabicNumerals);
  const shortText = `\u200E${formatNumerals(d, useArabicNumerals)}/${formatNumerals(m, useArabicNumerals)}/${formatNumerals(y, useArabicNumerals)}`;

  switch (format) {
    case 'gregorian':
    case 'YYYY-MM-DD':
      return gregorianText;
    case 'both':
      return `\u200E${gregorianText}\u200F / ${shortText}`;
    case 'MM/DD/YYYY':
      return `\u200E${formatNumerals(m, useArabicNumerals)}/${formatNumerals(d, useArabicNumerals)}/${formatNumerals(y, useArabicNumerals)}`;
    case 'DD/MM':
      return `\u200E${formatNumerals(d, useArabicNumerals)}/${formatNumerals(m, useArabicNumerals)}`;
    case 'D MMMM':
      return formatNumerals(formatArabicDateParts(date, false), useArabicNumerals);
    case 'D MMMM YYYY':
      return formatNumerals(formatArabicDateParts(date, true), useArabicNumerals);
    case 'DD/MM/YYYY':
    default:
      return shortText;
  }
}

export function getCaseNumberPillStyle(caseData) {
  const route = String(caseData?.agendaRoute || '').toLowerCase();
  const status = String(caseData?.status || '').toLowerCase();

  if (route === 'judgments' || status === 'reserved_for_judgment') {
    return { background: '#7c3aed', color: 'white' };
  }
  if (route === 'chamber' || status === 'suspended') {
    return { background: '#dc2626', color: 'white' };
  }
  if (status === 'struck_out' || status === 'archived') {
    return { background: '#6b7280', color: 'white' };
  }
  if (status === 'judged' || status === 'appeal_window_open') {
    return { background: '#0284c7', color: 'white' };
  }
  if (route === 'referred' || status === 'under_review') {
    return { background: '#9333ea', color: 'white' };
  }
  return { background: 'var(--primary)', color: 'white' };
}

export function getAgendaRouteMeta(caseData) {
  const route = String(caseData?.agendaRoute || '').trim().toLowerCase();

  switch (route) {
    case 'sessions':
      return { label: 'مسار: الجلسات', background: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' };
    case 'judgments':
      return { label: 'مسار: الأحكام', background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' };
    case 'archive':
      return { label: 'مسار: الأرشيف', background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' };
    case 'chamber':
      return { label: 'مسار: الشعبة', background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
    default:
      return { label: 'مسار: غير محدد', background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' };
  }
}

export function isDormantLitigationStage(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'لا شأن' || normalized === 'no_interest' || normalized === 'no-interest';
}
