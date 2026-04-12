/**
 * TemplateParser.js — LawBase Template Engine
 * يعالج نماذج المستندات القانونية ويدمجها مع بيانات القضايا
 *
 * الميزات:
 * - 22+ tag قانوني عربي
 * - Conditional Blocks: {{#لو_مدعي}}...{{/لو_مدعي}}
 * - Date formatting بالعربية
 * - Fallback آمن: tag غير موجود يبقى كما هو
 */

import {
  getCaseProcedureTrack,
  getCaseRoleCapacity,
  getCaseSessionResult,
  getCaseTitle,
} from '@/utils/caseCanonical.js';

// ─── Helpers ────────────────────────────────────────────────

function formatDateAr(value) {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function toArabicDigits(str) {
  if (!str) return '';
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str).replace(/\d/g, (d) => map[Number(d)]);
}

// ─── Tag Definitions ────────────────────────────────────────

/**
 * كل tag هو دالة تستقبل بيانات القضية وتُرجع القيمة النصية.
 * لو القيمة فاضية، الدالة ترجع '' والـ parser يُبقي الـ tag الأصلي.
 */
const TEMPLATE_TAGS = {
  // ── بيانات القضية الأساسية ──
  '{{رقم_القضية}}':       (c) => c.caseNumber || '',
  '{{سنة_القضية}}':       (c) => c.caseYear || '',
  '{{اسم_المحكمة}}':      (c) => c.court || '',
  '{{الدائرة}}':           (c) => c.circuit || c.courtCircuit || '',
  '{{نوع_القضية}}':       (c) => getCaseProcedureTrack(c),
  '{{موضوع_القضية}}':     (c) => getCaseTitle(c),
  '{{درجة_التقاضي}}':     (c) => c.litigationDegree || c.degree || '',
  '{{رقم_أول_درجة}}':     (c) => c.firstInstanceNumber || '',
  '{{محكمة_أول_درجة}}':   (c) => c.firstInstanceCourt || '',
  '{{تاريخ_أول_درجة}}':   (c) => formatDateAr(c.firstInstanceDate),
  '{{منطوق_حكم_أول_درجة}}': (c) => c.firstInstanceJudgment || '',

  // ── أطراف الدعوى ──
  '{{اسم_الموكل}}':       (c) => c.clientName || c.plaintiffName || '',
  '{{الصفة}}':            (c) => getCaseRoleCapacity(c),
  '{{اسم_الخصم}}':        (c) => c.opponentName || c.defendantName || '',
  '{{صفة_الخصم}}':        (c) => c.opponentRole || '',
  '{{اسم_المستشار}}':     (c) => c.assignedCounsel || '',
  '{{رقم_التوكيل}}':      (c) => c.powerOfAttorneyNumber || c.poaNumber || '',

  // ── الجلسات والأحكام ──
  '{{تاريخ_الجلسة_القادمة}}': (c) => formatDateAr(c.nextSessionDate),
  '{{آخر_قرار}}':          (c) => getCaseSessionResult(c),
  '{{نوع_الحكم}}':         (c) => c.judgmentType || '',
  '{{منطوق_الحكم}}':       (c) => c.judgmentText || c.verdict || '',
  '{{ميعاد_الطعن}}':       (c) => {
    if (c.appealDeadline) return formatDateAr(c.appealDeadline);
    if (c.appealDeadlineDays && c.judgmentDate) {
      try {
        const base = new Date(c.judgmentDate);
        base.setDate(base.getDate() + Number(c.appealDeadlineDays));
        return formatDateAr(base);
      } catch { return ''; }
    }
    return '';
  },

  // ── تواريخ عامة ──
  '{{تاريخ_اليوم}}':      () => formatDateAr(new Date()),
  '{{تاريخ_اليوم_هجري}}': () => {
    try {
      return new Date().toLocaleDateString('ar-SA-u-ca-islamic', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch { return ''; }
  },

  // ── بيانات مكتبية ──
  '{{اسم_المكتب}}':       (c) => c.officeName || c.workspaceName || '',
  '{{عنوان_المكتب}}':     (c) => c.officeAddress || '',
};

// ─── Conditional Blocks ─────────────────────────────────────

/**
 * بنية: {{#لو_مدعي}}محتوى يظهر فقط لو الموكل مدعي{{/لو_مدعي}}
 * الشروط المدعومة:
 */
const CONDITION_EVALUATORS = {
  'لو_مدعي':     (c) => c.isPlaintiff === true || getCaseRoleCapacity(c) === 'مدعي',
  'لو_مدعى_عليه': (c) => c.isPlaintiff === false || getCaseRoleCapacity(c) === 'مدعى عليه',
  'لو_جنائي':    (c) => getCaseProcedureTrack(c).includes('جنائي') || getCaseProcedureTrack(c).includes('جنح'),
  'لو_مدني':     (c) => getCaseProcedureTrack(c).includes('مدني'),
  'لو_اداري':    (c) => getCaseProcedureTrack(c).includes('إداري') || getCaseProcedureTrack(c).includes('اداري'),
  'لو_أسرة':     (c) => getCaseProcedureTrack(c).includes('أسرة') || getCaseProcedureTrack(c).includes('اسرة'),
  'لو_حكم':      (c) => Boolean(c.judgmentType || c.judgmentText || c.verdict),
  'لو_طعن':      (c) => Boolean(c.appealDeadline || c.appealDeadlineDays),
};

function processConditionalBlocks(html, caseData) {
  let result = html;

  for (const [condName, evaluator] of Object.entries(CONDITION_EVALUATORS)) {
    const openTag = `{{#${condName}}}`;
    const closeTag = `{{/${condName}}}`;
    const regex = new RegExp(
      escapeRegex(openTag) + '([\\s\\S]*?)' + escapeRegex(closeTag),
      'g'
    );

    result = result.replace(regex, (_match, innerContent) => {
      try {
        return evaluator(caseData || {}) ? innerContent : '';
      } catch {
        return '';
      }
    });
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Public API ─────────────────────────────────────────────

/**
 * يدمج نموذج HTML مع بيانات قضية.
 * @param {string} templateHtml — محتوى النموذج (قد يحتوي على HTML)
 * @param {object} caseData — بيانات القضية من CaseContext
 * @returns {string} HTML بعد الدمج
 */
export function parseTemplate(templateHtml, caseData) {
  if (!templateHtml) return '';

  // المرحلة 1: Conditional Blocks أولاً
  let result = processConditionalBlocks(templateHtml, caseData);

  // المرحلة 2: استبدال Tags
  for (const [tag, resolver] of Object.entries(TEMPLATE_TAGS)) {
    try {
      const value = resolver(caseData || {});
      // لو القيمة فاضية: نُبقي الـ tag كما هو (مؤشر للمستخدم إن البيانات ناقصة)
      if (value !== '' && value != null) {
        result = result.replaceAll(tag, String(value));
      }
    } catch {
      // tag يبقى كما هو
    }
  }

  return result;
}

/**
 * يُرجع قائمة الـ tags المتاحة مُقسَّمة بالفئات.
 * @returns {Array<{category: string, tags: string[]}>}
 */
export function getAvailableTagsGrouped() {
  return [
    {
      category: 'بيانات القضية',
      tags: [
        '{{رقم_القضية}}', '{{سنة_القضية}}', '{{اسم_المحكمة}}',
        '{{الدائرة}}', '{{نوع_القضية}}', '{{موضوع_القضية}}',
        '{{درجة_التقاضي}}', '{{رقم_أول_درجة}}', '{{محكمة_أول_درجة}}', '{{تاريخ_أول_درجة}}', '{{منطوق_حكم_أول_درجة}}',
      ],
    },
    {
      category: 'أطراف الدعوى',
      tags: [
        '{{اسم_الموكل}}', '{{الصفة}}', '{{اسم_الخصم}}',
        '{{صفة_الخصم}}', '{{اسم_المستشار}}', '{{رقم_التوكيل}}',
      ],
    },
    {
      category: 'الجلسات والأحكام',
      tags: [
        '{{تاريخ_الجلسة_القادمة}}', '{{آخر_قرار}}',
        '{{نوع_الحكم}}', '{{منطوق_الحكم}}', '{{ميعاد_الطعن}}',
      ],
    },
    {
      category: 'تواريخ',
      tags: ['{{تاريخ_اليوم}}', '{{تاريخ_اليوم_هجري}}'],
    },
    {
      category: 'بيانات المكتب',
      tags: ['{{اسم_المكتب}}', '{{عنوان_المكتب}}'],
    },
  ];
}

/**
 * يُرجع قائمة مسطحة بكل الـ tags (backward compatible).
 * @returns {string[]}
 */
export function getAvailableTags() {
  return Object.keys(TEMPLATE_TAGS);
}

/**
 * يُرجع قائمة الـ Conditional Blocks المتاحة.
 * @returns {Array<{tag: string, label: string}>}
 */
export function getAvailableConditions() {
  return [
    { tag: 'لو_مدعي', label: 'يظهر فقط لو الموكل مدعي' },
    { tag: 'لو_مدعى_عليه', label: 'يظهر فقط لو الموكل مدعى عليه' },
    { tag: 'لو_جنائي', label: 'يظهر فقط للقضايا الجنائية' },
    { tag: 'لو_مدني', label: 'يظهر فقط للقضايا المدنية' },
    { tag: 'لو_اداري', label: 'يظهر فقط للقضايا الإدارية' },
    { tag: 'لو_أسرة', label: 'يظهر فقط لقضايا الأسرة' },
    { tag: 'لو_حكم', label: 'يظهر فقط لو في حكم' },
    { tag: 'لو_طعن', label: 'يظهر فقط لو في ميعاد طعن' },
  ];
}

export default { parseTemplate, getAvailableTags, getAvailableTagsGrouped, getAvailableConditions };
