import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import storage from '@/data/Storage.js';
import { CASE_STATUS, PROCEDURE_TRACK } from '@/core/Constants.js';
import { formatCaseNumber, formatDisplayDate } from '@/utils/caseUtils.js';
import { getJudgmentReservationCaseUpdate } from '@/workflows/SessionRollover.js';

export const SYSTEM_FIELDS = [
  {
    key: 'caseNumber',
    label: 'رقم الدعوى',
    required: true,
    aliases: ['رقم الدعوى', 'رقم القضية', 'رقم الطاعن', 'رقم', 'case number', 'case_number', 'caseid'],
  },
  {
    key: 'caseYear',
    label: 'السنة',
    required: true,
    aliases: ['السنة', 'year', 'سنة', 'caseyear', 'القضية سنة'],
  },
  {
    key: 'plaintiffName',
    label: 'المدعي / الطاعن',
    required: true,
    aliases: ['المدعي', 'الطاعن', 'المستأنف', 'plaintiff', 'اسم المدعي', 'الطرف الأول'],
  },
  {
    key: 'defendantName',
    label: 'المدعى عليه',
    required: false,
    aliases: ['المدعى عليه', 'الخصم', 'defendant', 'الطرف الثاني', 'المطعون ضده'],
  },
  {
    key: 'court',
    label: 'المحكمة',
    required: false,
    aliases: ['المحكمة', 'court', 'الجهة القضائية', 'أجندة المستشار::محضر المحكمة'],
  },
  {
    key: 'circuit',
    label: 'الدائرة',
    required: false,
    aliases: ['الدائرة', 'circuit', 'دائرة'],
  },
  {
    key: 'lastSessionDate',
    label: 'آخر جلسة',
    required: false,
    aliases: ['آخر جلسة', 'تاريخ الجلسة', 'lastsessiondate', 'آخر جلسه'],
  },
  {
    key: 'sessionResult',
    label: 'القرار',
    required: false,
    aliases: ['القرار', 'القرار/النتيجة', 'sessionresult', 'آخر قرار', 'قرار الجلسة', 'courtdecision', 'court decision'],
  },
  {
    key: 'summaryDecision',
    label: 'الحكم / ملخص الحكم',
    required: false,
    aliases: ['الحكم', 'ملخص الحكم', 'خلاصة الحكم', 'summarydecision', 'summary_decision'],
  },
  {
    key: 'judgmentPronouncement',
    label: 'منطوق الحكم',
    required: false,
    aliases: ['منطوق الحكم', 'judgmentpronouncement', 'judgment_pronouncement', 'pronouncement'],
  },
  {
    key: 'judgmentCategory',
    label: 'تصنيف الحكم',
    required: false,
    aliases: ['تصنيف الحكم', 'نوع الحكم', 'judgmentcategory', 'judgment_category', 'judgmenttype', 'judgment_type'],
  },
  {
    key: 'nextSessionDate',
    label: 'الجلسة القادمة',
    required: false,
    aliases: ['الجلسة القادمة', 'nextsessiondate', 'الموعد القادم', 'التأجيل لـ'],
  },
  {
    key: 'roleCapacity',
    label: 'الصفة',
    required: false,
    aliases: ['الصفة', 'rolecapacity', 'المركز القانوني', 'مركز موكلنا', 'role'],
  },
  {
    key: 'fileLocation',
    label: 'مكان الملف',
    required: false,
    aliases: ['مكان الملف', 'filelocation', 'موقع الملف', 'مكان الملف للمحضر', 'location'],
  },
  {
    key: 'litigationStage',
    label: 'مرحلة التقاضي',
    required: false,
    aliases: ['المرحلة', 'litigationstage', 'مرحلة التقاضي', 'مرحلة النزاع', 'litigationphase', 'phase'],
  },
  {
    key: 'agendaRoute',
    label: 'مسار الأجندة',
    required: false,
    aliases: ['مسار الأجندة', 'agendaroute', 'الأجندة', 'مسار الأجندة (جلسات/أحكام)'],
  },
  {
    key: 'title',
    label: 'موضوع الدعوى (العنوان)',
    required: false,
    aliases: ['عنوان الدعوى', 'title', 'case title', 'موضوع الدعوى (العنوان)', 'الموضوع', 'subject', 'موضوع الدعوى'],
  },
  {
    key: 'assignedCounsel',
    label: 'المحامي المختص',
    required: false,
    aliases: ['assignedcounsel', 'المحامي المختص', 'المستشار المختص', 'counsel'],
  },
  {
    key: 'joinedCases',
    label: 'الدعاوى المضمومة',
    required: false,
    aliases: ['الدعاوى المضمومة', 'القضايا المنضمة', 'joined'],
  },
  {
    key: 'chosenHeadquarters',
    label: 'المقر المختار',
    required: false,
    aliases: ['المقر المختار', 'مقر المحامي', 'chosen headquarters'],
  },
  {
    key: 'defendantAddress',
    label: 'عنوان المدعى عليه',
    required: false,
    aliases: ['عنوان المدعى عليه', 'defendantaddress', 'address'],
  },
  {
    key: 'inspectionRequests',
    label: 'طلبات الإطلاع',
    required: false,
    aliases: ['طلبات الاطلاع', 'inspectionrequests', 'طلب اطلاع', 'اطلاع'],
  },
  {
    key: 'sessionPreparation',
    label: 'تحضير الجلسة',
    required: false,
    aliases: ['sessionpreparation', 'تحضير الجلسة', 'إعداد الجلسة'],
  },
  {
    key: 'notes',
    label: 'ملاحظات',
    required: false,
    aliases: ['ملاحظات', 'notes', 'حقول إضافية'],
  },
  {
    key: 'previousSession',
    label: 'الجلسة السابقة',
    required: false,
    aliases: ['الجلسة السابقة', 'previoussession', 'ج سابقة'],
  },
  {
    key: 'judge',
    label: 'القاضي',
    required: false,
    aliases: ['القاضي', 'judge', 'الهيئة القضائية'],
  },
  {
    key: 'firstInstanceNumber',
    label: 'رقم أول درجة',
    required: false,
    aliases: ['رقم دعوى أول درجة', 'رقم أول درجة', 'استئناف من'],
  },
  {
    key: 'firstInstanceCourt',
    label: 'محكمة أول درجة',
    required: false,
    aliases: ['محكمة أول درجة', 'أول درجة', 'محكمة الطعن'],
  },
  {
    key: 'firstInstanceDate',
    label: 'تاريخ حكم أول درجة',
    required: false,
    aliases: ['تاريخ حكم أول درجة', 'تاريخ أول درجة', 'تاريخ الحكم المطعون فيه'],
  },
  {
    key: 'firstInstanceJudgment',
    label: 'منطوق حكم أول درجة',
    required: false,
    aliases: ['منطوق الحكم المطعون فيه', 'حكم أول درجة', 'منطوق حكم أول درجة'],
  },
];

const FIELD_TABS = [
  {
    id: 'identity',
    label: 'Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©',
    fields: ['caseNumber', 'caseYear', 'plaintiffName', 'defendantName', 'court', 'circuit'],
  },
  {
    id: 'case_details',
    label: 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ø²Ø§Ø¹',
    fields: ['roleCapacity', 'litigationStage', 'agendaRoute', 'judge', 'procedureTrack'],
  },
  {
    id: 'sessions',
    label: 'Ø³Ø¬Ù„ Ø§Ù„Ø¬Ù„Ø³Ø§Øª',
    fields: ['lastSessionDate', 'sessionResult', 'nextSessionDate', 'previousSession'],
  },
  {
    id: 'judgments',
    label: 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­ÙƒÙ…',
    fields: ['summaryDecision', 'judgmentPronouncement', 'judgmentCategory'],
  },
  {
    id: 'parties',
    label: 'Ø£Ø·Ø±Ø§Ù ÙˆØ·Ù„Ø¨Ø§Øª',
    fields: ['fileLocation', 'notes', 'inspectionRequests', 'sessionPreparation'],
  },
  {
    id: 'extra',
    label: 'Ø­Ù‚ÙˆÙ„ Ø¥Ø¶Ø§ÙÙŠØ©',
    fields: ['title', 'assignedCounsel', 'defendantAddress', 'joinedCases', 'chosenHeadquarters', 'firstInstanceNumber', 'firstInstanceCourt', 'firstInstanceDate', 'firstInstanceJudgment'],
  },
];

const MAPPING_STORAGE_KEY = 'lb_import_field_maps';

const SYNC_MODES = [
  {
    id: 'smart',
    label: 'ðŸ”„ Ù…Ø²Ø§Ù…Ù†Ø© Ø°ÙƒÙŠØ© (Ù…ÙÙˆØµÙ‰ Ø¨Ù‡)',
    desc: 'ÙŠØ­Ø¯Ù‘Ø« Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø±Ù‚Ù… Ø§Ù„Ø¯Ø¹ÙˆÙ‰ + Ø§Ù„Ø³Ù†Ø©ØŒ ÙˆÙŠØ¶ÙŠÙ Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙÙ‚Ø·ØŒ ÙˆÙŠØªØ¬Ø§Ù‡Ù„ Ø§Ù„ÙØ§Ø±ØºØ©',
    icon: 'ðŸ”„',
  },
  {
    id: 'add_only',
    label: 'âž• Ø¥Ø¶Ø§ÙØ© ÙÙ‚Ø·',
    desc: 'ÙŠØ¶ÙŠÙ Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙÙ‚Ø· â€” Ù„Ø§ ÙŠØ¹Ø¯Ù‘Ù„ Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ Ø£Ø¨Ø¯Ø§Ù‹',
    icon: 'âž•',
  },
  {
    id: 'update_only',
    label: 'âœï¸ ØªØ­Ø¯ÙŠØ« ÙÙ‚Ø·',
    desc: 'ÙŠØ­Ø¯Ù‘Ø« Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯ ÙÙ‚Ø· Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø±Ù‚Ù… Ø§Ù„Ø¯Ø¹ÙˆÙ‰ + Ø§Ù„Ø³Ù†Ø© â€” Ù„Ø§ ÙŠØ¶ÙŠÙ Ø¬Ø¯ÙŠØ¯Ø§Ù‹',
    icon: 'âœï¸',
  },
  {
    id: 'force_overwrite',
    label: 'âš ï¸ Ø§Ø³ØªØ¨Ø¯Ø§Ù„ ÙƒØ§Ù…Ù„',
    desc: 'ÙŠØ³ØªØ¨Ø¯Ù„ ÙƒÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© â€” Ø®Ø·Ø±: Ù‚Ø¯ ØªÙÙ‚Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙŠØ¯ÙˆÙŠØ©',
    icon: 'âš ï¸',
    danger: true,
  },
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isEmptyRow(row) {
  return Array.isArray(row) ? row.every((cell) => String(cell || '').trim() === '') : true;
}

function normalizeCaseNumberPart(caseNumber) {
  const raw = String(caseNumber || '').trim();
  if (!raw) return '';
  return raw.split('/')[0].trim();
}

function parseImportedDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const toSafeLocalDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 1. Excel Serial Dates
  if (/^\d{4,5}$/.test(raw)) {
    const serial = parseInt(raw, 10);
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(dateObj.getTime())) return toSafeLocalDate(dateObj);
  }

  // 2. ISO format
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  // 3. DMY format (Egyptian)
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
      const temp = d; d = m; m = temp;
    }
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 4. DM format (Without year)
  const dmMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    let [, d, m] = dmMatch;
    if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
      const temp = d; d = m; m = temp;
    }
    const year = new Date().getFullYear();
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 5. JS Date fallback
  const dateObj = new Date(raw);
  if (!isNaN(dateObj.getTime())) {
    return toSafeLocalDate(dateObj);
  }

  return raw;
}

function autoDetectMapping(fileHeaders) {
  const map = {};
  fileHeaders.forEach((header, colIndex) => {
    const normalized = normalizeText(header);
    for (const field of SYSTEM_FIELDS) {
      const matched = field.aliases.some((alias) => {
        const aliasNormalized = normalizeText(alias);
        return (
          normalized === aliasNormalized ||
          normalized.includes(aliasNormalized) ||
          aliasNormalized.includes(normalized)
        );
      });
      if (matched && map[field.key] === undefined) {
        map[field.key] = colIndex;
        break;
      }
    }
  });
  return map;
}

function getSheetRows(workbook, sheetName) {
  const worksheet = workbook?.Sheets?.[sheetName];
  if (!worksheet) return [];
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });
}

function getFileSignature(headers) {
  return (Array.isArray(headers) ? headers : [])
    .map((header) => String(header || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

function saveFieldMapping(headers, map) {
  const signature = getFileSignature(headers);
  if (!signature) return;

  try {
    const saved = JSON.parse(localStorage.getItem(MAPPING_STORAGE_KEY) || '{}');
    saved[signature] = {
      map,
      savedAt: new Date().toISOString(),
      headerSample: (Array.isArray(headers) ? headers : []).slice(0, 5).join(', '),
    };

    const keys = Object.keys(saved);
    if (keys.length > 10) {
      const oldest = keys.sort((a, b) => String(saved[a]?.savedAt || '').localeCompare(String(saved[b]?.savedAt || '')))[0];
      delete saved[oldest];
    }

    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Ignore storage errors.
  }
}

function loadSavedMapping(headers) {
  const signature = getFileSignature(headers);
  if (!signature) return null;

  try {
    const saved = JSON.parse(localStorage.getItem(MAPPING_STORAGE_KEY) || '{}');
    return saved[signature]?.map || null;
  } catch {
    return null;
  }
}

export default function SmartImporter({ workspaceId: workspaceIdProp, onClose, onImported }) {
  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fieldMap, setFieldMap] = useState({});
  const [syncMode, setSyncMode] = useState('smart');
  const [activeFieldTab, setActiveFieldTab] = useState('identity');
  const [preview, setPreview] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [existingCases, setExistingCases] = useState([]);
  const [restoredMapping, setRestoredMapping] = useState(false);

  const workspaceId = String(workspaceIdProp || '').trim();

  useEffect(() => {
    setPreview([]);
    setImportResult(null);
    setImportProgress(0);
  }, [step]);

  useEffect(() => {
    if (!workspaceId || step < 3) return;

    let alive = true;
    storage.listCases(workspaceId, { limit: 2000 }).then((cases) => {
      if (!alive) return;
      setExistingCases(Array.isArray(cases) ? cases : []);
    });

    return () => {
      alive = false;
    };
  }, [workspaceId, step]);

  const existingCaseMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(existingCases) ? existingCases : []).forEach((caseItem) => {
      const key = `${normalizeCaseNumberPart(caseItem.caseNumber)}|${String(caseItem.caseYear || '').trim()}`;
      map.set(key, caseItem);
    });
    return map;
  }, [existingCases]);

  const missingRequiredFields = useMemo(() => {
    return SYSTEM_FIELDS.filter((field) => field.required && fieldMap[field.key] === undefined);
  }, [fieldMap]);

  const previewRows = useMemo(() => {
    const rows = (Array.isArray(rawData) ? rawData : []).filter((row) => !isEmptyRow(row)).slice(0, 5);

    return rows.map((row) => {
      const item = {};
      SYSTEM_FIELDS.forEach((field) => {
        const colIndex = fieldMap[field.key];
        item[field.key] = colIndex === undefined ? '' : String(row[colIndex] || '').trim();
      });

      const caseNumber = normalizeCaseNumberPart(item.caseNumber);
      const caseYear = String(item.caseYear || '').trim();
      const key = `${caseNumber}|${caseYear}`;
      const existing = existingCaseMap.get(key);

      let status = 'skip';
      if (caseNumber && caseYear) {
        status = existing ? 'duplicate' : 'new';
        if (syncMode === 'update_only' && !existing) status = 'skip';
        if (syncMode === 'add_only' && existing) status = 'duplicate';
      }

      return {
        ...item,
        _status: status,
      };
    });
  }, [rawData, fieldMap, existingCaseMap, syncMode]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setError('');
    setImportResult(null);
    setImportProgress(0);

    try {
      let workbookInstance;
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text();
        workbookInstance = XLSX.read(text, { type: 'string' });
      } else {
        const buffer = await file.arrayBuffer();
        workbookInstance = XLSX.read(buffer, { type: 'array' });
      }

      const names = Array.isArray(workbookInstance.SheetNames) ? workbookInstance.SheetNames : [];
      if (names.length === 0) {
        setError('Ø§Ù„Ù…Ù„Ù Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£ÙˆØ±Ø§Ù‚ Ø¹Ù…Ù„ ØµØ§Ù„Ø­Ø©');
        return;
      }

      const sheetName = names[0];
      const rows = getSheetRows(workbookInstance, sheetName);

      if (rows.length < 2) {
        setError('Ø§Ù„Ù…Ù„Ù ÙØ§Ø±Øº Ø£Ùˆ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª');
        return;
      }

      const fileHeaders = (rows[0] || []).map((header) => String(header || '').trim());
      const dataRows = rows.slice(1).filter((row) => !isEmptyRow(row));

      setWorkbook(workbookInstance);
      setSheetNames(names);
      setSelectedSheetName(sheetName);
      setFileName(file.name);
      setHeaders(fileHeaders);
      setRawData(dataRows);
      setActiveFieldTab('identity');
      const savedMap = loadSavedMapping(fileHeaders);
      if (savedMap) {
        setFieldMap(savedMap);
        setRestoredMapping(true);
        setTimeout(() => setRestoredMapping(false), 3000);
      } else {
        setFieldMap(autoDetectMapping(fileHeaders));
      }
      setStep(2);
    } catch (uploadError) {
      setError('ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„ÙØŒ ØªØ£ÙƒØ¯ Ø£Ù†Ù‡ Excel Ø£Ùˆ CSV ØµØ§Ù„Ø­');
      console.error('[SmartImporter.handleFileUpload]', uploadError);
    }
  };

  const handleSheetChange = (nextSheetName) => {
    if (!workbook || !nextSheetName) return;
    const rows = getSheetRows(workbook, nextSheetName);
    if (rows.length < 2) return;

    const fileHeaders = (rows[0] || []).map((header) => String(header || '').trim());
    const dataRows = rows.slice(1).filter((row) => !isEmptyRow(row));

    setSelectedSheetName(nextSheetName);
    setHeaders(fileHeaders);
    setRawData(dataRows);
    setActiveFieldTab('identity');
    const savedMap = loadSavedMapping(fileHeaders);
    if (savedMap) {
      setFieldMap(savedMap);
      setRestoredMapping(true);
      setTimeout(() => setRestoredMapping(false), 3000);
    } else {
      setFieldMap(autoDetectMapping(fileHeaders));
    }
    setPreview([]);
    setImportResult(null);
  };

  const handleFieldDrop = (fieldKey, headerIndex) => {
    setFieldMap((prev) => ({
      ...prev,
      [fieldKey]: headerIndex,
    }));
  };

  const handleNextFromMapping = async () => {
    if (missingRequiredFields.length > 0) {
      setError(`Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø¥Ù„Ø²Ø§Ù…ÙŠØ© ØºÙŠØ± Ù…Ø±ØªØ¨Ø·Ø©: ${missingRequiredFields.map((field) => field.label).join('ØŒ ')}`);
      return;
    }

    setError('');
    saveFieldMapping(headers, fieldMap);
    setExistingCases([]);
    if (workspaceId) {
      try {
        const cases = await storage.listCases(workspaceId, { limit: 2000 });
        setExistingCases(Array.isArray(cases) ? cases : []);
      } catch (loadError) {
        console.error('[SmartImporter.handleNextFromMapping]', loadError);
      }
    }

    setPreview(previewRows);
    setStep(3);
  };

  const getValueFromRow = (row, fieldKey) => {
    const colIdx = fieldMap[fieldKey];
    if (colIdx === undefined) return '';
    return String(row[colIdx] || '').trim();
  };

  const buildCaseDataFromRow = (row) => {
    const caseData = {};

    SYSTEM_FIELDS.forEach((field) => {
      const value = getValueFromRow(row, field.key);
      if (value) caseData[field.key] = value;
    });

    const normalizedNumber = normalizeCaseNumberPart(caseData.caseNumber);
    const normalizedYear = String(caseData.caseYear || '').trim();

    caseData.caseNumber = normalizedYear ? `${normalizedNumber}/${normalizedYear}` : normalizedNumber;
    caseData.caseYear = normalizedYear;

    if (!caseData.procedureTrack) caseData.procedureTrack = PROCEDURE_TRACK.CIVIL;

    const judgmentUpdate = getJudgmentReservationCaseUpdate(
      caseData.sessionResult || caseData.summaryDecision
    );
    if (judgmentUpdate) {
      caseData.status = judgmentUpdate.status;
      caseData.agendaRoute = judgmentUpdate.agendaRoute;
    } else {
      if (!caseData.status) caseData.status = CASE_STATUS.ACTIVE;
      if (!caseData.agendaRoute) caseData.agendaRoute = 'sessions';
    }

    if (!caseData.title) {
      const titleParts = [caseData.plaintiffName, caseData.defendantName].filter(Boolean);
      caseData.title = titleParts.length > 0 ? titleParts.join(' Ø¶Ø¯ ') : caseData.caseNumber;
    }

    ['lastSessionDate', 'nextSessionDate', 'firstInstanceDate'].forEach((dateField) => {
      if (caseData[dateField]) {
        caseData[dateField] = parseImportedDate(caseData[dateField]);
      }
    });

    return caseData;
  };

  const executeImport = async () => {
    if (!workspaceId) {
      setError('Ù„Ø§ ÙŠÙˆØ¬Ø¯ workspace Ù…Ø­Ø¯Ø¯');
      return;
    }

    setProcessing(true);
    setError('');
    setImportProgress(0);

    const result = {
      total: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicates: 0,
      duplicatesDetected: 0,
      duplicatesUpdated: 0,
      duplicatesSkipped: 0,
      duplicatesOverwritten: 0,
      syncMode,
    };

    try {
      const existing = await storage.listCases(workspaceId, { limit: 2000 });
      const existingMap = new Map();

      (Array.isArray(existing) ? existing : []).forEach((caseItem) => {
        const key = `${normalizeCaseNumberPart(caseItem.caseNumber)}|${String(caseItem.caseYear || '').trim()}`;
        existingMap.set(key, caseItem);
      });

      const rows = (Array.isArray(rawData) ? rawData : []).filter((row) => !isEmptyRow(row));
      result.total = rows.length;

      for (let index = 0; index < rows.length; index += 10) {
        const batch = rows.slice(index, index + 10);

        await Promise.all(
          batch.map(async (row, batchIndex) => {
            try {
              const caseData = buildCaseDataFromRow(row);
              const caseNumber = normalizeCaseNumberPart(caseData.caseNumber);
              const caseYear = String(caseData.caseYear || '').trim();

              if (!caseNumber || !caseYear) {
                result.skipped += 1;
                return;
              }

              const key = `${caseNumber}|${caseYear}`;
              const existingCase = existingMap.get(key);

              if (existingCase) {
                result.duplicates += 1;
                result.duplicatesDetected += 1;

                if (syncMode === 'add_only') {
                  result.duplicatesSkipped += 1;
                  result.skipped += 1;
                  return;
                }

                if (syncMode === 'smart' || syncMode === 'update_only') {
                  const updates = {};
                  Object.entries(caseData).forEach(([fieldKey, value]) => {
                    if (value && value !== 'â€”' && value !== 'undefined') {
                      if (!['flags', 'sessionsHistory', 'history', 'taskIds'].includes(fieldKey)) {
                        updates[fieldKey] = value;
                      }
                    }
                  });

                  updates.updatedAt = new Date().toISOString();
                  await storage.updateCase(workspaceId, existingCase.id, updates);
                  result.updated += 1;
                  result.duplicatesUpdated += 1;
                }

                if (syncMode === 'force_overwrite') {
                  caseData.updatedAt = new Date().toISOString();
                  await storage.updateCase(workspaceId, existingCase.id, caseData);
                  result.updated += 1;
                  result.duplicatesOverwritten += 1;
                }
              } else {
                if (syncMode === 'update_only') {
                  result.skipped += 1;
                  return;
                }

                caseData.flags = {
                  isImportant: false,
                  needsReview: false,
                  isUrgent: false,
                  isPlaintiff: false,
                };
                caseData.createdAt = new Date().toISOString();
                caseData.updatedAt = new Date().toISOString();

                await storage.createCase(workspaceId, caseData);
                result.added += 1;
              }
            } catch (rowError) {
              const rowNumber = index + batchIndex + 2;
              result.errors.push(`ØµÙ ${rowNumber}: ${rowError.message}`);
            }
          })
        );

        const nextProgress = Math.min(100, Math.round(((index + batch.length) / rows.length) * 100));
        setImportProgress(nextProgress);
      }
    } catch (importError) {
      result.errors.push(importError.message || 'Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯');
    } finally {
      setProcessing(false);
      setImportResult(result);
      setStep(4);
      if (typeof onImported === 'function') onImported(result);
    }
  };

  const resetImporter = () => {
    setStep(1);
    setRawData([]);
    setHeaders([]);
    setFieldMap({});
    setSyncMode('smart');
    setPreview([]);
    setImportResult(null);
    setProcessing(false);
    setImportProgress(0);
    setFileName('');
    setError('');
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setExistingCases([]);
    setActiveFieldTab('identity');
    setRestoredMapping(false);
  };

  const requiredReady = missingRequiredFields.length === 0 && rawData.length > 0;

  const headerColumns = useMemo(() => headers.map((header, index) => ({ label: header || `Ø¹Ù…ÙˆØ¯ ${index + 1}`, index })), [headers]);
  const activeTabFields = (FIELD_TABS.find((tab) => tab.id === activeFieldTab)?.fields || [])
    .map((key) => SYSTEM_FIELDS.find((field) => field.key === key))
    .filter(Boolean);

  const importModeSummary = importResult
    ? (() => {
        const mode = importResult.syncMode || syncMode;
        const detected = importResult.duplicatesDetected ?? importResult.duplicates ?? 0;
        const updatedDuplicates = importResult.duplicatesUpdated ?? 0;
        const skippedDuplicates = importResult.duplicatesSkipped ?? 0;
        const overwrittenDuplicates = importResult.duplicatesOverwritten ?? 0;

        switch (mode) {
          case 'add_only':
            return `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${importResult.added} Ù‚Ø¶ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© ÙˆØªØ¬Ø§Ù‡Ù„ ${skippedDuplicates} Ù‚Ø¶ÙŠØ© Ù…ÙƒØ±Ø±Ø©.`;
          case 'update_only':
            return `ØªÙ… ØªØ­Ø¯ÙŠØ« ${updatedDuplicates} Ù‚Ø¶ÙŠØ© Ù…ÙƒØ±Ø±Ø©ØŒ ÙˆØªÙ… ØªØ¬Ø§Ù‡Ù„ ${importResult.skipped} Ø³Ø¬Ù„Ù‹Ø§ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ù‹Ø§.`;
          case 'force_overwrite':
            return `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${importResult.added} Ù‚Ø¶ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© ÙˆØ§Ø³ØªØ¨Ø¯Ø§Ù„ ${overwrittenDuplicates} Ù‚Ø¶ÙŠØ© Ù…ÙƒØ±Ø±Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.`;
          case 'smart':
          default:
            return `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${importResult.added} Ù‚Ø¶ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© ÙˆØªØ­Ø¯ÙŠØ« ${updatedDuplicates} Ù‚Ø¶ÙŠØ© Ù…ÙƒØ±Ø±Ø©.`;
        }
      })()
    : '';

  const duplicateAuditBlocks = importResult
    ? (() => {
        const mode = importResult.syncMode || syncMode;
        const detected = importResult.duplicatesDetected ?? importResult.duplicates ?? 0;
        const updatedDuplicates = importResult.duplicatesUpdated ?? 0;
        const skippedDuplicates = importResult.duplicatesSkipped ?? 0;
        const overwrittenDuplicates = importResult.duplicatesOverwritten ?? 0;

        switch (mode) {
          case 'add_only':
            return [
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…ÙƒØªØ´ÙØ©', value: detected, color: '#b45309' },
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…ØªØ¬Ø§Ù‡Ù„Ø©', value: skippedDuplicates, color: '#6b7280' },
            ];
          case 'update_only':
            return [
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…ÙƒØªØ´ÙØ©', value: detected, color: '#b45309' },
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø¯Ø«Ø©', value: updatedDuplicates, color: '#d97706' },
              { label: 'Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ØªØ¬Ø§Ù‡Ù„Ø©', value: importResult.skipped, color: '#6b7280' },
            ];
          case 'force_overwrite':
            return [
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…ÙƒØªØ´ÙØ©', value: detected, color: '#b45309' },
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…Ø³ØªØ¨Ø¯Ù„Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„', value: overwrittenDuplicates, color: '#dc2626' },
            ];
          case 'smart':
          default:
            return [
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…ÙƒØªØ´ÙØ©', value: detected, color: '#b45309' },
              { label: 'Ø§Ù„Ù…ÙƒØ±Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø¯Ø«Ø©', value: updatedDuplicates, color: '#d97706' },
            ];
        }
      })()
    : [];

  const importOutcome = importResult
    ? (() => {
        const changed = Number(importResult.added || 0) + Number(importResult.updated || 0);
        const hasErrors = (importResult.errors || []).length > 0;
        if (!hasErrors) {
          return {
            tone: 'success',
            title: 'ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¨Ù†Ø¬Ø§Ø­',
            description: `ØªÙ…Øª Ù…Ø¹Ø§Ù„Ø¬Ø© ${importResult.total} Ø³Ø¬Ù„: Ø¥Ø¶Ø§ÙØ© ${importResult.added}ØŒ ØªØ­Ø¯ÙŠØ« ${importResult.updated}ØŒ ØªØ¬Ø§Ù‡Ù„ ${importResult.skipped}.`,
          };
        }
        if (changed > 0) {
          return {
            tone: 'warning',
            title: 'ØªÙ… Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø¬Ø²Ø¦ÙŠØ§Ù‹ Ù…Ø¹ ÙˆØ¬ÙˆØ¯ Ø£Ø®Ø·Ø§Ø¡',
            description: `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${importResult.added} ÙˆØªØ­Ø¯ÙŠØ« ${importResult.updated}ØŒ Ù…Ø¹ ${importResult.errors.length} Ø®Ø·Ø£ Ùˆ${importResult.skipped} Ø³Ø¬Ù„ Ù…ØªØ¬Ø§Ù‡Ù„.`,
          };
        }
        return {
          tone: 'error',
          title: 'ÙØ´Ù„ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯',
          description: `Ù„Ù… ÙŠØªÙ… Ø­ÙØ¸ Ø£ÙŠ Ø³Ø¬Ù„Ø§Øª. Ø¸Ù‡Ø±Øª ${importResult.errors.length} Ø£Ø®Ø·Ø§Ø¡ Ø£Ø«Ù†Ø§Ø¡ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ù„Ù.`,
        };
      })()
    : null;

  return (
    <div
      className="card"
      style={{
        width: '100%',
        maxWidth: 920,
        boxSizing: 'border-box',
        marginBottom: 16,
        padding: 20,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'white',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          margin: '-20px -20px 18px',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-page)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>ðŸ“¥ Ù…Ø³ØªÙˆØ±Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø°ÙƒÙŠ</h2>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px' }}>
              Ø¥Ø¯Ø®Ø§Ù„ ÙˆÙ…Ø²Ø§Ù…Ù†Ø©
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {['Ø§Ø®ØªØ± Ø§Ù„Ù…Ù„Ù', 'Ø·Ø§Ø¨Ù‚ Ø§Ù„Ø­Ù‚ÙˆÙ„', 'Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©', 'Ø§Ù„Ù†ØªÙŠØ¬Ø©'][Math.max(0, step - 1)]}
            {fileName ? ` â€” ${fileName}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[1, 2, 3, 4].map((currentStep) => (
            <div
              key={currentStep}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                background:
                  currentStep === step ? 'var(--primary)' : currentStep < step ? '#dcfce7' : 'var(--border)',
                color: currentStep === step ? 'white' : currentStep < step ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              {currentStep < step ? 'âœ“' : currentStep}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: 16,
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {restoredMapping && (
        <div style={{
          background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 'var(--radius-sm)', padding: '8px 14px',
          marginBottom: 12, fontSize: 13, color: '#16a34a', fontWeight: 600
        }}>
          âœ… ØªÙ… Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹ Ù…Ù† Ø§Ù„Ù…Ù„ÙØ§Øª
        </div>
      )}

      {processing ? (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Ø¬Ø§Ø±ÙŠ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...</div>
          <div style={{ width: '100%', height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                width: `${importProgress}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{importProgress}%</div>
        </div>
      ) : importResult && step === 4 ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 32 }}>{importOutcome?.tone === 'success' ? 'âœ…' : importOutcome?.tone === 'warning' ? 'âš ï¸' : 'â›”'}</div>
            <h3 style={{ margin: '8px 0' }}>{importOutcome?.title || 'Ø§ÙƒØªÙ…Ù„ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯'}</h3>
          </div>

          {importOutcome && (
            <div
              style={{
                marginBottom: 16,
                padding: '14px 16px',
                borderRadius: 12,
                background:
                  importOutcome.tone === 'success'
                    ? '#f0fdf4'
                    : importOutcome.tone === 'warning'
                      ? '#fffbeb'
                      : '#fff5f5',
                border: '1px solid',
                borderColor:
                  importOutcome.tone === 'success'
                    ? '#bbf7d0'
                    : importOutcome.tone === 'warning'
                      ? '#fde68a'
                      : '#fecaca',
                color:
                  importOutcome.tone === 'success'
                    ? '#166534'
                    : importOutcome.tone === 'warning'
                      ? '#92400e'
                      : '#b91c1c',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>{importOutcome.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>{importOutcome.description}</div>
            </div>
          )}

          <div style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontSize: 13,
            lineHeight: 1.8,
            textAlign: 'center',
          }}>
            {importModeSummary}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', value: importResult.total, color: 'var(--text-primary)' },
              { label: 'ØªÙ…Øª Ø§Ù„Ø¥Ø¶Ø§ÙØ©', value: importResult.added, color: '#16a34a' },
              { label: 'ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ«', value: importResult.updated, color: '#d97706' },
              { label: 'ØªÙ… Ø§Ù„ØªØ¬Ø§Ù‡Ù„', value: importResult.skipped, color: '#6b7280' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  background: 'var(--bg-page)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(1, duplicateAuditBlocks.length)}, 1fr)`,
            gap: 8,
            marginBottom: 16,
          }}>
            {duplicateAuditBlocks.map((stat) => (
              <div
                key={stat.label}
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  background: '#fff7ed',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #fed7aa',
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {importResult.errors.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: '#dc2626' }}>
                {importResult.errors.length} Ø®Ø·Ø£ â€” Ø§Ù†Ù‚Ø± Ù„Ù„ØªÙØ§ØµÙŠÙ„
              </summary>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  background: '#fff5f5',
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                {importResult.errors.map((entry, index) => (
                  <div key={index} style={{ color: '#dc2626', marginBottom: 4 }}>
                    {entry}
                  </div>
                ))}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={() => {
                if (typeof onClose === 'function') onClose();
                window.location.reload();
              }}
            >
              Ø±Ø§Ø¦Ø¹ â€” Ø¹Ø±Ø¶ Ø§Ù„Ù‚Ø¶Ø§ÙŠØ§
            </button>
            <button className="btn-secondary" onClick={resetImporter}>
              Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù…Ù„Ù Ø¢Ø®Ø±
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 1 && (
            <div>
              <div
                style={{
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-page)',
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 5 }}>
                      Ø§Ø³Ø­Ø¨/Ø§Ø®ØªØ± Ù…Ù„Ù Excel Ù„Ù„Ø¨Ø¯Ø¡
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                      Ø§Ø®ØªØ± Ù…Ù„Ù Excel Ø£Ùˆ CSV ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ØµÙ Ø¹Ù†Ø§ÙˆÙŠÙ† ÙÙŠ Ø£ÙˆÙ„ Ø³Ø·Ø±. Ø¨Ø¹Ø¯ Ø§Ù„Ø§Ø®ØªÙŠØ§Ø± Ø³Ù†Ø·Ø§Ø¨Ù‚ Ø§Ù„Ø£Ø¹Ù…Ø¯Ø© Ø«Ù… Ù†Ø­Ø¯Ø¯ Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©.
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
                      <span style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}>XLSX</span>
                      <span style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}>XLS</span>
                      <span style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}>CSV</span>
                    </div>
                  </div>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 170,
                      minHeight: 44,
                      borderRadius: 12,
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    Ø§Ø®ØªÙŠØ§Ø± Ù…Ù„Ù Ù„Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) => handleFileUpload(event.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {sheetNames.length > 1 && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">ÙˆØ±Ù‚Ø© Ø§Ù„Ø¹Ù…Ù„</label>
                  <select
                    className="form-input"
                    value={selectedSheetName}
                    onChange={(event) => handleSheetChange(event.target.value)}
                  >
                    {sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" type="button" onClick={onClose}>
                  Ø¥Ù„ØºØ§Ø¡
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {(() => {
                try {
                  const saved = JSON.parse(localStorage.getItem('lb_import_field_maps') || '{}');
                  const count = Object.keys(saved).length;
                  if (count === 0) return null;
                  return (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      ðŸ’¾ {count} Ø¥Ø¹Ø¯Ø§Ø¯ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù…Ø­ÙÙˆØ¸ Ù…Ù† Ù…Ù„ÙØ§Øª Ø³Ø§Ø¨Ù‚Ø©
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}

              {restoredMapping && (
                <div style={{
                  background: '#dcfce7', border: '1px solid #86efac',
                  borderRadius: 'var(--radius-sm)', padding: '8px 14px',
                  marginBottom: 12, fontSize: 13, color: '#16a34a',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 16 }}>âœ…</span>
                  <div>
                    <strong>ØªÙ… Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©</strong>
                    <span style={{ fontWeight: 400, marginRight: 8, fontSize: 12 }}>
                      Ù„Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹ Ù…Ù† Ø§Ù„Ù…Ù„ÙØ§Øª ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setRestoredMapping(false);
                      const autoMap = autoDetectMapping(headers);
                      setFieldMap(autoMap);
                    }}
                    style={{ marginRight: 'auto', background: 'none', border: '1px solid #86efac',
                             borderRadius: 6, padding: '2px 10px', cursor: 'pointer',
                             fontFamily: 'Cairo', fontSize: 12, color: '#16a34a' }}
                  >
                    Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ÙƒØ´Ù Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø­Ù‚ÙˆÙ„</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Ø§Ø³Ø­Ø¨ Ø§Ù„Ø¹Ù…ÙˆØ¯ Ø¥Ù„Ù‰ Ø§Ù„Ø­Ù‚Ù„ Ø£Ùˆ Ø§Ø®ØªØ±Ù‡ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©
                </div>
              </div>

              <div style={{
                display: 'flex', gap: 4, marginBottom: 16,
                borderBottom: '2px solid var(--border)',
                overflowX: 'auto', paddingBottom: 0
              }}>
                {FIELD_TABS.map((tab) => {
                  const tabFields = tab.fields.filter((fieldKey) =>
                    SYSTEM_FIELDS.find((systemField) => systemField.key === fieldKey)
                  );
                  const mappedCount = tabFields.filter((fieldKey) => fieldMap[fieldKey] !== undefined).length;
                  const requiredCount = tabFields.filter((fieldKey) =>
                    SYSTEM_FIELDS.find((systemField) => systemField.key === fieldKey)?.required
                  ).length;
                  const requiredMapped = tabFields.filter((fieldKey) =>
                    SYSTEM_FIELDS.find((systemField) => systemField.key === fieldKey)?.required && fieldMap[fieldKey] !== undefined
                  ).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFieldTab(tab.id)}
                      style={{
                        padding: '8px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', fontFamily: 'Cairo', fontSize: 13, whiteSpace: 'nowrap',
                        fontWeight: activeFieldTab === tab.id ? 700 : 400,
                        color: activeFieldTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                        borderBottom: activeFieldTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                        marginBottom: '-2px', position: 'relative'
                      }}
                    >
                      {tab.label}
                      <span style={{
                        marginRight: 6, fontSize: 10,
                        background: requiredCount > 0 && requiredMapped < requiredCount
                          ? '#fee2e2' : mappedCount > 0 ? '#dcfce7' : 'var(--border)',
                        color: requiredCount > 0 && requiredMapped < requiredCount
                          ? '#dc2626' : mappedCount > 0 ? '#16a34a' : 'var(--text-muted)',
                        padding: '1px 6px', borderRadius: 10, fontWeight: 700
                      }}>
                        {mappedCount}/{tabFields.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„Ù…Ù„Ù</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                    {headerColumns.map((header) => (
                      <div
                        key={header.index}
                        draggable
                        onDragStart={() => {
                          window.__smartImporterDragIndex = header.index;
                        }}
                        onDragEnd={() => {
                          window.__smartImporterDragIndex = undefined;
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 999,
                          background: 'var(--bg-page)',
                          border: '1px solid var(--border)',
                          cursor: 'grab',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {header.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù†Ø¸Ø§Ù…ÙŠØ©</div>
                  {activeTabFields.map((field) => (
                    <div
                      key={field.key}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedIndex = Number(window.__smartImporterDragIndex);
                        if (!Number.isNaN(draggedIndex)) {
                          handleFieldDrop(field.key, draggedIndex);
                        }
                      }}
                      style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                          background: field.required
                            ? (fieldMap[field.key] !== undefined ? '#f0fdf4' : '#fff5f5')
                            : 'var(--bg-page)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 6,
                        border: '1px solid',
                          borderColor: field.required
                            ? (fieldMap[field.key] !== undefined ? '#86efac' : '#fca5a5')
                            : 'var(--border)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: field.required ? 700 : 500 }}>
                          {field.label}
                        </span>
                        {field.required && (
                          <span style={{ color: '#dc2626', marginRight: 4, fontSize: 11 }}>*</span>
                        )}
                      </div>
                      <select
                        value={fieldMap[field.key] ?? ''}
                        onChange={(event) =>
                          setFieldMap((prev) => ({
                            ...prev,
                            [field.key]: event.target.value === '' ? undefined : Number(event.target.value),
                          }))
                        }
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          background: fieldMap[field.key] !== undefined ? 'white' : '#fafafa',
                        }}
                      >
                        <option value="">â€” ØºÙŠØ± Ù…Ø±ØªØ¨Ø· â€”</option>
                        {headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header || `Ø¹Ù…ÙˆØ¯ ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
                  Ø±Ø¬ÙˆØ¹
                </button>
                <button className="btn-primary" type="button" onClick={handleNextFromMapping} disabled={!requiredReady}>
                  Ø§Ù„ØªØ§Ù„ÙŠ
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Ù…Ø±Ø§Ø¬Ø¹Ø© + ØªØ­Ø¯ÙŠØ¯ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {previewRows.length} ØµÙÙˆÙ Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©. Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙƒØ±Ø±Ø© Ø³ØªÙØ·Ø§Ø¨Ù‚ Ø¹Ù„Ù‰ Ø±Ù‚Ù… Ø§Ù„Ø¯Ø¹ÙˆÙ‰ + Ø§Ù„Ø³Ù†Ø©.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                {SYNC_MODES.map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => setSyncMode(mode.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: syncMode === mode.id ? 'var(--primary)' : 'var(--border)',
                      background:
                        syncMode === mode.id ? 'var(--primary-light)' : mode.danger ? '#fff5f5' : 'var(--bg-page)',
                      cursor: 'pointer',
                      marginBottom: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{mode.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{mode.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      {SYSTEM_FIELDS.filter((field) => fieldMap[field.key] !== undefined).map((field) => (
                        <th key={field.key}>{field.label}</th>
                      ))}
                      <th>Ø§Ù„Ø­Ø§Ù„Ø©</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr
                        key={index}
                        style={{
                          background:
                            row._status === 'duplicate'
                              ? '#fffbeb'
                              : row._status === 'new'
                                ? '#f0fdf4'
                                : 'white',
                        }}
                      >
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{index + 1}</td>
                        {SYSTEM_FIELDS.filter((field) => fieldMap[field.key] !== undefined).map((field) => (
                          <td key={field.key} style={{ fontSize: 12 }}>
                            {field.key === 'caseNumber' ?
                              formatCaseNumber(row[field.key], row.caseYear) :
                              field.key === 'lastSessionDate' || field.key === 'nextSessionDate' ?
                                formatDisplayDate(row[field.key]) :
                                row[field.key] || 'â€”'}
                          </td>
                        ))}
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '1px 8px',
                              borderRadius: 10,
                              background:
                                row._status === 'duplicate'
                                  ? '#fef3c7'
                                  : row._status === 'new'
                                    ? '#dcfce7'
                                    : '#f1f5f9',
                              color:
                                row._status === 'duplicate'
                                  ? '#d97706'
                                  : row._status === 'new'
                                    ? '#16a34a'
                                    : '#6b7280',
                            }}
                          >
                            {row._status === 'duplicate' ? 'ØªØ­Ø¯ÙŠØ«' : row._status === 'new' ? 'Ø¬Ø¯ÙŠØ¯' : 'ØªØ¬Ø§Ù‡Ù„'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button className="btn-secondary" type="button" onClick={() => setStep(2)}>
                  Ø±Ø¬ÙˆØ¹
                </button>
                <button className="btn-primary" type="button" onClick={executeImport} disabled={!requiredReady || processing}>
                  ØªÙ†ÙÙŠØ° Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}