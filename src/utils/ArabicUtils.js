/**
 * ArabicUtils.js - Arabic Text Processing & RTL Support
 * ====================================================
 * Handles Arabic text normalization, validation, and RTL support
 * 
 * @module js/utils/ArabicUtils
 * @version 1.0.0
 */

import { PLAINTIFF_KEYWORDS } from '../core/Constants.js';

/**
 * Normalize Arabic text (remove diacritics)
 * @param {string} text - Arabic text
 * @returns {string} Normalized text without diacritics
 */
export function normalizeArabic(text) {
  if (typeof text !== 'string') return text;
  
  // Remove Arabic diacritics (tashkeel)
  return text.replace(/[\u064B-\u065F]/g, '');
}

/**
 * Check if text contains Arabic characters
 * @param {string} text - Text to check
 * @returns {boolean} True if contains Arabic
 */
export function containsArabic(text) {
  if (typeof text !== 'string') return false;
  
  const arabicRegex = /[\u0600-\u06FF]/g;
  return arabicRegex.test(text);
}

/**
 * Check if text is purely Arabic (no Latin/numbers)
 * @param {string} text - Text to check
 * @returns {boolean} True if pure Arabic
 */
export function isPureArabic(text) {
  if (typeof text !== 'string') return false;
  
  const arabicRegex = /^[\u0600-\u06FF\s]+$/;
  return arabicRegex.test(text.trim());
}

/**
 * Check if text is purely Latin (no Arabic/special)
 * @param {string} text - Text to check
 * @returns {boolean} True if pure Latin
 */
export function isPureLatin(text) {
  if (typeof text !== 'string') return false;
  
  const latinRegex = /^[a-zA-Z0-9\s.-]+$/;
  return latinRegex.test(text.trim());
}

/**
 * Reverse Arabic text for display (handle bidirectional text)
 * Note: Modern browsers handle RTL automatically via CSS dir="rtl"
 * This is rarely needed but kept for edge cases
 * @param {string} text - Text to potentially reverse
 * @returns {string} Properly ordered text
 */
export function getRTLText(text) {
  if (typeof text !== 'string') return text;
  
  // For Arabic text, wrap in RTL mark for proper display
  const RTL_MARK = '\u202E'; // Right-to-left mark
  const LTR_MARK = '\u202D'; // Left-to-right mark
  
  if (containsArabic(text)) {
    return RTL_MARK + text + '\u202C'; // RTL mark + text + pop directional formatting
  }
  
  return text;
}

/**
 * Get text direction (rtl or ltr)
 * @param {string} text - Text to check
 * @returns {string} 'rtl' or 'ltr'
 */
export function getTextDirection(text) {
  if (!text || typeof text !== 'string') return 'ltr';
  
  const arabicText = text.trim();
  const firstChar = arabicText[0];
  
  if (!firstChar) return 'ltr';
  
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(firstChar) ? 'rtl' : 'ltr';
}

/**
 * Sanitize Arabic text (remove special characters but keep valid ones)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeArabic(text) {
  if (typeof text !== 'string') return text;
  
  // Keep Arabic letters, numbers, spaces, and common punctuation
  return text.replace(/[^\u0600-\u06FF0-9\s\.\,\-\(\)]/g, '').trim();
}

/**
 * Remove all diacritics and return clean Arabic
 * @param {string} text - Arabic text with diacritics
 * @returns {string} Text without diacritics
 */
export function removeDiacritics(text) {
  if (typeof text !== 'string') return text;
  
  // Arabic diacritics Unicode range
  const diacritics = /[\u064B-\u0652\u0640]/g;
  return text.replace(diacritics, '');
}

/**
 * Convert English numbers to Arabic numbers (Farsi numerals)
 * @param {string} text - Text with English numbers
 * @returns {string} Text with Arabic numbers
 */
export function convertToArabicNumbers(text) {
  if (typeof text !== 'string') return text;
  
  const arabicNumbers = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩'
  };
  
  return text.replace(/[0-9]/g, digit => arabicNumbers[digit]);
}

/**
 * Convert Arabic numbers to English numbers
 * @param {string} text - Text with Arabic numbers
 * @returns {string} Text with English numbers
 */
export function convertToEnglishNumbers(text) {
  if (typeof text !== 'string') return text;
  
  const englishNumbers = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9'
  };
  
  return text.replace(/[٠-٩]/g, digit => englishNumbers[digit]);
}

/**
 * Format phone number for Egyptian numbers
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone
 */
export function formatPhoneNumber(phone) {
  if (typeof phone !== 'string') return phone;
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Egyptian phone pattern: +20 XXX XXX XXXX
  if (cleaned.startsWith('20')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+20 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return `+20 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}

/**
 * Extract Arabic words from mixed text
 * @param {string} text - Mixed text
 * @returns {string[]} Array of Arabic words
 */
export function extractArabicWords(text) {
  if (typeof text !== 'string') return [];
  
  const arabicWordRegex = /[\u0600-\u06FF]+/g;
  return text.match(arabicWordRegex) || [];
}

/**
 * Extract Latin words from mixed text
 * @param {string} text - Mixed text
 * @returns {string[]} Array of Latin words
 */
export function extractLatinWords(text) {
  if (typeof text !== 'string') return [];
  
  const latinWordRegex = /[a-zA-Z]+/g;
  return text.match(latinWordRegex) || [];
}

/**
 * Truncate Arabic text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateArabicText(text, maxLength = 50) {
  if (typeof text !== 'string') return text;
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Check if text is a valid Arabic name
 * @param {string} text - Name to validate
 * @returns {boolean} True if valid
 */
export function isValidArabicName(text) {
  if (typeof text !== 'string') return false;
  
  const nameRegex = /^[\u0600-\u06FF\s]{2,}$/;
  return nameRegex.test(text.trim());
}

/**
 * Check if text is a valid case number
 * Egyptian case numbers follow: YYYY/Number format
 * @param {string} caseNumber - Case number to validate
 * @returns {boolean} True if valid
 */
export function isValidCaseNumber(caseNumber) {
  if (typeof caseNumber !== 'string') return false;
  
  const caseNumberRegex = /^\d{4}\/\d{1,10}$/;
  return caseNumberRegex.test(caseNumber.trim());
}

/**
 * Check if text is a valid ID number (Egyptian ID format)
 * @param {string} idNumber - ID number
 * @returns {boolean} True if valid format
 */
export function isValidIDNumber(idNumber) {
  if (typeof idNumber !== 'string') return false;
  
  const idRegex = /^\d{14}$/;
  return idRegex.test(idNumber.replace(/\D/g, ''));
}

/**
 * Get character count (handles Arabic correctly)
 * @param {string} text - Text to count
 * @returns {number} Character count
 */
export function getCharacterCount(text) {
  if (typeof text !== 'string') return 0;
  
  // Count actual Unicode characters (not UTF-16 code units)
  return Array.from(text).length;
}

/**
 * Get word count (Arabic and Latin)
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
export function getWordCount(text) {
  if (typeof text !== 'string') return 0;
  
  // Split on whitespace
  return text.trim().split(/\s+/).length;
}

/**
 * Capitalize first letter of Arabic text
 * @param {string} text - Text
 * @returns {string} Capitalized text
 */
export function capitalizeArabic(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert Arabic text to title case
 * @param {string} text - Text
 * @returns {string} Title case text
 */
export function toTitleCaseArabic(text) {
  if (typeof text !== 'string') return text;
  
  return text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get proper Arabic direction CSS class
 * @param {string} text - Text to check
 * @returns {string} CSS class: 'rtl' or 'ltr'
 */
export function getDirectionClass(text) {
  return getTextDirection(text) === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Check if string has mixed Arabic and Latin
 * @param {string} text - Text to check
 * @returns {boolean} True if mixed
 */
export function hasMixedContent(text) {
  if (typeof text !== 'string') return false;
  
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  
  return hasArabic && hasLatin;
}

/**
 * Split text while preserving Arabic letters intact
 * @param {string} text - Text to split
 * @param {number} chunkSize - Size of chunks
 * @returns {string[]} Array of text chunks
 */
export function splitArabicText(text, chunkSize = 100) {
  if (typeof text !== 'string') return [];
  
  const chunks = [];
  let currentChunk = '';
  
  Array.from(text).forEach(char => {
    currentChunk += char;
    
    if (currentChunk.length >= chunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  });
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Get RTL-safe substring (handles proper character boundaries)
 * @param {string} text - Text
 * @param {number} start - Start index
 * @param {number} end - End index
 * @returns {string} Substring
 */
export function getSubstring(text, start, end) {
  if (typeof text !== 'string') return text;
  
  return Array.from(text).slice(start, end).join('');
}

/**
 * Check if two Arabic words are similar (for search/matching)
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {boolean} True if similar
 */
export function areArabicWordsSimilar(word1, word2) {
  if (typeof word1 !== 'string' || typeof word2 !== 'string') return false;
  
  const normalized1 = normalizeArabic(word1.toLowerCase());
  const normalized2 = normalizeArabic(word2.toLowerCase());
  
  return normalized1 === normalized2;
}

export function detectIsPlaintiff(roleValue) {
  if (!roleValue) return false;
  return PLAINTIFF_KEYWORDS.some(k => String(roleValue).includes(k));
}

export default {
  normalizeArabic,
  containsArabic,
  isPureArabic,
  isPureLatin,
  getRTLText,
  getTextDirection,
  sanitizeArabic,
  removeDiacritics,
  convertToArabicNumbers,
  convertToEnglishNumbers,
  formatPhoneNumber,
  extractArabicWords,
  extractLatinWords,
  truncateArabicText,
  isValidArabicName,
  isValidCaseNumber,
  isValidIDNumber,
  getCharacterCount,
  getWordCount,
  capitalizeArabic,
  toTitleCaseArabic,
  getDirectionClass,
  hasMixedContent,
  splitArabicText,
  getSubstring,
  areArabicWordsSimilar
};
