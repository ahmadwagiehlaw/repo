/**
 * DateUtils.js - Date and Deadline Utilities for LawBase
 * =====================================================
 * Handles Egyptian holidays, deadline calculations, date formatting
 * 
 * @module js/utils/DateUtils
 * @version 1.0.0
 */

import { EGYPTIAN_HOLIDAYS, DEADLINES } from '../core/Constants.js';

const LEGAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function fromDateObjectToLegalDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '';
  // Use LOCAL getters. Every Date object that reaches this function was created
  // via new Date(year, month-1, day) for arithmetic or display purposes.
  // These are LOCAL midnight dates, so local getters return the correct calendar date.
  // NOTE: Excel serial numbers do NOT go through this function —
  // they are handled separately in normalizeLegalDateInput using explicit UTC getters.
  const year = dateObj.getFullYear();
  const month = pad2(dateObj.getMonth() + 1);
  const day = pad2(dateObj.getDate());
  return `${year}-${month}-${day}`;
}

function parseDdMmYyyyLike(raw) {
  const normalized = String(raw || '').trim().replace(/\//g, '-');
  const parts = normalized.split('-');
  if (parts.length !== 3) return '';

  const p1 = String(parts[0] || '').trim();
  const p2 = String(parts[1] || '').trim();
  const p3 = String(parts[2] || '').trim();

  if (p1.length >= 4) {
    return `${p1.padStart(4, '0')}-${pad2(p2)}-${pad2(p3)}`;
  }

  if (p3.length >= 4) {
    return `${p3.padStart(4, '0')}-${pad2(p2)}-${pad2(p1)}`;
  }

  if (p3.length === 2) {
    return `20${p3}-${pad2(p2)}-${pad2(p1)}`;
  }

  return '';
}

/**
 * Normalize any legal date input to YYYY-MM-DD.
 * Legal date fields are calendar-only (no timezone/time semantics).
 */
export function normalizeLegalDateInput(value) {
  if (value === undefined || value === null || value === '') return '';

  if (value instanceof Date) {
    return fromDateObjectToLegalDate(value);
  }

  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) > 10000)) {
    const serial = Number(value);
    if (Number.isFinite(serial)) {
      const excelDate = new Date(Math.round((serial - 25569) * 86400 * 1000));
      const y = excelDate.getUTCFullYear();
      const m = pad2(excelDate.getUTCMonth() + 1);
      const d = pad2(excelDate.getUTCDate());
      return `${y}-${m}-${d}`;
    }
  }

  const text = String(value).trim();
  if (!text) return '';

  const direct = text.replace(/\//g, '-');
  if (LEGAL_DATE_REGEX.test(direct)) {
    return direct;
  }

  if (text.includes('T')) {
    // First try: extract the date part directly from any ISO datetime string
    // This is safe and timezone-free for strings like:
    //   "2026-04-01T00:00:00"      (no Z - local-ambiguous, extract date directly)
    //   "2026-04-01T00:00:00Z"     (UTC midnight)
    //   "2026-04-01T00:00:00.000Z" (UTC midnight with ms)
    //   "2026-04-01T12:30:00Z"     (any time - take calendar date from string, ignore time)
    const datePartMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (datePartMatch) {
      return `${datePartMatch[1]}-${datePartMatch[2]}-${datePartMatch[3]}`;
    }
    // Fail-closed: do not use implicit Date parsing for legal dates.
    return '';
  }

  const structured = parseDdMmYyyyLike(text);
  if (LEGAL_DATE_REGEX.test(structured)) {
    return structured;
  }

  return '';
}

/**
 * Guard writes for legal calendar fields.
 */
export function normalizeLegalDateForStore(value) {
  return normalizeLegalDateInput(value);
}

/**
 * Return today's legal date in YYYY-MM-DD.
 */
export function getTodayLegalDate(now = new Date()) {
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Compare legal date strings safely.
 */
export function compareLegalDates(a, b) {
  const left = normalizeLegalDateInput(a);
  const right = normalizeLegalDateInput(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return left.localeCompare(right);
}

/**
 * Check if legal date is between start and end (inclusive).
 */
export function isLegalDateInRange(dateValue, startValue, endValue) {
  const date = normalizeLegalDateInput(dateValue);
  const start = normalizeLegalDateInput(startValue);
  const end = normalizeLegalDateInput(endValue);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
}

/**
 * Add days to legal date while preserving YYYY-MM-DD output.
 */
export function addDaysToLegalDate(dateValue, days) {
  const base = normalizeLegalDateInput(dateValue);
  if (!base) return '';
  const [y, m, d] = base.split('-').map(Number);
  if (!y || !m || !d) return '';
  // Use UTC Date to avoid timezone drift
  const dateObj = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  const year = dateObj.getUTCFullYear();
  const month = pad2(dateObj.getUTCMonth() + 1);
  const day = pad2(dateObj.getUTCDate());
  return `${year}-${month}-${day}`;
}

/**
 * Format legal date as YYYY/MM/DD for UI display.
 */
export function formatLegalDateSlash(value) {
  const iso = normalizeLegalDateInput(value);
  return iso ? iso.replace(/-/g, '/') : '';
}

/**
 * Format legal date in Arabic locale without mutating stored values.
 */
export function formatLegalDateArabic(value, format = 'short') {
  const iso = normalizeLegalDateInput(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  if (!year || !month || !day) return '';
  const dateObj = new Date(year, month - 1, day);
  const options = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return dateObj.toLocaleDateString('ar-EG', options);
}

/**
 * Get current date in Cairo timezone
 */
export function getCurrentDate() {
  const now = new Date();
  const cairoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
  return cairoTime;
}

/**
 * Format date to Arabic locale
 * @param {Date|string} date - Date object or ISO string
 * @param {string} format - Format type: 'short' | 'long' | 'datetime'
 * @returns {string} Formatted date in Arabic
 */
export function formatDateArabic(date, format = 'short') {
  const legal = normalizeLegalDateInput(date);
  if (legal) {
    const formatted = formatLegalDateArabic(legal, format === 'long' ? 'long' : 'short');
    if (formatted) return formatted;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
  };
  
  return new Intl.DateTimeFormat('ar-EG', options[format] || options.short).format(dateObj);
}

/**
 * Format time to Arabic locale
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Time in HH:MM format
 */
export function formatTimeArabic(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ar-EG', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
}

/**
 * Check if date is an Egyptian holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if holiday
 */
export function isEgyptianHoliday(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;
  
  return EGYPTIAN_HOLIDAYS.some(holiday => {
    if (typeof holiday === 'string') {
      return holiday === monthDay;
    }
    return holiday.start === monthDay || 
           (holiday.end && isDateBetween(date, new Date(`2024-${holiday.start}`), new Date(`2024-${holiday.end}`)));
  });
}

/**
 * Check if date is a weekend (Friday-Saturday in Egypt)
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday=5, Saturday=6
}

/**
 * Check if date is business day (not weekend or holiday)
 * @param {Date} date - Date to check
 * @returns {boolean} True if business day
 */
export function isBusinessDay(date) {
  return !isWeekend(date) && !isEgyptianHoliday(date);
}

/**
 * Add business days to date (skipping weekends and holidays)
 * @param {Date} startDate - Starting date
 * @param {number} daysToAdd - Number of business days to add
 * @returns {Date} New date after adding business days
 */
export function addBusinessDays(startDate, daysToAdd) {
  let date = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    
    if (isBusinessDay(date)) {
      daysAdded++;
    }
  }
  
  return date;
}

/**
 * Add calendar days to date
 * @param {Date} startDate - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(startDate, days) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Add months to date
 * @param {Date} startDate - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export function addMonths(startDate, months) {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Calculate deadline based on procedure track
 * @param {Date} eventDate - Event date (session, judgment, etc)
 * @param {string} procedureTrack - "مدني" | "commercial" | "labor" | "state_council"
 * @param {string} deadlineType - "appeal" | "execution" | "objection" | "cassation"
 * @returns {Date} Deadline date
 */
export function calculateDeadline(eventDate, procedureTrack, deadlineType) {
  const deadlineConfig = DEADLINES[procedureTrack]?.[deadlineType];
  
  if (!deadlineConfig) {
    console.warn(`No deadline found for ${procedureTrack}/${deadlineType}`);
    return addDays(eventDate, 30); // Default fallback
  }
  
  const { days, businessDaysOnly = true } = deadlineConfig;
  
  return businessDaysOnly 
    ? addBusinessDays(eventDate, days)
    : addDays(eventDate, days);
}

/**
 * Get Arabic month name
 * @param {number} monthIndex - 0-11
 * @returns {string} Month name in Arabic
 */
export function getArabicMonthName(monthIndex) {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[monthIndex] || '';
}

/**
 * Get Arabic day name
 * @param {number} dayIndex - 0-6 (Sunday=0)
 * @returns {string} Day name in Arabic
 */
export function getArabicDayName(dayIndex) {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[dayIndex] || '';
}

/**
 * Check if date is between two dates
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {boolean} True if between
 */
export function isDateBetween(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

/**
 * Get difference in days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Difference in days
 */
export function getDaysDifference(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate - startDate) / msPerDay);
}

/**
 * Get difference in business days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Difference in business days
 */
export function getBusinessDaysDifference(startDate, endDate) {
  let count = 0;
  let date = new Date(startDate);
  
  while (date < endDate) {
    if (isBusinessDay(date)) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  
  return count;
}

/**
 * Get days remaining until deadline (including today)
 * @param {Date} deadlineDate - Deadline date
 * @returns {number} Days remaining
 */
export function getDaysRemaining(deadlineDate) {
  const today = getCurrentDate();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  
  return getDaysDifference(today, deadline) + 1;
}

/**
 * Get business days remaining until deadline
 * @param {Date} deadlineDate - Deadline date
 * @returns {number} Business days remaining
 */
export function getBusinessDaysRemaining(deadlineDate) {
  const today = getCurrentDate();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  
  if (deadline < today) return 0;
  if (deadline.getTime() === today.getTime()) return 1;
  
  return getBusinessDaysDifference(today, deadline) + 1;
}

/**
 * Check if deadline is approaching (within threshold days)
 * @param {Date} deadlineDate - Deadline date
 * @param {number} thresholdDays - Warning threshold in days (default 7)
 * @returns {boolean} True if approaching
 */
export function isDeadlineApproaching(deadlineDate, thresholdDays = 7) {
  const daysRemaining = getDaysRemaining(deadlineDate);
  return daysRemaining > 0 && daysRemaining <= thresholdDays;
}

/**
 * Check if deadline is overdue
 * @param {Date} deadlineDate - Deadline date
 * @returns {boolean} True if overdue
 */
export function isDeadlineOverdue(deadlineDate) {
  const today = getCurrentDate();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  
  return today > deadline;
}

/**
 * Get deadline status with Arabic label
 * @param {Date} deadlineDate - Deadline date
 * @returns {object} { status: string, label: string, color: string }
 */
export function getDeadlineStatus(deadlineDate) {
  if (isDeadlineOverdue(deadlineDate)) {
    return { status: 'overdue', label: 'متأخر', color: 'error' };
  }
  
  if (isDeadlineApproaching(deadlineDate, 3)) {
    return { status: 'urgent', label: 'عاجل', color: 'error' };
  }
  
  if (isDeadlineApproaching(deadlineDate, 7)) {
    return { status: 'approaching', label: 'قريب', color: 'warning' };
  }
  
  return { status: 'ontrack', label: 'في الموعد', color: 'success' };
}

/**
 * Convert date to ISO string (for storage)
 * @param {Date} date - Date object
 * @returns {string} ISO string
 */
export function toISOString(date) {
  return new Date(date).toISOString();
}

/**
 * Parse ISO string to Date
 * @param {string} isoString - ISO string
 * @returns {Date} Date object
 */
export function parseISO(isoString) {
  return new Date(isoString);
}

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Get age in years from birthdate
 * @param {Date} birthDate - Birth date
 * @returns {number} Age in years
 */
export function getAge(birthDate) {
  const today = getCurrentDate();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Get start of day
 * @param {Date} date - Date
 * @returns {Date} Start of day (00:00:00)
 */
export function getStartOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get end of day
 * @param {Date} date - Date
 * @returns {Date} End of day (23:59:59)
 */
export function getEndOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get last day of month
 * @param {Date} date - Date in the month
 * @returns {Date} Last day of month
 */
export function getLastDayOfMonth(date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay;
}

/**
 * Get first day of month
 * @param {Date} date - Date in the month
 * @returns {Date} First day of month
 */
export function getFirstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default {
  normalizeLegalDateInput,
  normalizeLegalDateForStore,
  getTodayLegalDate,
  compareLegalDates,
  isLegalDateInRange,
  addDaysToLegalDate,
  formatLegalDateSlash,
  formatLegalDateArabic,
  getCurrentDate,
  formatDateArabic,
  formatTimeArabic,
  isEgyptianHoliday,
  isWeekend,
  isBusinessDay,
  addBusinessDays,
  addDays,
  addMonths,
  calculateDeadline,
  getArabicMonthName,
  getArabicDayName,
  isDateBetween,
  getDaysDifference,
  getBusinessDaysDifference,
  getDaysRemaining,
  getBusinessDaysRemaining,
  isDeadlineApproaching,
  isDeadlineOverdue,
  getDeadlineStatus,
  toISOString,
  parseISO,
  isSameDay,
  getAge,
  getStartOfDay,
  getEndOfDay,
  getLastDayOfMonth,
  getFirstDayOfMonth
};
