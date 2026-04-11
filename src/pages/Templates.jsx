import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import {
  getAvailableTags,
  getAvailableTagsGrouped,
  getAvailableConditions,
  parseTemplate,
} from '@/engine/TemplateParser.js';
import { confirmDialog, promptDialog } from '@/utils/browserFeedback.js';

/* ─── Constants ──────────────────────────────────────────── */

const TEMPLATE_TYPES = {
  memo: { label: 'مذكرة دفاع', icon: '📝' },
  lawsuit: { label: 'صحيفة دعوى', icon: '⚖️' },
  letter: { label: 'خطاب', icon: '✉️' },
  notice: { label: 'إنذار', icon: '⚠️' },
  report: { label: 'تقرير', icon: '📊' },
  appeal: { label: 'صحيفة طعن', icon: '🔄' },
  poa: { label: 'توكيل', icon: '🔑' },
  custom: { label: 'مخصص', icon: '📄' },
};

const DEFAULT_TEMPLATE_TYPE_OPTIONS = Object.entries(TEMPLATE_TYPES).map(([value, meta]) => ({
  value,
  label: meta.label,
  icon: meta.icon,
}));

function normalizeTemplateTypeOptions(list) {
  const source = Array.isArray(list) ? list : [];
  const normalized = source
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (!trimmed) return null;
        return {
          value: `custom_${index}`,
          label: trimmed,
          icon: '📄',
        };
      }

      const value = String(entry?.value || '').trim();
      const label = String(entry?.label || '').trim();
      const icon = String(entry?.icon || '').trim() || '📄';
      if (!value || !label) return null;
      return { value, label, icon };
    })
    .filter(Boolean);

  return normalized.length ? normalized : DEFAULT_TEMPLATE_TYPE_OPTIONS;
}

function buildTypeValueFromLabel(label) {
  const base = String(label || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return base ? `type_${base}` : `type_${Date.now()}`;
}

const DEFAULT_TEMPLATES = [
  {
    name: 'مذكرة دفاع — نموذج أساسي',
    type: 'memo',
    content: `<h2 style="text-align:center">مذكرة بدفاع</h2>
<p style="text-align:center">{{اسم_الموكل}} — {{الصفة}}</p>
<p style="text-align:center">في الدعوى رقم {{رقم_القضية}} لسنة {{سنة_القضية}}</p>
<p style="text-align:center">أمام {{اسم_المحكمة}} — {{الدائرة}}</p>
<p style="text-align:center">جلسة {{تاريخ_الجلسة_القادمة}}</p>
<hr/>
<h3>أولاً: الوقائع</h3>
<p>تخلص وقائع الدعوى في أن...</p>
<h3>ثانياً: الدفاع</h3>
<p>ندفع بـ...</p>
<h3>ثالثاً: الطلبات</h3>
<p>بناءً على ما تقدم، يلتمس {{الصفة}} الحكم بـ...</p>
<p style="text-align:left">وكيل {{الصفة}}<br/>{{اسم_المستشار}}</p>
<p style="text-align:left">التاريخ: {{تاريخ_اليوم}}</p>`,
  },
  {
    name: 'إنذار على يد محضر',
    type: 'notice',
    content: `<h2 style="text-align:center">إنذار رسمي على يد محضر</h2>
<p><strong>من:</strong> {{اسم_الموكل}} — بصفته {{الصفة}}</p>
<p><strong>إلى:</strong> {{اسم_الخصم}}</p>
<p><strong>بخصوص:</strong> {{موضوع_القضية}}</p>
<hr/>
<p>أتشرف بأن أُنذركم رسمياً بـ...</p>
<p>وفي حالة عدم الاستجابة خلال خمسة عشر يوماً من تاريخ هذا الإنذار، سنضطر لاتخاذ كافة الإجراءات القانونية.</p>
<p style="text-align:left">مع فائق الاحترام،<br/>{{اسم_المستشار}}<br/>بموجب التوكيل رقم {{رقم_التوكيل}}</p>
<p style="text-align:left">التاريخ: {{تاريخ_اليوم}}</p>`,
  },
  {
    name: 'صحيفة طعن بالاستئناف',
    type: 'appeal',
    content: `<h2 style="text-align:center">صحيفة طعن بالاستئناف</h2>
<p style="text-align:center">في الحكم الصادر في الدعوى رقم {{رقم_القضية}} لسنة {{سنة_القضية}}</p>
<p style="text-align:center">أمام {{اسم_المحكمة}}</p>
<hr/>
<p><strong>المستأنف:</strong> {{اسم_الموكل}}</p>
<p><strong>المستأنف ضده:</strong> {{اسم_الخصم}}</p>
{{#لو_حكم}}<p><strong>منطوق الحكم المطعون فيه:</strong> {{منطوق_الحكم}}</p>{{/لو_حكم}}
{{#لو_طعن}}<p><strong>ميعاد الطعن ينتهي في:</strong> {{ميعاد_الطعن}}</p>{{/لو_طعن}}
<h3>أسباب الاستئناف</h3>
<p>أولاً: ...</p>
<p>ثانياً: ...</p>
<h3>الطلبات</h3>
<p>يلتمس المستأنف قبول الاستئناف شكلاً وفي الموضوع بإلغاء الحكم المستأنف والقضاء مجدداً بـ...</p>`,
  },
];

const ARABIC_GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Almarai:wght@300;400;700;800&family=Cairo:wght@400;600;700;800&family=Changa:wght@400;600;700&family=El+Messiri:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Markazi+Text:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Reem+Kufi:wght@400;500;700&family=Tajawal:wght@400;500;700;800&display=swap';

const ARABIC_FONT_OPTIONS = [
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'Changa', label: 'Changa' },
  { value: 'Noto Naskh Arabic', label: 'Noto Naskh Arabic' },
  { value: 'Amiri', label: 'Amiri' },
  { value: 'El Messiri', label: 'El Messiri' },
  { value: 'Markazi Text', label: 'Markazi Text' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' },
  { value: 'Reem Kufi', label: 'Reem Kufi' },
];

const FONT_SIZE_OPTIONS = [13, 14, 15, 16, 18, 20, 24];
const DEFAULT_EDITOR_HEIGHT = 540;
const MIN_EDITOR_HEIGHT = 360;
const MAX_EDITOR_HEIGHT = 1600;
const MIN_IMAGE_WIDTH = 90;
const IMAGE_RESIZE_HANDLE_SIZE = 18;

const QUICK_BLOCKS = [
  {
    id: 'intro',
    label: 'مقدمة المذكرة',
    html: '<h3>أولاً: مقدمة</h3><p>نتشرف بعرض دفاعنا في الدعوى الماثلة على النحو التالي...</p>',
    types: ['memo', 'lawsuit', 'appeal', 'report', 'notice', 'letter'],
  },
  {
    id: 'facts',
    label: 'الوقائع',
    html: '<h3>ثانياً: الوقائع</h3><p>تخلص وقائع الدعوى في أن...</p>',
    types: ['memo', 'lawsuit', 'appeal', 'report'],
  },
  {
    id: 'defense',
    label: 'الدفاع',
    html: '<h3>ثالثاً: أوجه الدفاع</h3><p>نتمسك بالدفاع الآتي...</p>',
    types: ['memo', 'lawsuit', 'appeal'],
  },
  {
    id: 'requests',
    label: 'الطلبات',
    html: '<h3>الطلبات</h3><p>يلتمس الطالب الحكم له بـ...</p>',
    types: ['memo', 'lawsuit', 'appeal', 'notice'],
  },
  {
    id: 'signature',
    label: 'الخاتمة والتوقيع',
    html: '<p style="text-align:left">وتفضلوا بقبول فائق الاحترام</p><p style="text-align:left">وكيل {{الصفة}}<br/>{{اسم_المستشار}}</p>',
    types: [],
  },
];

const SMART_BLOCK_HINTS = {
  memo: ['مقدمة', 'وقائع', 'دفاع', 'طلبات', 'خاتمة', 'توقيع'],
  lawsuit: ['مقدمة', 'وقائع', 'طلبات', 'دفوع', 'خاتمة'],
  appeal: ['مقدمة', 'أسباب', 'طلبات', 'خاتمة'],
  report: ['مقدمة', 'بيان', 'ملخص', 'توصية', 'خاتمة'],
  notice: ['مقدمة', 'إنذار', 'مهلة', 'إجراء', 'خاتمة'],
  letter: ['مقدمة', 'موضوع', 'خاتمة', 'توقيع'],
  poa: ['بيانات', 'تفويض', 'صلاحيات', 'توقيع'],
};

function resolveSmartHints(typeValue, typeLabel) {
  const t = String(typeValue || '').toLowerCase();
  const l = String(typeLabel || '').toLowerCase();
  if (SMART_BLOCK_HINTS[t]) return SMART_BLOCK_HINTS[t];

  if (l.includes('مذكرة') || l.includes('memo')) return SMART_BLOCK_HINTS.memo;
  if (l.includes('دعوى') || l.includes('lawsuit')) return SMART_BLOCK_HINTS.lawsuit;
  if (l.includes('طعن') || l.includes('appeal')) return SMART_BLOCK_HINTS.appeal;
  if (l.includes('تقرير') || l.includes('report')) return SMART_BLOCK_HINTS.report;
  if (l.includes('إنذار') || l.includes('notice')) return SMART_BLOCK_HINTS.notice;
  if (l.includes('خطاب') || l.includes('letter')) return SMART_BLOCK_HINTS.letter;
  if (l.includes('توكيل') || l.includes('poa')) return SMART_BLOCK_HINTS.poa;

  return [];
}

function normalizeQuickBlocks(list) {
  const source = Array.isArray(list) ? list : [];
  const cleaned = source
    .map((entry, index) => {
      const id = String(entry?.id || `block_${index}_${Date.now()}`).trim();
      const label = String(entry?.label || '').trim();
      const html = String(entry?.html || '').trim();
      const types = Array.isArray(entry?.types)
        ? entry.types.map((type) => String(type || '').trim()).filter(Boolean)
        : [];
      if (!label || !html) return null;
      return { id, label, html, types: [...new Set(types)] };
    })
    .filter(Boolean);
  return cleaned.length ? cleaned : QUICK_BLOCKS;
}

function buildQuickBlockId(label) {
  const normalized = String(label || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return normalized ? `blk_${normalized}_${Date.now()}` : `blk_${Date.now()}`;
}

function sanitizeInlineStyle(styleText) {
  const allowedProps = new Set([
    'font-size',
    'font-family',
    'font-weight',
    'font-style',
    'text-decoration',
    'text-align',
    'line-height',
    'direction',
    'white-space',
    'color',
    'background',
    'background-color',
    'margin',
    'margin-top',
    'margin-bottom',
    'margin-right',
    'margin-left',
    'padding',
    'padding-top',
    'padding-bottom',
    'padding-right',
    'padding-left',
    'border',
    'border-top',
    'border-bottom',
    'border-right',
    'border-left',
    'border-color',
    'border-width',
    'border-style',
    'border-collapse',
    'border-spacing',
    'vertical-align',
    'width',
    'height',
    'max-width',
    'min-width',
    'min-height',
    'list-style-type',
    'list-style-position',
    'text-indent',
    'display',
  ]);

  return String(styleText || '')
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const idx = chunk.indexOf(':');
      if (idx === -1) return null;
      const name = chunk.slice(0, idx).trim().toLowerCase();
      const value = chunk.slice(idx + 1).trim();
      if (!allowedProps.has(name)) return null;
      if (!value) return null;
      if (/expression\(|javascript:|vbscript:|url\(/i.test(value)) return null;
      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeUrl(url, { allowDataImage = false } = {}) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^javascript:|^vbscript:/i.test(value)) return '';
  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return value;
  if (/^blob:/i.test(value)) return value;
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(value)) return value;
  return '';
}

function mergeElementStyles(element, extraStyles) {
  if (!element) return;
  const current = sanitizeInlineStyle(element.getAttribute('style') || '');
  const merged = [current, extraStyles].filter(Boolean).join('; ');
  const safe = sanitizeInlineStyle(merged);
  if (safe) element.setAttribute('style', safe);
  else element.removeAttribute('style');
}

function sanitizePastedHtml(rawHtml) {
  const html = String(rawHtml || '').trim();
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const forbidden = ['meta', 'link', 'style', 'script', 'xml', 'o:p'];
  forbidden.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((node) => node.remove());
  });

  doc.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '');

      if (name.startsWith('on')) {
        element.removeAttribute(attr.name);
        return;
      }

      if (name === 'style') {
        if (/mso-|tab-stops|page-break-before/i.test(value)) {
          const safeStyle = sanitizeInlineStyle(value.replace(/mso-[^:;]+:[^;]+;?/gi, ''));
          if (safeStyle) element.setAttribute('style', safeStyle);
          else element.removeAttribute(attr.name);
          return;
        }
        const safeStyle = sanitizeInlineStyle(value);
        if (safeStyle) element.setAttribute('style', safeStyle);
        else element.removeAttribute(attr.name);
        return;
      }

      if (name === 'href') {
        const safeHref = sanitizeUrl(value);
        if (safeHref) {
          element.setAttribute('href', safeHref);
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        } else {
          element.removeAttribute(attr.name);
        }
        return;
      }

      if (name === 'src') {
        const safeSrc = sanitizeUrl(value, { allowDataImage: element.tagName === 'IMG' });
        if (safeSrc) element.setAttribute('src', safeSrc);
        else element.removeAttribute(attr.name);
        return;
      }

      if (name === 'width' || name === 'height') {
        const normalized = String(value || '').trim();
        if (/^\d+(px|%)?$/i.test(normalized)) {
          element.setAttribute(attr.name, normalized);
        } else {
          element.removeAttribute(attr.name);
        }
        return;
      }

      if ((name === 'colspan' || name === 'rowspan') && /^(?:[1-9]\d?)$/.test(String(value || '').trim())) {
        return;
      }

      if (name === 'class' || name === 'id' || name === 'lang') {
        element.removeAttribute(attr.name);
      }
    });
  });

  doc.querySelectorAll('table').forEach((table) => {
    mergeElementStyles(table, 'width: 100%; border-collapse: collapse; margin: 12px 0;');
  });

  doc.querySelectorAll('th, td').forEach((cell) => {
    mergeElementStyles(cell, 'vertical-align: top;');
  });

  doc.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('src')) {
      img.remove();
      return;
    }
    mergeElementStyles(img, 'max-width: 100%; height: auto;');
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', 'صورة مرفقة');
    }
  });

  const cleaned = String(doc.body.innerHTML || '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .trim();

  return cleaned;
}

function decodeRtfUnicode(text) {
  return String(text || '').replace(/\\u(-?\d+)\??/g, (_, codePoint) => {
    const value = Number(codePoint);
    if (!Number.isFinite(value)) return '';
    const normalized = value < 0 ? 65536 + value : value;
    try {
      return String.fromCharCode(normalized);
    } catch {
      return '';
    }
  });
}

function extractPlainTextFromRtf(rtf) {
  const source = String(rtf || '').trim();
  if (!source) return '';

  return decodeRtfUnicode(source)
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\line/gi, '\n')
    .replace(/\\tab/gi, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPlainTextFromHtml(html) {
  const source = String(html || '').trim();
  if (!source) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/html');
    return String(doc.body?.innerText || doc.body?.textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

function getClipboardInsertPayload(clipboardData) {
  const html = String(
    clipboardData?.getData('text/html')
    || clipboardData?.getData('Html')
    || ''
  ).trim();
  const text = String(
    clipboardData?.getData('text/plain')
    || clipboardData?.getData('Text')
    || clipboardData?.getData('text')
    || ''
  ).trim();
  const rtf = String(
    clipboardData?.getData('text/rtf')
    || clipboardData?.getData('application/rtf')
    || ''
  ).trim();

  if (html) {
    const cleanedHtml = sanitizePastedHtml(html);
    if (cleanedHtml) {
      return { value: cleanedHtml, treatAsHtml: true };
    }

    const extractedHtmlText = extractPlainTextFromHtml(html);
    if (extractedHtmlText) {
      return { value: extractedHtmlText, treatAsHtml: false };
    }
  }

  if (text) {
    return { value: text, treatAsHtml: false };
  }

  if (rtf) {
    const extractedText = extractPlainTextFromRtf(rtf);
    if (extractedText) {
      return { value: extractedText, treatAsHtml: false };
    }
  }

  return { value: '', treatAsHtml: false };
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Styles ─────────────────────────────────────────────── */

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildEditorImageHtml(src, alt = 'صورة مرفقة') {
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt);
  return `<p style="text-align:center"><img src="${safeSrc}" alt="${safeAlt}" style="display:block;max-width:100%;width:50%;height:auto;margin:12px auto" /></p>`;
}

const S = {
  page: {
    display: 'grid',
    gap: '16px',
    direction: 'rtl',
    fontFamily: "'Cairo', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '16px',
    alignItems: 'start',
  },
  sidebar: {
    padding: '14px',
    display: 'grid',
    gap: '10px',
    maxHeight: 'calc(100vh - 160px)',
    overflowY: 'auto',
  },
  sidebarFilter: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  filterChip: (active) => ({
    padding: '4px 12px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Cairo', sans-serif",
    background: active ? '#1e293b' : '#f1f5f9',
    color: active ? '#fff' : '#475569',
    transition: 'all 0.15s ease',
  }),
  templateCard: (isActive) => ({
    padding: '12px',
    border: isActive ? '2px solid #f59e0b' : '1px solid #e2e8f0',
    borderRadius: '10px',
    display: 'grid',
    gap: '8px',
    cursor: 'pointer',
    background: isActive ? '#fffbeb' : '#fff',
    transition: 'all 0.15s ease',
  }),
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  cardName: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  typeBadge: {
    padding: '2px 10px',
    borderRadius: '999px',
    background: '#f1f5f9',
    fontSize: '11px',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  cardActions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end',
  },
  smallBtn: {
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '11.5px',
    fontFamily: "'Cairo', sans-serif",
    color: '#475569',
    transition: 'all 0.1s ease',
  },
  dangerBtn: {
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '11.5px',
    fontFamily: "'Cairo', sans-serif",
    color: '#dc2626',
  },
  main: {
    display: 'grid',
    gap: '14px',
  },
  commandBar: {
    position: 'sticky',
    top: '8px',
    zIndex: 20,
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff',
    padding: '10px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  },
  viewTabs: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  viewTabBtn: (active) => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: active ? '1px solid #1e293b' : '1px solid #e2e8f0',
    background: active ? '#1e293b' : '#fff',
    color: active ? '#fff' : '#475569',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 600,
  }),
  commandActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  commandBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid #dbe4f0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  commandBtnPrimary: {
    padding: '8px 18px',
    borderRadius: '10px',
    border: '1px solid #1e293b',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)',
  },
  commandBtnAccent: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid #fed7aa',
    background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)',
    color: '#c2410c',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 6px 18px rgba(249, 115, 22, 0.12)',
  },
  commandBtnIcon: {
    fontSize: '14px',
    lineHeight: 1,
    opacity: 0.9,
  },
  compactSelect: {
    padding: '7px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontFamily: "'Cairo', sans-serif",
    direction: 'rtl',
    background: '#fff',
    cursor: 'pointer',
    minWidth: '130px',
  },
  workAreaGrid: (isSplit) => ({
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: isSplit ? '1fr 1fr' : '1fr',
  }),
  editorSection: {
    padding: '16px',
    display: 'grid',
    gap: '14px',
    borderRadius: '12px',
    background: '#fff',
    border: '1px solid #e2e8f0',
  },
  inputRow: {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: '1fr 200px',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Cairo', sans-serif",
    direction: 'rtl',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Cairo', sans-serif",
    direction: 'rtl',
    background: '#fff',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    padding: '8px 10px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  toolbarBtn: {
    padding: '5px 10px',
    border: '1px solid transparent',
    borderRadius: '5px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    color: '#475569',
    fontFamily: 'serif',
    minWidth: '32px',
    textAlign: 'center',
    transition: 'all 0.1s ease',
  },
  toolbarBtnActive: {
    padding: '5px 10px',
    border: '1px solid #fed7aa',
    borderRadius: '5px',
    background: '#fff7ed',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    color: '#c2410c',
    fontFamily: "'Cairo', sans-serif",
    minWidth: '52px',
    textAlign: 'center',
    transition: 'all 0.1s ease',
  },
  toolbarBtnDisabled: {
    padding: '5px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '5px',
    background: '#f8fafc',
    cursor: 'not-allowed',
    fontSize: '12px',
    fontWeight: 700,
    color: '#94a3b8',
    fontFamily: "'Cairo', sans-serif",
    minWidth: '52px',
    textAlign: 'center',
    opacity: 0.75,
  },
  toolbarDivider: {
    width: '1px',
    height: '22px',
    background: '#cbd5e1',
    margin: '0 4px',
  },
  imageHint: {
    fontSize: '11.5px',
    color: '#9a3412',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '999px',
    padding: '4px 10px',
  },
  tagSection: {
    display: 'grid',
    gap: '8px',
  },
  tagCategoryLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '2px',
  },
  tagRow: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
  },
  tagBtn: {
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: '11.5px',
    fontFamily: "'Cairo', sans-serif",
    color: '#334155',
    transition: 'all 0.1s ease',
    direction: 'ltr',
  },
  condBtn: {
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px dashed #93c5fd',
    background: '#eff6ff',
    cursor: 'pointer',
    fontSize: '11.5px',
    fontFamily: "'Cairo', sans-serif",
    color: '#1d4ed8',
  },
  editor: {
    minHeight: `${MIN_EDITOR_HEIGHT}px`,
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
    fontFamily: "'Cairo', sans-serif",
    fontSize: '15px',
    lineHeight: 2,
    outline: 'none',
    direction: 'rtl',
    background: '#fff',
    overflowY: 'auto',
  },
  editorShell: {
    position: 'relative',
    display: 'grid',
    gap: '8px',
  },
  editorResizeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  editorResizeHandleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '96px',
    padding: '6px 10px',
    border: '1px solid #dbe4f0',
    borderRadius: '999px',
    background: '#f8fafc',
    cursor: 'ns-resize',
  },
  editorResizeHandleBar: {
    width: '42px',
    height: '4px',
    borderRadius: '999px',
    background: '#94a3b8',
    boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset',
  },
  editorResizeText: {
    fontSize: '12px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editorResizeBadge: {
    padding: '3px 8px',
    borderRadius: '999px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#334155',
    fontWeight: 700,
  },
  imageResizeHandle: {
    position: 'absolute',
    width: `${IMAGE_RESIZE_HANDLE_SIZE}px`,
    height: `${IMAGE_RESIZE_HANDLE_SIZE}px`,
    borderRadius: '6px',
    border: '2px solid #fff',
    background: '#f59e0b',
    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.22)',
    cursor: 'nwse-resize',
    zIndex: 5,
    transform: 'translate(-50%, -50%)',
    touchAction: 'none',
  },
  imageResizeBadge: {
    position: 'absolute',
    padding: '4px 8px',
    borderRadius: '999px',
    background: '#0f172a',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.18)',
    zIndex: 5,
    transform: 'translate(-50%, -100%)',
    pointerEvents: 'none',
  },
  saveRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  primaryBtn: {
    padding: '8px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#1e293b',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  secondaryBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'Cairo', sans-serif",
  },
  previewSection: {
    padding: '16px',
    display: 'grid',
    gap: '12px',
    borderRadius: '12px',
    background: '#fff',
    border: '1px solid #e2e8f0',
  },
  previewControls: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  previewFrame: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    minHeight: '200px',
    background: '#f8fafc',
    lineHeight: 1.9,
    direction: 'rtl',
    fontFamily: "'Cairo', sans-serif",
    fontSize: '15px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
    overflow: 'auto',
  },
  previewPaper: {
    width: '210mm',
    maxWidth: '100%',
    minHeight: '297mm',
    margin: '0 auto',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    padding: '18mm 14mm',
    lineHeight: 2,
    color: '#1e293b',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.6,
  },
  autoSaveIndicator: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  mobileLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
  },
  fullscreenEditorSection: {
    position: 'fixed',
    inset: '12px',
    zIndex: 1300,
    padding: '16px',
    display: 'grid',
    gap: '14px',
    borderRadius: '16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
    overflow: 'hidden',
    gridTemplateRows: 'auto auto auto 1fr auto',
  },
  fullscreenEditor: {
    minHeight: 'unset',
    height: '100%',
  },
};

/* ─── Component ──────────────────────────────────────────── */

export default function Templates() {
  const navigate = useNavigate();
  const location = useLocation();
  const editorRef = useRef(null);
  const editorShellRef = useRef(null);
  const pasteEditorRef = useRef(null);
  const imageInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const selectedEditorElementRef = useRef(null);
  const selectedImageRef = useRef(null);
  const imageResizeSessionRef = useRef(null);
  const editorResizeSessionRef = useRef(null);
  const { currentWorkspace } = useWorkspace();
  const { cases } = useCases();

  /* state */
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('memo');
  const [templateTypeOptions, setTemplateTypeOptions] = useState(DEFAULT_TEMPLATE_TYPE_OPTIONS);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [draftTypeOptions, setDraftTypeOptions] = useState(DEFAULT_TEMPLATE_TYPE_OPTIONS);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📄');
  const [templateContent, setTemplateContent] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [caseDocumentDraft, setCaseDocumentDraft] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCondPicker, setShowCondPicker] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [quickBlocks, setQuickBlocks] = useState(QUICK_BLOCKS);
  const [showBlocksManager, setShowBlocksManager] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState(QUICK_BLOCKS);
  const [newBlockLabel, setNewBlockLabel] = useState('');
  const [newBlockContent, setNewBlockContent] = useState('');
  const [newBlockTypes, setNewBlockTypes] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editorViewMode, setEditorViewMode] = useState('edit');
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [copyMode, setCopyMode] = useState('text');
  const [editorFontFamily, setEditorFontFamily] = useState('Cairo');
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [editorHeight, setEditorHeight] = useState(DEFAULT_EDITOR_HEIGHT);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [pasteBufferIsHtml, setPasteBufferIsHtml] = useState(false);
  const [selectedEditorElementToken, setSelectedEditorElementToken] = useState('');
  const [selectedImageToken, setSelectedImageToken] = useState('');
  const [imageResizeHandle, setImageResizeHandle] = useState(null);

  const workspaceId = String(currentWorkspace?.id || '').trim();

  /* responsive */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isEditorFullscreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditorFullscreen]);

  useEffect(() => {
    if (document.getElementById('lb-arabic-fonts-link')) return;
    const link = document.createElement('link');
    link.id = 'lb-arabic-fonts-link';
    link.rel = 'stylesheet';
    link.href = ARABIC_GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  /* derived */
  const selectedCase = useMemo(
    () =>
      (Array.isArray(cases)
        ? cases.find((c) => String(c?.id || '') === String(selectedCaseId || ''))
        : null) || null,
    [cases, selectedCaseId]
  );

  const filteredTemplates = useMemo(() => {
    if (sidebarFilter === 'all') return templates;
    return templates.filter((t) => t.type === sidebarFilter);
  }, [templates, sidebarFilter]);

  const templateTypeMap = useMemo(() => {
    const map = new Map();
    templateTypeOptions.forEach((entry) => {
      map.set(String(entry.value), entry);
    });
    return map;
  }, [templateTypeOptions]);

  const defaultTemplateTypeValue = useMemo(
    () => String(templateTypeOptions?.[0]?.value || 'memo'),
    [templateTypeOptions]
  );

  const smartHints = useMemo(() => {
    const typeMeta = templateTypeMap.get(String(templateType || '')) || {};
    return resolveSmartHints(templateType, typeMeta.label || '');
  }, [templateType, templateTypeMap]);

  const prioritizedQuickBlocks = useMemo(() => {
    const base = Array.isArray(quickBlocks) ? [...quickBlocks] : [];
    const activeType = String(templateType || '').trim();
    const allowed = base.filter((block) => {
      const types = Array.isArray(block?.types) ? block.types : [];
      if (!types.length) return true;
      return types.includes(activeType);
    });

    if (!smartHints.length) {
      return allowed.sort((a, b) => String(a?.label || '').localeCompare(String(b?.label || ''), 'ar'));
    }

    const score = (label) => {
      const text = String(label || '').toLowerCase();
      const idx = smartHints.findIndex((hint) => text.includes(String(hint || '').toLowerCase()));
      return idx === -1 ? 999 : idx;
    };

    return allowed.sort((a, b) => {
      const sa = score(a?.label);
      const sb = score(b?.label);
      if (sa !== sb) return sa - sb;
      return String(a?.label || '').localeCompare(String(b?.label || ''), 'ar');
    });
  }, [quickBlocks, templateType, smartHints]);

  const tagGroups = useMemo(() => getAvailableTagsGrouped(), []);
  const conditions = useMemo(() => getAvailableConditions(), []);

  /* ─── Data Loading ───────────────────────────────────────── */

  const loadTemplates = useCallback(async () => {
    if (!workspaceId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await storage.listTemplates(workspaceId);
      setTemplates(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(e);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!workspaceId) {
      setTemplateTypeOptions(DEFAULT_TEMPLATE_TYPE_OPTIONS);
      return;
    }

    let mounted = true;
    const loadTypeOptions = async () => {
      try {
        const loaded = await storage.getWorkspaceOptions(workspaceId, 'templateTypes');
        if (!mounted) return;
        setTemplateTypeOptions(normalizeTemplateTypeOptions(loaded));
      } catch {
        if (mounted) setTemplateTypeOptions(DEFAULT_TEMPLATE_TYPE_OPTIONS);
      }
    };

    loadTypeOptions();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setQuickBlocks(QUICK_BLOCKS);
      return;
    }

    let mounted = true;
    const loadQuickBlocks = async () => {
      try {
        const loaded = await storage.getWorkspaceOptions(workspaceId, 'templateQuickBlocks');
        if (!mounted) return;
        setQuickBlocks(normalizeQuickBlocks(loaded));
      } catch {
        if (mounted) setQuickBlocks(QUICK_BLOCKS);
      }
    };

    loadQuickBlocks();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    const valid = templateTypeOptions.some((entry) => String(entry.value) === String(templateType));
    if (!valid) {
      setTemplateType(defaultTemplateTypeValue);
    }
  }, [templateType, templateTypeOptions, defaultTemplateTypeValue]);

  /* ─── Editor Sync ────────────────────────────────────────── */

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== templateContent) {
      editorRef.current.innerHTML = templateContent;
    }
  }, [templateContent]);

  useEffect(() => {
    if (!selectedTemplateId) setPreviewHtml('');
  }, [selectedTemplateId]);

  /* ─── Auto-save ──────────────────────────────────────────── */

  useEffect(() => {
    if (!isDirty || !selectedTemplateId || !workspaceId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, templateContent, templateName, templateType]);

  /* ─── Actions ────────────────────────────────────────────── */

  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  useEffect(() => {
    const incomingDoc = location.state?.caseDocument || null;
    const incomingCaseId = String(location.state?.selectedCaseId || incomingDoc?.caseId || '').trim();
    if (!incomingDoc && !incomingCaseId) return;

    if (incomingDoc) {
      setSelectedTemplateId('');
      setTemplateName(String(incomingDoc?.title || '').trim() || 'مستند قضية');
      setTemplateType(String(incomingDoc?.type || '').trim() || defaultTemplateTypeValue);
      setTemplateContent(String(incomingDoc?.htmlContent || ''));
      setPreviewHtml(String(incomingDoc?.htmlContent || ''));
      setSelectedCaseId(incomingCaseId);
      setCaseDocumentDraft({
        ...incomingDoc,
        caseId: incomingCaseId || String(incomingDoc?.caseId || '').trim(),
      });
      setIsDirty(false);
      setEditorViewMode('edit');
      flashSuccess('تم تحميل مستند القضية داخل المحرر');
    } else if (incomingCaseId) {
      setSelectedCaseId(incomingCaseId);
      flashSuccess('تم ربط القضية بالمحرر');
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [defaultTemplateTypeValue, location.pathname, location.state, navigate]);

  const resetEditor = () => {
    clearSelectedImage();
    setImageResizeHandle(null);
    setSelectedTemplateId('');
    setTemplateName('');
    setTemplateType(defaultTemplateTypeValue);
    setTemplateContent('');
    setCaseDocumentDraft(null);
    setPreviewHtml('');
    setIsDirty(false);
    setEditorViewMode('edit');
    setShowTagPicker(false);
    setShowCondPicker(false);
    setShowBlockPicker(false);
    setShowTypeManager(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setTimeout(() => editorRef.current?.focus(), 0);
    }
  };

  const selectTemplate = async (tpl) => {
    if (isDirty) {
      const proceed = await confirmDialog('توجد تعديلات غير محفوظة. هل تريد المتابعة؟', {
        title: 'تغييرات غير محفوظة',
        confirmLabel: 'متابعة',
        cancelLabel: 'إلغاء',
      });
      if (!proceed) return;
    }
    clearSelectedImage();
    setImageResizeHandle(null);
    setCaseDocumentDraft(null);
    setSelectedTemplateId(tpl?.id || '');
    setTemplateName(tpl?.name || '');
    setTemplateType(tpl?.type || defaultTemplateTypeValue);
    setTemplateContent(tpl?.content || '');
    setPreviewHtml('');
    setIsDirty(false);
    if (isMobile) setShowSidebar(false);
  };

  const duplicateTemplate = (tpl) => {
    clearSelectedImage();
    setImageResizeHandle(null);
    setCaseDocumentDraft(null);
    setSelectedTemplateId('');
    setTemplateName((tpl?.name || '') + ' — نسخة');
    setTemplateType(tpl?.type || defaultTemplateTypeValue);
    setTemplateContent(tpl?.content || '');
    setPreviewHtml('');
    setIsDirty(true);
  };

  const handleSave = async (isAutoSave = false) => {
    if (!workspaceId) return;
    if (!templateName.trim()) {
      if (!isAutoSave) alert('يرجى إدخال اسم النموذج');
      return;
    }
    setSaving(true);
    try {
      const saved = await storage.saveTemplate(workspaceId, {
        id: selectedTemplateId || undefined,
        name: templateName.trim(),
        type: templateType,
        content: templateContent,
      });
      await loadTemplates();
      setSelectedTemplateId(saved?.id || selectedTemplateId);
      setIsDirty(false);
      if (!isAutoSave) flashSuccess('تم الحفظ بنجاح ✅');
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsCopy = async () => {
    if (!workspaceId) return;
    const baseName = String(templateName || '').trim() || 'نموذج';

    setSaving(true);
    try {
      const saved = await storage.saveTemplate(workspaceId, {
        name: `${baseName} — نسخة`,
        type: templateType,
        content: templateContent,
      });
      await loadTemplates();
      setSelectedTemplateId(saved?.id || '');
      setTemplateName(`${baseName} — نسخة`);
      setIsDirty(false);
      flashSuccess('تم حفظ نسخة جديدة ✅');
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToCaseFile = async () => {
    if (!workspaceId) return;

    const resolvedCaseId = String(selectedCaseId || caseDocumentDraft?.caseId || '').trim();
    if (!resolvedCaseId) {
      alert('يرجى اختيار القضية أولاً');
      return;
    }

    const editorHtml = String(editorRef.current?.innerHTML || templateContent || '').trim();
    if (!editorHtml) {
      alert('لا يوجد محتوى لحفظه في ملف القضية');
      return;
    }

    const caseRecord = (Array.isArray(cases) ? cases : []).find((item) => String(item?.id || '') === resolvedCaseId) || selectedCase || {};
    const suggestedTitle = String(caseDocumentDraft?.title || templateName || 'مستند قضية').trim() || 'مستند قضية';
    const enteredTitle = await promptDialog('عنوان المستند', suggestedTitle, {
      title: caseDocumentDraft?.id ? 'تحديث مستند القضية' : 'حفظ مستند في ملف القضية',
      confirmLabel: caseDocumentDraft?.id ? 'تحديث' : 'حفظ',
      cancelLabel: 'إلغاء',
      placeholder: 'مثال: مذكرة دفاع',
    });

    if (enteredTitle === null) return;

    const finalTitle = String(enteredTitle || '').trim();
    if (!finalTitle) {
      alert('يرجى إدخال عنوان واضح للمستند');
      return;
    }

    const htmlContent = parseTemplate(editorHtml, caseRecord || {});

    setSaving(true);
    try {
      const saved = await storage.saveCaseDocument(workspaceId, resolvedCaseId, {
        id: caseDocumentDraft?.caseId === resolvedCaseId ? caseDocumentDraft?.id : undefined,
        createdAt: caseDocumentDraft?.caseId === resolvedCaseId ? caseDocumentDraft?.createdAt : undefined,
        title: finalTitle,
        htmlContent,
        type: templateType,
        sourceTemplateId: selectedTemplateId || '',
        sourceTemplateName: String(templateName || '').trim(),
      });

      setCaseDocumentDraft({ ...saved, caseId: resolvedCaseId });
      setSelectedCaseId(resolvedCaseId);
      setPreviewHtml(htmlContent);
      flashSuccess(caseDocumentDraft?.id ? 'تم تحديث المستند داخل ملف القضية ✅' : 'تم حفظ المستند داخل ملف القضية ✅');
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tplId) => {
    if (!workspaceId || !tplId) return;
    const proceed = await confirmDialog('حذف هذا النموذج نهائياً؟', {
      title: 'تأكيد الحذف',
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!proceed) return;
    try {
      await storage.deleteTemplate(workspaceId, tplId);
      if (selectedTemplateId === String(tplId)) resetEditor();
      await loadTemplates();
      flashSuccess('تم الحذف');
    } catch (e) {
      setError(e);
    }
  };

  const handleLoadDefaults = async () => {
    if (!workspaceId) return;
    const proceed = await confirmDialog('سيتم إضافة النماذج الافتراضية. هل تريد المتابعة؟', {
      title: 'إضافة النماذج الافتراضية',
      confirmLabel: 'متابعة',
      cancelLabel: 'إلغاء',
    });
    if (!proceed) return;
    try {
      for (const def of DEFAULT_TEMPLATES) {
        await storage.saveTemplate(workspaceId, {
          name: def.name,
          type: def.type,
          content: def.content,
        });
      }
      await loadTemplates();
      flashSuccess('تمت إضافة النماذج الافتراضية ✅');
    } catch (e) {
      setError(e);
    }
  };

  /* ─── Editor Commands ────────────────────────────────────── */

  const execCmd = (cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setTemplateContent(editorRef.current?.innerHTML || '');
    setIsDirty(true);
  };

  const syncEditorHtml = useCallback(() => {
    setTemplateContent(editorRef.current?.innerHTML || '');
    setIsDirty(true);
  }, []);

  const saveCurrentSelection = useCallback(() => {
    const host = editorRef.current;
    const selection = window.getSelection();
    if (!host || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rootNode = range.commonAncestorContainer;
    const isInsideHost =
      host === rootNode ||
      host.contains(rootNode.nodeType === Node.ELEMENT_NODE ? rootNode : rootNode.parentNode);

    if (isInsideHost) {
      savedSelectionRef.current = range.cloneRange();
    }
  }, []);

  const restoreSavedSelection = useCallback(() => {
    const host = editorRef.current;
    const range = savedSelectionRef.current;
    const selection = window.getSelection();
    if (!host || !range || !selection) return false;

    try {
      const rootNode = range.commonAncestorContainer;
      const isInsideHost =
        host === rootNode ||
        host.contains(rootNode.nodeType === Node.ELEMENT_NODE ? rootNode : rootNode.parentNode);

      if (!isInsideHost) return false;
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearSelectedEditorElement = useCallback(() => {
    if (selectedEditorElementRef.current) {
      selectedEditorElementRef.current.style.outline = '';
      selectedEditorElementRef.current.style.outlineOffset = '';
    }
    selectedEditorElementRef.current = null;
    selectedImageRef.current = null;
    setSelectedEditorElementToken('');
    setSelectedImageToken('');
    setImageResizeHandle(null);
  }, []);

  const clearSelectedImage = useCallback(() => {
    clearSelectedEditorElement();
  }, [clearSelectedEditorElement]);

  const isSelectableEditorElement = useCallback((element) => {
    if (!element || element === editorRef.current) return false;
    if (element.tagName === 'IMG') return true;
    if (['TABLE', 'BLOCKQUOTE'].includes(element.tagName)) return true;

    const styleText = String(element.getAttribute('style') || '').toLowerCase();
    const hasVisualBox = /border|background|width|height/.test(styleText);
    const hasImageChild = Boolean(element.querySelector?.('img'));
    const textLength = String(element.textContent || '').trim().length;

    return hasImageChild || (hasVisualBox && textLength > 0);
  }, []);

  const getSelectedEditorElement = useCallback(() => {
    const host = editorRef.current;
    const element = selectedEditorElementRef.current;
    if (!host || !element || !element.isConnected || !host.contains(element)) {
      selectedEditorElementRef.current = null;
      setSelectedEditorElementToken('');
      return null;
    }
    return element;
  }, []);

  const getSelectableElementFromNode = useCallback((node) => {
    const host = editorRef.current;
    if (!host || !node) return null;

    let current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;
    while (current && current !== host) {
      if (isSelectableEditorElement(current)) return current;
      current = current.parentNode;
    }
    return null;
  }, [isSelectableEditorElement]);

  const getImageFromSelection = useCallback(() => {
    const element = getSelectableElementFromNode(window.getSelection()?.anchorNode || null);
    return element?.tagName === 'IMG' ? element : element?.querySelector?.('img') || null;
  }, [getSelectableElementFromNode]);

  const getSelectedImage = useCallback(() => {
    const host = editorRef.current;
    const image = selectedImageRef.current || getImageFromSelection();
    if (!host || !image || !image.isConnected || !host.contains(image)) {
      selectedImageRef.current = null;
      return null;
    }
    return image;
  }, [getImageFromSelection]);

  const setSelectedEditorElement = useCallback((element) => {
    if (!element) {
      clearSelectedEditorElement();
      return;
    }

    const nextElement = element.tagName === 'IMG' ? element : getSelectableElementFromNode(element);
    if (!nextElement) {
      clearSelectedEditorElement();
      return;
    }

    if (selectedEditorElementRef.current && selectedEditorElementRef.current !== nextElement) {
      selectedEditorElementRef.current.style.outline = '';
      selectedEditorElementRef.current.style.outlineOffset = '';
    }

    selectedEditorElementRef.current = nextElement;
    nextElement.style.outline = '2px solid #f59e0b';
    nextElement.style.outlineOffset = '2px';
    setSelectedEditorElementToken(nextElement.tagName === 'IMG'
      ? (nextElement.getAttribute('src') || `sel_${Date.now()}`)
      : `node_${Date.now()}`
    );

    if (nextElement.tagName === 'IMG') {
      selectedImageRef.current = nextElement;
      setSelectedImageToken(nextElement.getAttribute('src') || `img_${Date.now()}`);
    } else {
      selectedImageRef.current = null;
      setSelectedImageToken('');
    }
  }, [clearSelectedEditorElement, getSelectableElementFromNode]);

  const setSelectedImage = useCallback((image) => {
    if (!image || image.tagName !== 'IMG') {
      clearSelectedImage();
      return;
    }
    setSelectedEditorElement(image);
  }, [clearSelectedImage, setSelectedEditorElement]);

  const refreshImageResizeHandle = useCallback(() => {
    const shell = editorShellRef.current;
    const host = editorRef.current;
    const image = getSelectedImage();

    if (!shell || !host || !image) {
      setImageResizeHandle(null);
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const isVisible =
      imageRect.width > 0 &&
      imageRect.height > 0 &&
      imageRect.bottom >= hostRect.top &&
      imageRect.top <= hostRect.bottom &&
      imageRect.right >= hostRect.left &&
      imageRect.left <= hostRect.right;

    if (!isVisible) {
      setImageResizeHandle(null);
      return;
    }

    setImageResizeHandle({
      left: imageRect.right - shellRect.left,
      top: imageRect.bottom - shellRect.top,
      label: `${Math.round(imageRect.width)}px`,
    });
  }, [getSelectedImage]);

  const insertAtCursor = (text) => {
    if (!text || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertText', false, text);
    setTemplateContent(editorRef.current.innerHTML);
    setIsDirty(true);
  };

  const insertHtmlAtCursor = (html, hostElement = null) => {
    const host = hostElement || editorRef.current;
    if (!html || !host) return false;
    host.focus();

    const selection = window.getSelection();
    if (!selection) return false;

    let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rootNode = range?.commonAncestorContainer || null;
    const isInsideHost = rootNode
      ? (host === rootNode || host.contains(rootNode.nodeType === Node.ELEMENT_NODE ? rootNode : rootNode.parentNode))
      : false;

    if (!range || !isInsideHost) {
      range = document.createRange();
      range.selectNodeContents(host);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    range.deleteContents();

    const container = document.createElement('div');
    container.innerHTML = html;
    const fragment = document.createDocumentFragment();
    let node = null;
    let lastNode = null;

    while ((node = container.firstChild)) {
      lastNode = fragment.appendChild(node);
    }

    range.insertNode(fragment);
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    if (host === editorRef.current) {
      setTemplateContent(editorRef.current.innerHTML);
    }
    setIsDirty(true);
    return true;
  };

  const insertIntoEditor = (rawValue, { treatAsHtml = false, hostElement = null } = {}) => {
    const raw = String(rawValue || '');
    const host = hostElement || editorRef.current;
    if (!raw || !host) return false;

    const cleanedHtml = treatAsHtml ? sanitizePastedHtml(raw) : '';
    const htmlToInsert = cleanedHtml || escapeHtml(raw).replace(/\r?\n/g, '<br/>');
    if (!htmlToInsert.trim()) return false;

    host.focus();

    let inserted = insertHtmlAtCursor(htmlToInsert, host);
    if (!inserted && host === editorRef.current) {
      try {
        inserted = Boolean(document.execCommand('insertHTML', false, htmlToInsert));
      } catch {
        inserted = false;
      }
    }

    if (!inserted) {
      host.innerHTML = `${host.innerHTML || ''}${htmlToInsert}`;
      inserted = true;
    }

    setTemplateContent(editorRef.current?.innerHTML || '');
    setIsDirty(true);
    return inserted;
  };

  const appendIntoEditor = (rawValue, { treatAsHtml = false } = {}) => {
    const raw = String(rawValue || '');
    if (!raw || !editorRef.current) return false;

    const cleanedHtml = treatAsHtml ? sanitizePastedHtml(raw) : '';
    const htmlToInsert = cleanedHtml || escapeHtml(raw).replace(/\r?\n/g, '<br/>');
    if (!htmlToInsert.trim()) return false;

    editorRef.current.focus();
    editorRef.current.innerHTML = `${editorRef.current.innerHTML || ''}${htmlToInsert}`;
    setTemplateContent(editorRef.current.innerHTML || '');
    setIsDirty(true);
    return true;
  };

  const selectAllEditorContent = useCallback((hostElement = null) => {
    const host = hostElement || editorRef.current;
    const selection = window.getSelection();
    if (!host || !selection) return false;

    const range = document.createRange();
    range.selectNodeContents(host);
    selection.removeAllRanges();
    selection.addRange(range);
    saveCurrentSelection();
    return true;
  }, [saveCurrentSelection]);

  const handleImageResizeMove = useCallback((event) => {
    const session = imageResizeSessionRef.current;
    if (!session?.image?.isConnected) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    const dominantDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
    const nextWidth = clampValue(session.startWidth + dominantDelta, MIN_IMAGE_WIDTH, session.maxWidth);

    session.image.style.width = `${Math.round(nextWidth)}px`;
    session.image.style.maxWidth = '100%';
    session.image.style.height = 'auto';
    session.image.style.display = 'block';
    session.image.style.margin = '12px auto';
    refreshImageResizeHandle();
  }, [refreshImageResizeHandle]);

  const stopImageResize = useCallback(() => {
    if (!imageResizeSessionRef.current) return;
    imageResizeSessionRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', handleImageResizeMove);
    window.removeEventListener('pointerup', stopImageResize);
    syncEditorHtml();
    refreshImageResizeHandle();
  }, [handleImageResizeMove, refreshImageResizeHandle, syncEditorHtml]);

  const startImageResize = useCallback((event) => {
    const image = getSelectedImage();
    const host = editorRef.current;
    if (!image || !host) return;

    event.preventDefault();
    event.stopPropagation();
    stopImageResize();

    const hostStyles = window.getComputedStyle(host);
    const paddingX =
      (Number.parseFloat(hostStyles.paddingLeft || '0') || 0) +
      (Number.parseFloat(hostStyles.paddingRight || '0') || 0);
    const maxWidth = Math.max(MIN_IMAGE_WIDTH, host.clientWidth - paddingX - 4);

    imageResizeSessionRef.current = {
      image,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: image.getBoundingClientRect().width || image.offsetWidth || 200,
      maxWidth,
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
    window.addEventListener('pointermove', handleImageResizeMove);
    window.addEventListener('pointerup', stopImageResize);
  }, [getSelectedImage, handleImageResizeMove, stopImageResize]);

  const handleEditorResizeMove = useCallback((event) => {
    const session = editorResizeSessionRef.current;
    if (!session) return;
    const nextHeight = clampValue(
      session.startHeight + (event.clientY - session.startY),
      MIN_EDITOR_HEIGHT,
      MAX_EDITOR_HEIGHT
    );
    setEditorHeight(nextHeight);
  }, []);

  const stopEditorResize = useCallback(() => {
    if (!editorResizeSessionRef.current) return;
    editorResizeSessionRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', handleEditorResizeMove);
    window.removeEventListener('pointerup', stopEditorResize);
  }, [handleEditorResizeMove]);

  const startEditorResize = useCallback((event) => {
    if (isEditorFullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    stopEditorResize();
    editorResizeSessionRef.current = {
      startY: event.clientY,
      startHeight: editorHeight,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('pointermove', handleEditorResizeMove);
    window.addEventListener('pointerup', stopEditorResize);
  }, [editorHeight, handleEditorResizeMove, isEditorFullscreen, stopEditorResize]);

  const insertImageFromFile = useCallback((file) => {
    if (!file || !String(file.type || '').startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) return;

      const imageHtml = buildEditorImageHtml(src);
      const restored = restoreSavedSelection();
      const inserted = restored
        ? insertIntoEditor(imageHtml, { treatAsHtml: true })
        : appendIntoEditor(imageHtml, { treatAsHtml: true });

      if (inserted) {
        window.setTimeout(() => {
          const host = editorRef.current;
          if (!host) return;
          const images = host.querySelectorAll('img');
          const insertedImage = images[images.length - 1];
          if (insertedImage) {
            setSelectedImage(insertedImage);
            refreshImageResizeHandle();
          }
        }, 0);
      }
    };
    reader.readAsDataURL(file);
  }, [appendIntoEditor, insertIntoEditor, refreshImageResizeHandle, restoreSavedSelection, setSelectedImage]);

  const triggerImageInsert = () => {
    saveCurrentSelection();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    insertImageFromFile(file);
  };

  const applyImagePreset = (preset) => {
    const image = getSelectedImage();
    if (!image) {
      alert('حدد صورة داخل المحرر أولاً');
      return;
    }

    const presets = {
      small: '25%',
      medium: '50%',
      large: '75%',
      full: '100%',
    };

    const width = presets[preset];
    if (!width) return;

    image.style.width = width;
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
    image.style.display = 'block';
    image.style.margin = '12px auto';
    syncEditorHtml();
    setSelectedImage(image);
    refreshImageResizeHandle();
  };

  const applyImageAlignment = (alignment) => {
    const image = getSelectedImage();
    if (!image) {
      alert('حدد صورة داخل المحرر أولاً');
      return;
    }

    const alignments = {
      right: '12px 0 12px auto',
      center: '12px auto',
      left: '12px auto 12px 0',
    };

    const nextMargin = alignments[alignment];
    if (!nextMargin) return;

    image.style.display = 'block';
    image.style.margin = nextMargin;
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
    syncEditorHtml();
    setSelectedImage(image);
    refreshImageResizeHandle();
  };

  const removeSelectedEditorElement = useCallback(() => {
    const element = getSelectedEditorElement();
    const host = editorRef.current;
    if (!element || !host) return false;

    const parent = element.parentNode;
    if (!parent) return false;

    const nextFocusNode = element.nextSibling || element.previousSibling || parent;
    element.remove();
    clearSelectedEditorElement();
    setTemplateContent(host.innerHTML || '');
    setIsDirty(true);

    if (nextFocusNode && host.contains(nextFocusNode)) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(nextFocusNode.nodeType === Node.ELEMENT_NODE ? nextFocusNode : nextFocusNode.parentNode);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    return true;
  }, [clearSelectedEditorElement, getSelectedEditorElement]);

  const moveSelectedElementToCursor = useCallback(() => {
    const element = getSelectedEditorElement();
    const host = editorRef.current;
    const restored = restoreSavedSelection();
    const selection = window.getSelection();
    if (!element || !host || !selection) return false;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rootNode = range?.commonAncestorContainer || null;
    const isInsideHost = rootNode
      ? (host === rootNode || host.contains(rootNode.nodeType === Node.ELEMENT_NODE ? rootNode : rootNode.parentNode))
      : false;

    if ((!range || !isInsideHost) && !restored) {
      host.focus();
      return false;
    }

    const activeRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const activeRoot = activeRange?.commonAncestorContainer || null;
    const activeInsideHost = activeRoot
      ? (host === activeRoot || host.contains(activeRoot.nodeType === Node.ELEMENT_NODE ? activeRoot : activeRoot.parentNode))
      : false;
    if (!activeRange || !activeInsideHost) {
      host.focus();
      return false;
    }

    const movingCurrentSelection = element.contains(activeRoot.nodeType === Node.ELEMENT_NODE ? activeRoot : activeRoot.parentNode);
    if (movingCurrentSelection) {
      host.focus();
      return false;
    }

    const movedElement = element;
    const insertionRange = activeRange.cloneRange();
    insertionRange.collapse(true);
    movedElement.remove();
    insertionRange.insertNode(movedElement);

    const caretRange = document.createRange();
    caretRange.setStartAfter(movedElement);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);

    setSelectedEditorElement(movedElement);
    setTemplateContent(host.innerHTML || '');
    setIsDirty(true);
    refreshImageResizeHandle();
    return true;
  }, [getSelectedEditorElement, refreshImageResizeHandle, setSelectedEditorElement]);

  const insertCondBlock = (condName) => {
    const block = `{{#${condName}}} ... {{/${condName}}}`;
    insertAtCursor(block);
    setShowCondPicker(false);
  };

  const insertQuickBlock = (blockHtml) => {
    insertHtmlAtCursor(blockHtml);
    setShowBlockPicker(false);
  };

  const openBlocksManager = () => {
    setDraftBlocks(quickBlocks);
    setNewBlockLabel('');
    setNewBlockContent('');
    setNewBlockTypes([]);
    setShowBlocksManager(true);
  };

  const toggleBlockType = (typesList, typeValue) => {
    const value = String(typeValue || '').trim();
    const source = Array.isArray(typesList) ? typesList : [];
    if (!value) return source;
    return source.includes(value)
      ? source.filter((entry) => entry !== value)
      : [...source, value];
  };

  const addDraftBlock = () => {
    const label = String(newBlockLabel || '').trim();
    const html = String(newBlockContent || '').trim();
    if (!label || !html) {
      alert('يرجى إدخال اسم المقطع ومحتواه');
      return;
    }

    setDraftBlocks([
      ...draftBlocks,
      {
        id: buildQuickBlockId(label),
        label,
        html,
        types: [...new Set(newBlockTypes)],
      },
    ]);
    setNewBlockLabel('');
    setNewBlockContent('');
    setNewBlockTypes([]);
  };

  const moveDraftBlock = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= draftBlocks.length) return;

    const next = [...draftBlocks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDraftBlocks(next);
  };

  const saveQuickBlocks = async () => {
    if (!workspaceId) return;
    const cleaned = normalizeQuickBlocks(draftBlocks);
    await storage.saveWorkspaceOptions(workspaceId, 'templateQuickBlocks', cleaned);
    setQuickBlocks(cleaned);
    setShowBlocksManager(false);
    flashSuccess('تم حفظ المقاطع ✅');
  };

  const insertTable = async () => {
    const rowsRaw = await promptDialog('عدد الصفوف', '3', {
      title: 'إدراج جدول',
      confirmLabel: 'متابعة',
      cancelLabel: 'إلغاء',
      placeholder: 'مثال: 3',
    });
    if (rowsRaw === null) return;

    const colsRaw = await promptDialog('عدد الأعمدة', '3', {
      title: 'إدراج جدول',
      confirmLabel: 'متابعة',
      cancelLabel: 'إلغاء',
      placeholder: 'مثال: 3',
    });
    if (colsRaw === null) return;

    const rows = Number(rowsRaw);
    const cols = Number(colsRaw);

    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 20 || cols > 10) {
      alert('يرجى إدخال أرقام صحيحة بين 1-20 للصفوف و1-10 للأعمدة');
      return;
    }

    const head = `<tr>${Array.from({ length: cols }).map(() => '<th style="border:1px solid #cbd5e1;padding:8px;background:#f8fafc">عنوان</th>').join('')}</tr>`;
    const body = Array.from({ length: rows - 1 }).map(
      () => `<tr>${Array.from({ length: cols }).map(() => '<td style="border:1px solid #cbd5e1;padding:8px">...</td>').join('')}</tr>`
    ).join('');

    const tableHtml = `<table style="width:100%;border-collapse:collapse;margin:12px 0;text-align:right">${head}${body}</table>`;
    insertHtmlAtCursor(tableHtml);
  };

  const insertBlockQuote = () => {
    const quoteHtml = '<blockquote style="border-right:4px solid #94a3b8;margin:10px 0;padding:8px 12px;background:#f8fafc;color:#334155">نص اقتباس...</blockquote>';
    insertHtmlAtCursor(quoteHtml);
  };

  const handleCleanEditorFormatting = () => {
    const current = String(editorRef.current?.innerHTML || '').trim();
    if (!current) return;
    const cleaned = sanitizePastedHtml(current);
    editorRef.current.innerHTML = cleaned;
    setTemplateContent(cleaned);
    setIsDirty(true);
    flashSuccess('تم تنظيف التنسيق ✅');
  };

  useEffect(() => {
    return () => {
      stopImageResize();
      stopEditorResize();
    };
  }, [stopEditorResize, stopImageResize]);

  useEffect(() => {
    const host = editorRef.current;
    const image = getSelectedImage();

    refreshImageResizeHandle();
    if (!host) return undefined;

    host.addEventListener('scroll', refreshImageResizeHandle, { passive: true });
    window.addEventListener('resize', refreshImageResizeHandle);
    image?.addEventListener('load', refreshImageResizeHandle);

    return () => {
      host.removeEventListener('scroll', refreshImageResizeHandle);
      window.removeEventListener('resize', refreshImageResizeHandle);
      image?.removeEventListener('load', refreshImageResizeHandle);
    };
  }, [editorHeight, getSelectedImage, isEditorFullscreen, refreshImageResizeHandle, selectedImageToken]);

  const openPasteModal = () => {
    saveCurrentSelection();
    setPasteBuffer('');
    setPasteBufferIsHtml(false);
    setShowPasteModal(true);
  };

  const applyPasteFromModal = () => {
    const current = String(pasteBuffer || '');
    if (!current.trim()) {
      alert('لا يوجد محتوى للصق');
      return;
    }

    const looksLikeHtml = pasteBufferIsHtml || /<[^>]+>/.test(current);
    const restored = restoreSavedSelection();
    const inserted = restored
      ? insertIntoEditor(current, { treatAsHtml: looksLikeHtml })
      : appendIntoEditor(current, { treatAsHtml: looksLikeHtml });

    if (!inserted) {
      alert('تعذر إدراج المحتوى داخل المحرر');
      return;
    }

    setShowPasteModal(false);
    setPasteBuffer('');
    setPasteBufferIsHtml(false);
    editorRef.current?.focus();
    saveCurrentSelection();
    window.requestAnimationFrame(refreshImageResizeHandle);
    flashSuccess('تم إدراج المحتوى ✅');
  };

  const readClipboardIntoPasteBuffer = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        let htmlPayload = '';
        let textPayload = '';
        let rtfPayload = '';

        for (const item of items) {
          if (!htmlPayload && (item.types.includes('text/html') || item.types.includes('Html'))) {
            const blob = await item.getType(item.types.includes('text/html') ? 'text/html' : 'Html');
            htmlPayload = await blob.text();
          }
          if (!textPayload && (item.types.includes('text/plain') || item.types.includes('Text'))) {
            const blob = await item.getType(item.types.includes('text/plain') ? 'text/plain' : 'Text');
            textPayload = await blob.text();
          }
          if (!rtfPayload && (item.types.includes('text/rtf') || item.types.includes('application/rtf'))) {
            const blob = await item.getType(item.types.includes('text/rtf') ? 'text/rtf' : 'application/rtf');
            rtfPayload = await blob.text();
          }
        }

        const payload = String(
          htmlPayload
            ? (sanitizePastedHtml(htmlPayload) || extractPlainTextFromHtml(htmlPayload))
            : textPayload || extractPlainTextFromRtf(rtfPayload)
        );
        if (payload.trim()) {
          setPasteBuffer(payload);
          setPasteBufferIsHtml(Boolean(htmlPayload && sanitizePastedHtml(htmlPayload)));
          flashSuccess(htmlPayload ? 'تم جلب HTML من الحافظة ✅' : 'تم جلب النص من الحافظة ✅');
          return;
        }
      }

      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (String(text || '').trim()) {
          setPasteBuffer(text);
          setPasteBufferIsHtml(false);
          flashSuccess('تم جلب النص من الحافظة ✅');
          return;
        }
      }

      alert('المتصفح منع قراءة الحافظة تلقائيًا. استخدم Ctrl+V داخل الحقل.');
    } catch {
      alert('المتصفح منع قراءة الحافظة تلقائيًا. استخدم Ctrl+V داخل الحقل.');
    }
  };

  /* ─── Preview & Print ───────────────────────────────────── */

  useEffect(() => {
    if (!showPasteModal || !pasteEditorRef.current) return;
    const host = pasteEditorRef.current;
    if (pasteBufferIsHtml) {
      if (host.innerHTML !== pasteBuffer) host.innerHTML = pasteBuffer;
    } else {
      if (host.innerText !== pasteBuffer) host.innerText = pasteBuffer;
    }
  }, [showPasteModal, pasteBuffer, pasteBufferIsHtml]);

  useEffect(() => {
    const handleGlobalMouseDown = (event) => {
      const host = editorRef.current;
      const target = event.target;
      if (!host || !target) return;
      if (!host.contains(target)) {
        clearSelectedImage();
        return;
      }
      if (target.tagName !== 'IMG') {
        clearSelectedImage();
      }
    };

    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [clearSelectedImage]);

  const handlePreview = () => {
    if (!templateContent) return;
    setPreviewHtml(parseTemplate(templateContent, selectedCase || {}));
  };

  const handleExportToPrint = () => {
    if (!templateContent) {
      alert('النموذج فارغ');
      return;
    }
    const merged = parseTemplate(templateContent, selectedCase || {});
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${templateName || 'نموذج قانوني'}</title>
<style>
@import url('${ARABIC_GOOGLE_FONTS_URL}');
body{font-family:'${editorFontFamily}',sans-serif;direction:rtl;margin:2cm;line-height:2;color:#1e293b;font-size:${editorFontSize}px}
h2,h3{margin:0.6em 0 0.3em}
hr{border:none;border-top:1px solid #cbd5e1;margin:1em 0}
@media print{body{margin:1.5cm}}
</style>
</head>
<body>${merged}</body>
</html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => {
      pw.print();
      pw.close();
    }, 600);
  };

  const handleCopyContent = async () => {
    const merged = String(previewHtml || parseTemplate(templateContent, selectedCase || {}) || '').trim();
    if (!merged) {
      alert('لا يوجد محتوى لنسخه. جرّب المعاينة أولاً');
      return;
    }

    let output = merged;
    if (copyMode === 'text') {
      const container = document.createElement('div');
      container.innerHTML = merged;
      output = String(container.innerText || container.textContent || '').trim();
    }

    if (!output) {
      alert('لا يوجد محتوى صالح للنسخ');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      flashSuccess(copyMode === 'html' ? 'تم نسخ HTML ✅' : 'تم نسخ النص ✅');
    } catch {
      alert('تعذر النسخ التلقائي. حاول مرة أخرى.');
    }
  };

  const toggleEditorFullscreen = () => {
    setIsEditorFullscreen((prev) => {
      const next = !prev;
      if (next) setEditorViewMode('edit');
      return next;
    });
  };

  const openTypeManager = () => {
    setDraftTypeOptions(templateTypeOptions);
    setNewTypeLabel('');
    setNewTypeIcon('📄');
    setShowTypeManager(true);
  };

  const handleAddTemplateTypeOption = () => {
    const label = String(newTypeLabel || '').trim();
    if (!label) return;

    const nextValue = buildTypeValueFromLabel(label);
    const uniqueValue = draftTypeOptions.some((entry) => entry.value === nextValue)
      ? `${nextValue}_${Date.now()}`
      : nextValue;

    setDraftTypeOptions([
      ...draftTypeOptions,
      {
        value: uniqueValue,
        label,
        icon: String(newTypeIcon || '').trim() || '📄',
      },
    ]);
    setNewTypeLabel('');
    setNewTypeIcon('📄');
  };

  const moveDraftTypeOption = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= draftTypeOptions.length) return;

    const next = [...draftTypeOptions];
    const [current] = next.splice(index, 1);
    next.splice(target, 0, current);
    setDraftTypeOptions(next);
  };

  const handleSaveTemplateTypeOptions = async () => {
    if (!workspaceId) return;

    const cleaned = normalizeTemplateTypeOptions(draftTypeOptions)
      .map((entry) => ({
        value: String(entry.value || '').trim(),
        label: String(entry.label || '').trim(),
        icon: String(entry.icon || '').trim() || '📄',
      }))
      .filter((entry) => entry.value && entry.label);

    if (!cleaned.length) {
      alert('يجب أن تحتوي القائمة على نوع واحد على الأقل');
      return;
    }

    await storage.saveWorkspaceOptions(workspaceId, 'templateTypes', cleaned);
    setTemplateTypeOptions(cleaned);
    setShowTypeManager(false);
    flashSuccess('تم حفظ أنواع النماذج ✅');
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && isEditorFullscreen) {
        event.preventDefault();
        setIsEditorFullscreen(false);
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;
      if (!ctrl) return;

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave(false);
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlePreview();
        setEditorViewMode('preview');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePreview, handleSave, isEditorFullscreen]);

  /* ─── Render Guards ──────────────────────────────────────── */

  if (!workspaceId) {
    return (
      <div style={S.emptyState}>
        <div style={S.emptyIcon}>🏢</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>لا توجد مساحة عمل محددة</div>
        <div style={{ fontSize: '13px' }}>اختر مساحة عمل من الإعدادات أولاً</div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 className="page-title" style={{ margin: 0 }}>📋 النماذج والمستندات</h1>
        <div style={S.headerActions}>
          {isMobile && (
            <button
              type="button"
              style={S.secondaryBtn}
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? 'إخفاء القائمة' : 'عرض القائمة'}
            </button>
          )}
          <button type="button" style={S.secondaryBtn} onClick={resetEditor}>
            + نموذج جديد
          </button>
          {templates.length === 0 && (
            <button type="button" style={S.primaryBtn} onClick={handleLoadDefaults}>
              تحميل النماذج الافتراضية
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', background: '#f0fdf4',
          border: '1px solid #bbf7d0', color: '#166534', fontSize: '13.5px',
          fontFamily: "'Cairo', sans-serif",
        }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', background: '#fef2f2',
          border: '1px solid #fecaca', color: '#991b1b', fontSize: '13.5px',
          fontFamily: "'Cairo', sans-serif",
        }}>
          حدث خطأ: {error?.message || 'خطأ غير معروف'}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ ...S.smallBtn, marginRight: '8px' }}
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Layout */}
      <div style={isMobile ? S.mobileLayout : S.layout}>

        {/* ─── Sidebar ──────────────────────────────────────── */}
        {(!isMobile || showSidebar) && (
          <aside className="dashboard-widget-card" style={S.sidebar}>
            {/* Filter chips */}
            <div style={S.sidebarFilter}>
              <button
                type="button"
                style={S.filterChip(sidebarFilter === 'all')}
                onClick={() => setSidebarFilter('all')}
              >
                الكل ({templates.length})
              </button>
              {templateTypeOptions.map((typeOption) => {
                const key = String(typeOption.value || '');
                const count = templates.filter((t) => String(t.type || '') === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    style={S.filterChip(sidebarFilter === key)}
                    onClick={() => setSidebarFilter(key)}
                  >
                    {(typeOption.icon || '📄')} {typeOption.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Template list */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                جاري التحميل...
              </div>
            )}

            {!loading && filteredTemplates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '13px' }}>لا توجد نماذج بعد</div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '8px' }}>
              {filteredTemplates.map((tpl) => {
                const isActive = String(tpl?.id || '') === String(selectedTemplateId || '');
                const typeInfo = templateTypeMap.get(String(tpl?.type || '')) || { label: 'مخصص', icon: '📄' };
                return (
                  <div
                    key={tpl.id}
                    style={S.templateCard(isActive)}
                    onClick={() => selectTemplate(tpl)}
                  >
                    <div style={S.cardHeader}>
                      <span style={S.cardName}>
                        {typeInfo.icon} {tpl?.name || 'بدون اسم'}
                      </span>
                      <span style={S.typeBadge}>{typeInfo.label}</span>
                    </div>
                    <div style={S.cardActions}>
                      <button
                        type="button"
                        style={S.smallBtn}
                        onClick={(e) => { e.stopPropagation(); duplicateTemplate(tpl); }}
                      >
                        نسخ
                      </button>
                      <button
                        type="button"
                        style={S.dangerBtn}
                        onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* ─── Main Editor Area ─────────────────────────────── */}
        <main style={S.main}>

          <section style={S.commandBar}>
            <div style={S.viewTabs}>
              <button
                type="button"
                style={S.viewTabBtn(editorViewMode === 'edit')}
                onClick={() => setEditorViewMode('edit')}
              >
                تحرير
              </button>
              <button
                type="button"
                style={S.viewTabBtn(editorViewMode === 'preview')}
                onClick={() => setEditorViewMode('preview')}
              >
                معاينة
              </button>
              {!isMobile && (
                <button
                  type="button"
                  style={S.viewTabBtn(editorViewMode === 'split')}
                  onClick={() => setEditorViewMode('split')}
                >
                  تقسيم
                </button>
              )}
            </div>

            <div style={S.commandActions}>
              <button
                type="button"
                style={{ ...S.commandBtnPrimary, opacity: saving ? 0.7 : 1 }}
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <span style={S.commandBtnIcon}>✦</span>
                {saving ? 'جاري الحفظ...' : selectedTemplateId ? 'تحديث النموذج' : 'حفظ نموذج جديد'}
              </button>

              <button type="button" style={S.commandBtn} onClick={handleSaveAsCopy} disabled={saving}>
                <span style={S.commandBtnIcon}>⎘</span>
                حفظ كنسخة
              </button>

              <button type="button" style={{ ...S.secondaryBtn, display: 'none' }} onClick={handlePreview}>
                معاينة
              </button>

              <button type="button" style={S.commandBtnAccent} onClick={toggleEditorFullscreen}>
                <span style={S.commandBtnIcon}>{isEditorFullscreen ? '🗗' : '⛶'}</span>
                {isEditorFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
              </button>

              <select
                value={copyMode}
                onChange={(e) => setCopyMode(e.target.value)}
                style={S.compactSelect}
                title="نوع النسخ"
              >
                <option value="text">نسخ كنص</option>
                <option value="html">نسخ كـ HTML</option>
              </select>

              <button type="button" style={S.commandBtn} onClick={handleCopyContent}>
                <span style={S.commandBtnIcon}>📋</span>
                نسخ
              </button>

              <button type="button" style={S.commandBtn} onClick={handleExportToPrint}>
                <span style={S.commandBtnIcon}>🖨</span>
                🖨️ تصدير للطباعة
              </button>

              <button type="button" style={S.commandBtn} onClick={openTypeManager}>
                <span style={S.commandBtnIcon}>⚙</span>
                ⚙ إدارة الأنواع
              </button>

              {isDirty ? (
                <span style={S.autoSaveIndicator}>● تعديلات غير محفوظة</span>
              ) : selectedTemplateId ? (
                <span style={{ ...S.autoSaveIndicator, color: '#16a34a' }}>✓ محفوظ</span>
              ) : null}
            </div>
          </section>

          <div style={isEditorFullscreen ? { display: 'block' } : S.workAreaGrid(editorViewMode === 'split' && !isMobile)}>
          {/* Editor Section */}
          {editorViewMode !== 'preview' && (
          <section style={isEditorFullscreen ? S.fullscreenEditorSection : S.editorSection}>
            {/* Name + Type row */}
            <div style={S.inputRow}>
              <input
                value={templateName}
                onChange={(e) => { setTemplateName(e.target.value); setIsDirty(true); }}
                placeholder="اسم النموذج..."
                style={S.input}
              />
              <select
                value={templateType}
                onChange={(e) => { setTemplateType(e.target.value); setIsDirty(true); }}
                style={S.select}
              >
                {templateTypeOptions.map(({ value, label, icon }) => (
                  <option key={value} value={value}>{icon} {label}</option>
                ))}
              </select>
            </div>

            {/* Rich Text Toolbar */}
            <div style={S.toolbar}>
              <select
                value={editorFontFamily}
                onChange={(e) => setEditorFontFamily(e.target.value)}
                style={{ ...S.compactSelect, minWidth: '170px' }}
                title="الخط"
              >
                {ARABIC_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>

              <select
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(Number(e.target.value) || 15)}
                style={{ ...S.compactSelect, minWidth: '110px' }}
                title="حجم الخط"
              >
                {FONT_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>

              <div style={S.toolbarDivider} />

              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('bold')} title="عريض">
                <b>B</b>
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('italic')} title="مائل">
                <i>I</i>
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('underline')} title="تحته خط">
                <u>U</u>
              </button>
              <div style={S.toolbarDivider} />
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('justifyRight')} title="محاذاة يمين">
                ≡▶
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('justifyCenter')} title="توسيط">
                ≡◆
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('justifyLeft')} title="محاذاة يسار">
                ◀≡
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('justifyFull')} title="ضبط كامل">
                ☰
              </button>
              <div style={S.toolbarDivider} />
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('formatBlock', '<h2>')} title="عنوان رئيسي">
                H2
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('formatBlock', '<h3>')} title="عنوان فرعي">
                H3
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('formatBlock', '<p>')} title="فقرة">
                ¶
              </button>
              <div style={S.toolbarDivider} />
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('insertHorizontalRule')} title="خط فاصل">
                ―
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('insertOrderedList')} title="قائمة مرقمة">
                1.
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('insertUnorderedList')} title="قائمة نقطية">
                •
              </button>
              <button type="button" style={S.toolbarBtn} onClick={insertTable} title="إدراج جدول">
                ▦
              </button>
              <button type="button" style={S.toolbarBtn} onClick={insertBlockQuote} title="إدراج اقتباس">
                ❝
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('removeFormat')} title="إزالة تنسيق">
                Tx
              </button>
              <div style={S.toolbarDivider} />
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('undo')} title="تراجع">
                ↩
              </button>
              <button type="button" style={S.toolbarBtn} onClick={() => execCmd('redo')} title="إعادة">
                ↪
              </button>
              <div style={S.toolbarDivider} />
            </div>

            {/* Tag Picker (Grouped) */}
            <div style={S.tagSection}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: '12.5px', padding: '5px 14px' }}
                  onClick={() => { setShowTagPicker(!showTagPicker); setShowCondPicker(false); setShowBlockPicker(false); }}
                >
                  {showTagPicker ? '▲ إخفاء المتغيرات' : '▼ إدراج متغير'}
                </button>
                <button
                  type="button"
                  style={{ ...S.condBtn, padding: '5px 14px' }}
                  onClick={() => { setShowCondPicker(!showCondPicker); setShowTagPicker(false); setShowBlockPicker(false); }}
                >
                  {showCondPicker ? '▲ إخفاء الشروط' : '⚡ إدراج شرط'}
                </button>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: '12.5px', padding: '5px 14px' }}
                  onClick={() => { setShowBlockPicker(!showBlockPicker); setShowTagPicker(false); setShowCondPicker(false); }}
                >
                  {showBlockPicker ? '▲ إخفاء المقاطع' : '📚 إدراج مقطع'}
                </button>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: '12.5px', padding: '5px 14px' }}
                  onClick={openBlocksManager}
                >
                  ⚙ إدارة المقاطع
                </button>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: '12.5px', padding: '5px 14px' }}
                  onClick={handleCleanEditorFormatting}
                >
                  تنظيف التنسيق
                </button>
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, fontSize: '12.5px', padding: '5px 14px' }}
                  onClick={openPasteModal}
                >
                  لصق يدوي
                </button>
              </div>

              {showTagPicker && (
                <div style={{ display: 'grid', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {tagGroups.map((group) => (
                    <div key={group.category}>
                      <div style={S.tagCategoryLabel}>{group.category}</div>
                      <div style={S.tagRow}>
                        {group.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            style={S.tagBtn}
                            onClick={() => insertAtCursor(tag)}
                          >
                            {tag.replace(/[{}]/g, '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showCondPicker && (
                <div style={{ display: 'grid', gap: '6px', padding: '10px', background: '#eff6ff', borderRadius: '8px', border: '1px dashed #93c5fd' }}>
                  <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
                    الشروط — المحتوى بينهما يظهر فقط لو الشرط متحقق
                  </div>
                  <div style={S.tagRow}>
                    {conditions.map((cond) => (
                      <button
                        key={cond.tag}
                        type="button"
                        style={S.condBtn}
                        onClick={() => insertCondBlock(cond.tag)}
                        title={cond.label}
                      >
                        {cond.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showBlockPicker && (
                <div style={{ display: 'grid', gap: '6px', padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: 600 }}>
                    مقاطع جاهزة لتسريع كتابة المذكرات والتقارير
                  </div>
                  {smartHints.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#b45309', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span>ترشيح ذكي حسب نوع القالب:</span>
                      {smartHints.slice(0, 3).map((hint) => (
                        <span key={hint} style={{ background: '#ffedd5', border: '1px solid #fdba74', borderRadius: 999, padding: '1px 8px' }}>{hint}</span>
                      ))}
                    </div>
                  )}
                  {!prioritizedQuickBlocks.length && (
                    <div style={{ fontSize: '12px', color: '#9a3412' }}>
                      لا توجد مقاطع مرتبطة بهذا النوع حالياً. يمكنك إضافة مقطع جديد وربطه بالنوع من إدارة المقاطع.
                    </div>
                  )}
                  <div style={S.tagRow}>
                    {prioritizedQuickBlocks.map((block) => (
                      <button
                        key={block.id}
                        type="button"
                        style={{ ...S.secondaryBtn, fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => insertQuickBlock(block.html)}
                      >
                        {block.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ContentEditable Editor */}
            <div ref={editorShellRef} style={S.editorShell}>
              <div
                ref={editorRef}
                contentEditable
                dir="rtl"
                style={{
                  ...S.editor,
                  ...(isEditorFullscreen ? S.fullscreenEditor : {}),
                  fontFamily: `'${editorFontFamily}', sans-serif`,
                  fontSize: `${editorFontSize}px`,
                  height: isEditorFullscreen ? '100%' : `${editorHeight}px`,
                }}
                onPaste={(event) => {
                  const payloadInfo = getClipboardInsertPayload(event.clipboardData);
                  if (!payloadInfo.value) return;

                  event.preventDefault();
                  const { value, treatAsHtml } = payloadInfo;

                  let inserted = insertIntoEditor(value, { treatAsHtml });
                  if (!inserted) {
                    const restored = restoreSavedSelection();
                    inserted = restored
                      ? insertIntoEditor(value, { treatAsHtml })
                      : appendIntoEditor(value, { treatAsHtml });
                  }

                  if (inserted) {
                    saveCurrentSelection();
                    window.requestAnimationFrame(refreshImageResizeHandle);
                  }
                }}
                onClick={(event) => {
                  const target = event.target;
                  const selectableElement = getSelectableElementFromNode(target);
                  if (selectableElement?.tagName === 'IMG') {
                    setSelectedImage(selectableElement);
                    window.requestAnimationFrame(refreshImageResizeHandle);
                  } else if (selectableElement) {
                    setSelectedEditorElement(selectableElement);
                    window.requestAnimationFrame(refreshImageResizeHandle);
                  } else {
                    clearSelectedEditorElement();
                  }
                }}
                onKeyDown={(event) => {
                  const ctrl = event.ctrlKey || event.metaKey;
                  if (ctrl && event.key.toLowerCase() === 'a') {
                    event.preventDefault();
                    selectAllEditorContent(event.currentTarget);
                    return;
                  }
                  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEditorElementToken) {
                    const selection = window.getSelection();
                    const hasTextSelection = Boolean(selection && !selection.isCollapsed && String(selection.toString() || '').trim());
                    if (!hasTextSelection && removeSelectedEditorElement()) {
                      event.preventDefault();
                      return;
                    }
                  }
                  if (event.key === 'Escape' && selectedEditorElementToken) {
                    clearSelectedEditorElement();
                    event.preventDefault();
                  }
                }}
                onKeyUp={saveCurrentSelection}
                onMouseUp={() => {
                  saveCurrentSelection();
                  window.requestAnimationFrame(refreshImageResizeHandle);
                }}
                onInput={(e) => {
                  if (!getSelectedImage()) {
                    const selectedElement = getSelectedEditorElement();
                    if (selectedElement && !e.currentTarget.contains(selectedElement)) {
                      clearSelectedEditorElement();
                    }
                  }
                  setTemplateContent(e.currentTarget.innerHTML);
                  setIsDirty(true);
                  window.requestAnimationFrame(refreshImageResizeHandle);
                }}
                suppressContentEditableWarning
              />

              {!isEditorFullscreen && (
                <div style={S.editorResizeRow}>
                  <button
                    type="button"
                    style={S.editorResizeHandleBtn}
                    onPointerDown={startEditorResize}
                    onDoubleClick={() => setEditorHeight(DEFAULT_EDITOR_HEIGHT)}
                    title="اسحب لتكبير أو تصغير مساحة التحرير"
                  >
                    <span style={S.editorResizeHandleBar} />
                  </button>
                  <div style={S.editorResizeText}>
                    <span>اسحب المقبض لأسفل أو لأعلى لتغيير مساحة التحرير بسرعة</span>
                    <span style={S.editorResizeBadge}>{editorHeight}px</span>
                  </div>
                </div>
              )}

              {imageResizeHandle && (
                <>
                  <div
                    style={{
                      ...S.imageResizeBadge,
                      left: imageResizeHandle.left,
                      top: Math.max(IMAGE_RESIZE_HANDLE_SIZE + 6, imageResizeHandle.top - IMAGE_RESIZE_HANDLE_SIZE),
                    }}
                  >
                    {imageResizeHandle.label}
                  </div>
                  <button
                    type="button"
                    style={{
                      ...S.imageResizeHandle,
                      left: imageResizeHandle.left,
                      top: imageResizeHandle.top,
                    }}
                    onPointerDown={startImageResize}
                    title="اسحب لتغيير حجم الصورة"
                  />
                </>
              )}
            </div>

            {/* Save Row */}
            <div style={S.saveRow}>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                style={{ ...S.select, minWidth: '260px', fontSize: '13px', padding: '8px 12px' }}
                title="اختر القضية المرتبط بها المستند"
              >
                <option value="">اختر قضية للحفظ داخل ملفها...</option>
                {(Array.isArray(cases) ? cases : []).map((c) => {
                  const caseNumber = [String(c?.caseNumber || '').trim(), String(c?.caseYear || '').trim()].filter(Boolean).join('/');
                  const parties = [String(c?.plaintiffName || '').trim(), String(c?.defendantName || '').trim()].filter(Boolean).join(' ضد ');
                  return (
                    <option key={c.id} value={c.id}>
                      {[caseNumber, parties].filter(Boolean).join(' — ') || c.id}
                    </option>
                  );
                })}
              </select>

              {isEditorFullscreen && (
                <button
                  type="button"
                  style={S.secondaryBtn}
                  onClick={toggleEditorFullscreen}
                >
                  إنهاء ملء الشاشة
                </button>
              )}
              {selectedEditorElementToken && (
                <>
                  <button
                    type="button"
                    style={S.secondaryBtn}
                    onClick={moveSelectedElementToCursor}
                    title="ضع المؤشر في المكان الجديد ثم اضغط نقل"
                  >
                    نقل العنصر المحدد
                  </button>
                  <button
                    type="button"
                    style={S.secondaryBtn}
                    onClick={removeSelectedEditorElement}
                    title="يمكنك أيضًا الضغط على Delete بعد تحديد العنصر"
                  >
                    حذف العنصر المحدد
                  </button>
                </>
              )}
              <button
                type="button"
                style={{ ...S.commandBtnAccent, opacity: saving ? 0.7 : 1 }}
                onClick={handleSaveToCaseFile}
                disabled={saving}
                title="يحفظ النسخة الحالية داخل ملف القضية المختارة"
              >
                💾 حفظ في ملف القضية
              </button>
              <button
                type="button"
                style={{ ...S.commandBtnPrimary, opacity: saving ? 0.7 : 1 }}
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : selectedTemplateId ? 'تحديث النموذج' : 'حفظ نموذج جديد'}
              </button>
              {isDirty && (
                <span style={S.autoSaveIndicator}>
                  ● تعديلات غير محفوظة
                </span>
              )}
              {!isDirty && selectedTemplateId && (
                <span style={{ ...S.autoSaveIndicator, color: '#16a34a' }}>
                  ✓ محفوظ
                </span>
              )}
              {caseDocumentDraft?.id && (
                <span style={{ ...S.autoSaveIndicator, color: '#0369a1', background: '#e0f2fe', borderColor: '#bae6fd' }}>
                  مرتبط بمستند قضية محفوظ
                </span>
              )}
            </div>
          </section>
          )}

          {/* Preview Section */}
          {!isEditorFullscreen && editorViewMode !== 'edit' && (
          <section style={S.previewSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>
                👁️ المعاينة
              </h3>
              <div style={S.previewControls}>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  style={{ ...S.select, fontSize: '13px', padding: '7px 12px', minWidth: '200px' }}
                >
                  <option value="">اختر قضية للمعاينة...</option>
                  {(Array.isArray(cases) ? cases : []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber || c.title || c.id}
                    </option>
                  ))}
                </select>
                <button type="button" style={S.primaryBtn} onClick={handlePreview}>
                  معاينة
                </button>
                <button type="button" style={S.secondaryBtn} onClick={handleExportToPrint}>
                  🖨️ تصدير للطباعة
                </button>
              </div>
            </div>

            {!previewHtml ? (
              <div style={S.previewFrame}>
                <div style={{ ...S.previewPaper, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', minHeight: '240px', width: '100%', padding: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>👁️</div>
                    <div style={{ fontSize: '13px' }}>اختر قضية واضغط "معاينة" لرؤية النتيجة</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={S.previewFrame}>
                <div
                  style={{
                    ...S.previewPaper,
                    fontFamily: `'${editorFontFamily}', sans-serif`,
                    fontSize: `${editorFontSize}px`,
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </section>
          )}
          </div>

          {showTypeManager && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              background: 'rgba(15, 23, 42, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                width: 'min(720px, 100%)',
                maxHeight: '90vh',
                overflow: 'auto',
                border: '1px solid #e2e8f0',
                padding: 16,
                display: 'grid',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>إدارة أنواع النماذج</h3>
                  <button type="button" style={S.secondaryBtn} onClick={() => setShowTypeManager(false)}>إغلاق</button>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {draftTypeOptions.map((entry, index) => (
                    <div key={entry.value} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto auto', gap: 8 }}>
                      <input
                        style={S.input}
                        value={entry.icon}
                        maxLength={4}
                        onChange={(e) => {
                          const next = [...draftTypeOptions];
                          next[index] = { ...next[index], icon: e.target.value };
                          setDraftTypeOptions(next);
                        }}
                      />
                      <input
                        style={S.input}
                        value={entry.label}
                        onChange={(e) => {
                          const next = [...draftTypeOptions];
                          next[index] = { ...next[index], label: e.target.value };
                          setDraftTypeOptions(next);
                        }}
                      />
                      <button
                        type="button"
                        style={S.smallBtn}
                        onClick={() => moveDraftTypeOption(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={S.smallBtn}
                        onClick={() => moveDraftTypeOption(index, 'down')}
                        disabled={index === draftTypeOptions.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        style={S.dangerBtn}
                        onClick={() => setDraftTypeOptions(draftTypeOptions.filter((_, i) => i !== index))}
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 8 }}>
                  <input
                    style={S.input}
                    value={newTypeIcon}
                    maxLength={4}
                    placeholder="📄"
                    onChange={(e) => setNewTypeIcon(e.target.value)}
                  />
                  <input
                    style={S.input}
                    value={newTypeLabel}
                    placeholder="اسم نوع جديد"
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                  />
                  <button type="button" style={S.secondaryBtn} onClick={handleAddTemplateTypeOption}>إضافة</button>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" style={S.secondaryBtn} onClick={() => setShowTypeManager(false)}>إلغاء</button>
                  <button type="button" style={S.primaryBtn} onClick={handleSaveTemplateTypeOptions}>حفظ الأنواع</button>
                </div>
              </div>
            </div>
          )}

          {showBlocksManager && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              background: 'rgba(15, 23, 42, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                width: 'min(860px, 100%)',
                maxHeight: '90vh',
                overflow: 'auto',
                border: '1px solid #e2e8f0',
                padding: 16,
                display: 'grid',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>إدارة المقاطع الجاهزة</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={S.primaryBtn} onClick={saveQuickBlocks}>حفظ المقاطع</button>
                    <button type="button" style={S.secondaryBtn} onClick={() => setShowBlocksManager(false)}>إغلاق</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {draftBlocks.map((block, index) => (
                    <div key={block.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8 }}>
                        <input
                          style={S.input}
                          value={block.label}
                          onChange={(e) => {
                            const next = [...draftBlocks];
                            next[index] = { ...next[index], label: e.target.value };
                            setDraftBlocks(next);
                          }}
                        />
                        <button type="button" style={S.smallBtn} onClick={() => moveDraftBlock(index, 'up')} disabled={index === 0}>↑</button>
                        <button type="button" style={S.smallBtn} onClick={() => moveDraftBlock(index, 'down')} disabled={index === draftBlocks.length - 1}>↓</button>
                        <button type="button" style={S.dangerBtn} onClick={() => setDraftBlocks(draftBlocks.filter((_, i) => i !== index))}>حذف</button>
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        dir="rtl"
                        style={{
                          ...S.input,
                          minHeight: 96,
                          lineHeight: 1.8,
                          background: '#fff',
                          whiteSpace: 'pre-wrap',
                        }}
                        dangerouslySetInnerHTML={{ __html: block.html }}
                        onInput={(e) => {
                          const next = [...draftBlocks];
                          next[index] = { ...next[index], html: e.currentTarget.innerHTML };
                          setDraftBlocks(next);
                        }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>أنواع هذا المقطع:</span>
                        <button
                          type="button"
                          style={{
                            ...S.smallBtn,
                            background: (!Array.isArray(block.types) || block.types.length === 0) ? '#0f172a' : '#fff',
                            color: (!Array.isArray(block.types) || block.types.length === 0) ? '#fff' : '#334155',
                          }}
                          onClick={() => {
                            const next = [...draftBlocks];
                            next[index] = { ...next[index], types: [] };
                            setDraftBlocks(next);
                          }}
                        >
                          عام (كل الأنواع)
                        </button>
                        {templateTypeOptions.map((entry) => {
                          const value = String(entry.value || '');
                          const selected = Array.isArray(block.types) && block.types.includes(value);
                          return (
                            <button
                              key={`${block.id}_${value}`}
                              type="button"
                              style={{
                                ...S.smallBtn,
                                background: selected ? '#0f172a' : '#fff',
                                color: selected ? '#fff' : '#334155',
                              }}
                              onClick={() => {
                                const next = [...draftBlocks];
                                const updated = toggleBlockType(next[index]?.types, value);
                                next[index] = { ...next[index], types: updated };
                                setDraftBlocks(next);
                              }}
                            >
                              {entry.icon} {entry.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ border: '1px dashed #cbd5e1', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>إضافة مقطع جديد</div>
                  <input
                    style={S.input}
                    placeholder="اسم المقطع"
                    value={newBlockLabel}
                    onChange={(e) => setNewBlockLabel(e.target.value)}
                  />
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    dir="rtl"
                    style={{ ...S.input, minHeight: 110, lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#fff' }}
                    data-placeholder="اكتب أو الصق محتوى المقطع هنا"
                    onInput={(e) => setNewBlockContent(e.currentTarget.innerHTML)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>أنواع المقطع الجديد:</span>
                    <button
                      type="button"
                      style={{
                        ...S.smallBtn,
                        background: newBlockTypes.length === 0 ? '#0f172a' : '#fff',
                        color: newBlockTypes.length === 0 ? '#fff' : '#334155',
                      }}
                      onClick={() => setNewBlockTypes([])}
                    >
                      عام (كل الأنواع)
                    </button>
                    {templateTypeOptions.map((entry) => {
                      const value = String(entry.value || '');
                      const selected = newBlockTypes.includes(value);
                      return (
                        <button
                          key={`new_${value}`}
                          type="button"
                          style={{
                            ...S.smallBtn,
                            background: selected ? '#0f172a' : '#fff',
                            color: selected ? '#fff' : '#334155',
                          }}
                          onClick={() => setNewBlockTypes((prev) => toggleBlockType(prev, value))}
                        >
                          {entry.icon} {entry.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" style={S.secondaryBtn} onClick={addDraftBlock}>إضافة المقطع</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" style={S.secondaryBtn} onClick={() => setShowBlocksManager(false)}>إلغاء</button>
                  <button type="button" style={S.primaryBtn} onClick={saveQuickBlocks}>حفظ المقاطع</button>
                </div>
              </div>
            </div>
          )}

          {showPasteModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              background: 'rgba(15, 23, 42, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                width: 'min(720px, 100%)',
                maxHeight: '90vh',
                overflow: 'auto',
                border: '1px solid #e2e8f0',
                padding: 16,
                display: 'grid',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>لصق يدوي للمحتوى</h3>
                  <button type="button" style={S.secondaryBtn} onClick={() => setShowPasteModal(false)}>إغلاق</button>
                </div>

                <div style={{ fontSize: 12, color: '#475569' }}>
                  الصق هنا أي محتوى من Word أو أي مصدر خارجي، ثم اضغط "إدراج" ليتم تنظيفه وإدخاله في مكان المؤشر داخل المحرر.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" style={S.secondaryBtn} onClick={readClipboardIntoPasteBuffer}>
                    قراءة من الحافظة
                  </button>
                </div>

                <div
                  ref={pasteEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  dir="rtl"
                  data-placeholder="الصق المحتوى هنا..."
                  onPaste={(event) => {
                    const payloadInfo = getClipboardInsertPayload(event.clipboardData);
                    if (payloadInfo.value) {
                      event.preventDefault();
                      setPasteBuffer(String(payloadInfo.value || ''));
                      setPasteBufferIsHtml(Boolean(payloadInfo.treatAsHtml));
                    }
                  }}
                  onKeyDown={(event) => {
                    const ctrl = event.ctrlKey || event.metaKey;
                    if (ctrl && event.key.toLowerCase() === 'a') {
                      event.preventDefault();
                      selectAllEditorContent(event.currentTarget);
                    }
                  }}
                  onInput={(e) => {
                    setPasteBuffer(e.currentTarget.innerHTML);
                    setPasteBufferIsHtml(true);
                  }}
                  style={{
                    width: '100%',
                    minHeight: 220,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                    lineHeight: 1.8,
                    direction: 'rtl',
                    background: '#fff',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                />

                <textarea
                  value={pasteBuffer}
                  onChange={(e) => setPasteBuffer(e.target.value)}
                  placeholder="الصق المحتوى هنا..."
                  style={{
                    display: 'none',
                    width: '100%',
                    minHeight: 220,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                    lineHeight: 1.8,
                    resize: 'vertical',
                    direction: 'rtl',
                  }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" style={S.secondaryBtn} onClick={() => setShowPasteModal(false)}>إلغاء</button>
                  <button type="button" style={S.primaryBtn} onClick={applyPasteFromModal}>إدراج</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
