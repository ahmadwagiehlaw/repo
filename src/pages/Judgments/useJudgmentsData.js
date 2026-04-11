import { useEffect, useMemo, useState } from 'react';
import storage from '@/data/Storage.js';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  CASE_STATUS,
  EXECUTION_STATUS,
  EXECUTION_STATUS_LABELS,
  JUDGMENT_TYPE,
  JUDGMENT_TYPE_LABELS,
  TASK_PRIORITY,
} from '@/core/Constants.js';
import { getRolloverCasePatch } from '@/workflows/SessionRollover.js';
import { getDerivedCaseSessionType } from '@/utils/caseCanonical.js';

const DEFAULT_JUDGMENT_TYPES = [
  { value: 'for_us', label: 'لصالحنا', color: '#16a34a', bg: '#dcfce7', appealDays: 0, isPlaintiff: false },
  { value: 'against_us', label: 'ضدنا', color: '#dc2626', bg: '#fee2e2', appealDays: 40 },
  { value: 'partial', label: 'جزئي', color: '#d97706', bg: '#fef3c7', appealDays: 40 },
  { value: 'suspension_penalty', label: 'وقف جزائي', color: '#7c3aed', bg: '#ede9fe', appealDays: 45, warningDays: 30 },
  { value: 'suspension_pending', label: 'وقف تعليقي', color: '#0284c7', bg: '#dbeafe', appealDays: 0 },
  { value: 'expert', label: 'إحالة لخبير', color: '#0891b2', bg: '#cffafe', appealDays: 0 },
  { value: 'non_existent', label: 'اعتبر كأن لم يكن', color: '#6b7280', bg: '#f3f4f6', appealDays: 40 },
  { value: 'rejection', label: 'رفض الطعن', color: '#dc2626', bg: '#fee2e2', appealDays: 40 },
  { value: 'cancellation', label: 'إلغاء القرار', color: '#16a34a', bg: '#dcfce7', appealDays: 0 },
  { value: 'referral', label: 'إحالة للتحقيق', color: '#9333ea', bg: '#f3e8ff', appealDays: 0 },
];

const FALLBACK_TYPE_CONFIG = {
  value: JUDGMENT_TYPE.OTHER,
  label: JUDGMENT_TYPE_LABELS[JUDGMENT_TYPE.OTHER] || 'أخرى',
  color: '#6b7280',
  bg: '#f3f4f6',
  appealDays: 40,
};

const NEXT_ACTION_OPTIONS = [
  'إرجاع للمرافعة',
  'تقرير الخبير',
  'الانتظار لحكم الخبير',
  'تعجيل من الوقف',
  'طعن بالاستئناف',
];

function detectIsPlaintiff(roleCapacity) {
  const text = String(roleCapacity || '').toLowerCase();
  return ['مدع', 'طاعن', 'مستأنف', 'ملتمس'].some((key) => text.includes(key));
}

function calcAppealDeadline(judgmentDate, judgmentType, courtType, workspaceSettings, judgmentTypes) {
  if (!judgmentDate) return null;

  const typeConfig = judgmentTypes.find((type) => type.value === judgmentType);
  const baseDays = Number(typeConfig?.appealDays ?? 40);
  if (baseDays === 0) return null;

  const court = String(courtType || '');
  const isAdmin = court.includes('إداري') || court.includes('مجلس الدولة');
  const days = isAdmin
    ? Number(workspaceSettings?.appealDeadlineSupremeAdmin || 60)
    : baseDays;

  const date = new Date(judgmentDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getDeadlineUrgency(deadlineDate) {
  if (!deadlineDate) return null;
  const days = Math.ceil((new Date(deadlineDate) - new Date()) / 86400000);
  if (days < 0) return { days, color: '#6b7280', bg: '#f3f4f6', label: 'انتهت المهلة' };
  if (days <= 7) return { days, color: '#dc2626', bg: '#fee2e2', label: `⚠️ ${days} يوم` };
  if (days <= 15) return { days, color: '#d97706', bg: '#fef3c7', label: `${days} يوم` };
  return { days, color: '#16a34a', bg: '#dcfce7', label: `${days} يوم` };
}

function normalizeJudgmentRecord(judgment) {
  const judgmentDate = judgment.judgmentDate || judgment.pronouncementDate || judgment.date || '';
  const judgmentSummary = judgment.judgmentSummary || judgment.summary || judgment.notes || '';
  const summaryDecision = judgment.summaryDecision || judgment.decision || judgmentSummary || '';
  const judgmentCategory = judgment.judgmentCategory || judgment.judgmentType || JUDGMENT_TYPE.OTHER;
  return {
    id: judgment.id,
    caseId: judgment.caseId || '',
    caseNumber: judgment.caseNumber || '',
    caseYear: judgment.caseYear || '',
    plaintiffName: judgment.plaintiffName || judgment.clientName || '',
    defendantName: judgment.defendantName || '',
    court: judgment.court || '',
    judgmentDate,
    judgmentType: judgment.judgmentType || JUDGMENT_TYPE.OTHER,
    judgmentSummary,
    summaryDecision,
    judgmentCategory,
    judgmentPronouncement: judgment.judgmentPronouncement || '',
    originSessionType: judgment.originSessionType || '',
    originSessionDate: judgment.originSessionDate || '',
    isFinal: Boolean(judgment.isFinal),
    isPlaintiff: Boolean(judgment.isPlaintiff),
    appealDeadlineDays: Number(judgment.appealDeadlineDays || 0),
    appealDeadlineDate: judgment.appealDeadlineDate || '',
    executionStatus: judgment.executionStatus || EXECUTION_STATUS.PENDING,
    attachmentUrl: judgment.attachmentUrl || '',
    notes: judgment.notes || '',
    nextAction: judgment.nextAction || '',
  };
}

export function useJudgmentsData({ formatUiDate }) {
  const { loading: casesContextLoading } = useCases();
  const { currentWorkspace } = useWorkspace();

  const [cases, setCases] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [workspaceSettings, setWorkspaceSettings] = useState({});
  const [judgmentTypes, setJudgmentTypes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_judgment_types')) || DEFAULT_JUDGMENT_TYPES;
    } catch {
      return DEFAULT_JUDGMENT_TYPES;
    }
  });
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [addingJudgment, setAddingJudgment] = useState(null);
  const [formByCaseId, setFormByCaseId] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [tableEdits, setTableEdits] = useState({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  const workspaceId = String(currentWorkspace?.id || '').trim();

  const loadJudgments = async () => {
    if (!workspaceId) {
      setCases([]);
      setJudgments([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [allCases, dbJudgments, settings] = await Promise.all([
        storage.listCases(workspaceId, { limit: 500 }),
        storage.listJudgments(workspaceId, { limit: 200 }),
        storage.getWorkspaceSettings(workspaceId),
      ]);

      const sourceCases = Array.isArray(allCases) ? allCases : [];
      const sourceJudgments = (Array.isArray(dbJudgments) ? dbJudgments : []).map(normalizeJudgmentRecord);

      const judgmentCases = sourceCases.filter((caseItem) => {
        const explicitlyReturnedToSessions = (
          caseItem.agendaRoute === 'sessions'
          && caseItem.status === CASE_STATUS.ACTIVE
          && Boolean(caseItem.returnedFromJudgmentsAt)
        );
        if (explicitlyReturnedToSessions) return false;

        const routeOrStatus = (
          caseItem.agendaRoute === 'judgments'
          || caseItem.status === 'reserved_for_judgment'
          || caseItem.status === 'judged'
          || caseItem.status === 'appeal_window_open'
        );

        const hasJudgmentInSessions = (Array.isArray(caseItem.sessionsHistory) ? caseItem.sessionsHistory : []).some((session) => {
          const text = `${session?.sessionType || ''} ${session?.type || ''} ${session?.decision || ''} ${session?.result || ''}`.toLowerCase();
          return text.includes('حكم') || text.includes('judgment');
        });

        const hasDbJudgment = sourceJudgments.some((judgment) => String(judgment.caseId || '') === String(caseItem.id || ''));
        const hasLegacyJudgment = Boolean(
          String(caseItem.summaryDecision || '').trim()
            || String(caseItem.judgmentPronouncement || '').trim()
            || String(caseItem.judgmentCategory || caseItem.judgmentType || '').trim()
        );
        return routeOrStatus || hasJudgmentInSessions || hasDbJudgment || hasLegacyJudgment;
      });

      setCases(judgmentCases);
      setJudgments(sourceJudgments);
      setWorkspaceSettings(settings || {});
    } catch (nextError) {
      setError(nextError);
      setCases([]);
      setJudgments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJudgments().catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, typeFilter, searchQuery, viewMode, dateFrom, dateTo, filterMonth]);

  const judgmentsByCaseId = useMemo(() => {
    const map = new Map();
    judgments.forEach((judgment) => {
      const key = String(judgment.caseId || '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(judgment);
    });
    return map;
  }, [judgments]);

  const filteredCases = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();

    return cases.filter((caseItem) => {
      const caseJudgments = (judgmentsByCaseId.get(String(caseItem.id || '')) || []).slice();

      // Date range filter
      if (dateFrom || dateTo) {
        const hasMatchingDate = caseJudgments.some((j) => {
          const jDate = j.judgmentDate || j.pronouncementDate || '';
          if (!jDate) return false;
          if (dateFrom && jDate < dateFrom) return false;
          if (dateTo && jDate > dateTo) return false;
          return true;
        });
        const legacyDate = caseItem.lastSessionDate || '';
        const legacyMatch = legacyDate
          && (!dateFrom || legacyDate >= dateFrom)
          && (!dateTo || legacyDate <= dateTo);
        if (!hasMatchingDate && !legacyMatch) return false;
      }

      const hasLegacyJudgment = Boolean(
        String(caseItem.summaryDecision || '').trim()
          || String(caseItem.judgmentPronouncement || '').trim()
          || String(caseItem.judgmentCategory || caseItem.judgmentType || '').trim()
      );
      if (caseJudgments.length === 0 && hasLegacyJudgment) {
        // نفس fallback المستخدم في كروت العرض حتى لا تختفي الأحكام المستوردة من الفلاتر.
        caseJudgments.push({
          judgmentType: caseItem.judgmentType || caseItem.judgmentCategory || JUDGMENT_TYPE.OTHER,
          judgmentCategory: caseItem.judgmentCategory || JUDGMENT_TYPE.OTHER,
          summaryDecision: caseItem.summaryDecision || '',
          judgmentPronouncement: caseItem.judgmentPronouncement || '',
          isFinal: true,
        });
      }
      const isPlaintiff = Boolean(caseItem.flags?.isPlaintiff) || detectIsPlaintiff(caseItem.roleCapacity);

      if (filterMonth) {
        const hasMatchInMonth = caseJudgments.some((j) => (j.judgmentDate || '').startsWith(filterMonth));
        if (!hasMatchInMonth) return false;
      }

      if (activeFilter === 'reserved') {
        if (caseJudgments.length > 0) return false;
        if (caseItem.status !== 'reserved_for_judgment') return false;
      }

      if (activeFilter === 'judged') {
        if (caseJudgments.length === 0 && caseItem.status !== 'judged') return false;
      }

      if (activeFilter === 'plaintiff_urgent') {
        const hasUrgent = caseJudgments.some((judgment) => {
          const urgency = getDeadlineUrgency(judgment.appealDeadlineDate);
          return isPlaintiff && urgency && urgency.days <= 15;
        });
        if (!hasUrgent) return false;
      }

      // Filter by Judgment Type: ندعم أحكام subcollection وحقول الاستيراد القديمة معًا.
      if (activeFilter !== 'reserved' && typeFilter && typeFilter !== 'all') {
        const typeConfig = judgmentTypes.find((type) => type.value === typeFilter);
        const filterLabel = typeConfig ? typeConfig.label : typeFilter;

        const hasMatchingJudgment = caseJudgments.some((judgment) => (
          judgment.judgmentType === typeFilter
          || judgment.judgmentCategory === typeFilter
          || judgment.judgmentCategory === filterLabel
        ));

        const legacyCategory = String(caseItem.judgmentCategory || caseItem.judgmentType || '');
        const legacySummary = String(caseItem.summaryDecision || '');
        const hasLegacyMatch = (
          legacyCategory === typeFilter
          || legacyCategory === filterLabel
          || legacySummary.includes(filterLabel)
          || (typeFilter === 'deemed_non_existent' && legacySummary.includes('اعتبار'))
          || (typeFilter === 'non_existent' && legacySummary.includes('اعتبار'))
        );

        if (!hasMatchingJudgment && !hasLegacyMatch) return false;
      }

      if (!query) return true;

      const searchable = [
        caseItem.caseNumber,
        caseItem.caseYear,
        caseItem.plaintiffName,
        caseItem.defendantName,
        caseItem.court,
        ...caseJudgments.map((judgment) => `${judgment.summaryDecision} ${judgment.judgmentSummary} ${judgment.judgmentCategory} ${judgment.judgmentPronouncement} ${judgment.judgmentType} ${judgment.notes}`),
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [cases, judgmentsByCaseId, activeFilter, typeFilter, searchQuery, judgmentTypes, dateFrom, dateTo, filterMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const pagedCases = filteredCases.slice((page - 1) * pageSize, page * pageSize);

  const tableRows = useMemo(() => {
    const rows = [];
    filteredCases.forEach((caseItem) => {
      const caseJudgments = (judgmentsByCaseId.get(String(caseItem.id || '')) || [])
        .slice()
        .sort((a, b) => new Date(b.judgmentDate || 0) - new Date(a.judgmentDate || 0));

      if (caseJudgments.length === 0) {
        rows.push({
          id: `placeholder-${caseItem.id}`,
          placeholder: true,
          caseId: caseItem.id,
          caseNumber: caseItem.caseNumber,
          caseYear: caseItem.caseYear,
          plaintiffName: caseItem.plaintiffName,
          court: caseItem.court,
          status: caseItem.status,
        });
      } else {
        caseJudgments.forEach((judgment) => rows.push({ ...judgment, placeholder: false }));
      }
    });
    return rows;
  }, [filteredCases, judgmentsByCaseId]);

  const pagedTableRows = tableRows.slice((page - 1) * pageSize, page * pageSize);

  const urgentJudgments = useMemo(() => {
    return judgments.filter((judgment) => {
      if (!judgment.isPlaintiff || !judgment.appealDeadlineDate) return false;
      const days = Math.ceil((new Date(judgment.appealDeadlineDate) - new Date()) / 86400000);
      return days >= 0 && days <= 15;
    });
  }, [judgments]);

  const filteredTableJudgments = useMemo(() => {
    return judgments.filter((judgment) => {
      if (filterMonth && !(judgment.judgmentDate || '').startsWith(filterMonth)) return false;
      if (activeFilter !== 'reserved' && typeFilter !== 'all') {
        const typeConfig = judgmentTypes.find((type) => type.value === typeFilter);
        const filterLabel = typeConfig ? typeConfig.label : typeFilter;
        if (
          judgment.judgmentType !== typeFilter
          && judgment.judgmentCategory !== typeFilter
          && judgment.judgmentCategory !== filterLabel
          && !String(judgment.summaryDecision || '').includes(filterLabel)
        ) {
          return false;
        }
      }

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return [
        judgment.caseNumber,
        judgment.plaintiffName,
        judgment.summaryDecision,
        judgment.judgmentSummary,
        judgment.judgmentCategory,
        judgment.judgmentPronouncement,
        judgment.originSessionType,
        judgment.judgmentType,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [judgments, activeFilter, typeFilter, searchQuery, judgmentTypes, filterMonth]);

  const getTypeConfig = (value) => {
    return judgmentTypes.find((type) => type.value === value)
      || judgmentTypes.find((type) => type.value === JUDGMENT_TYPE.OTHER)
      || FALLBACK_TYPE_CONFIG;
  };

  const getFormState = (caseItem) => {
    const key = String(caseItem.id || '');
    const isPlaintiff = Boolean(caseItem.flags?.isPlaintiff) || detectIsPlaintiff(caseItem.roleCapacity);
    const baseType = judgmentTypes[0]?.value || JUDGMENT_TYPE.OTHER;
    return formByCaseId[key] || {
      judgmentDate: caseItem.nextSessionDate || '',
      judgmentType: baseType,
      summaryDecision: '',
      judgmentCategory: baseType,
      judgmentSummary: '',
      judgmentPronouncement: '',
      originSessionType: getDerivedCaseSessionType(caseItem),
      originSessionDate: caseItem.nextSessionDate || caseItem.lastSessionDate || '',
      isFinal: false,
      nextAction: '',
      attachmentUrl: '',
      notes: '',
      executionStatus: EXECUTION_STATUS.PENDING,
      appealDeadlineDate: calcAppealDeadline(caseItem.nextSessionDate || '', baseType, caseItem.court, workspaceSettings, judgmentTypes) || '',
      appealDeadlineDays: Number(getTypeConfig(baseType)?.appealDays || 0),
      isPlaintiff,
    };
  };

  const startAddJudgment = (caseId) => {
    const key = String(caseId || '');
    setFormByCaseId((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setAddingJudgment(key);
  };

  const startEditJudgment = (caseItem, judgment) => {
    const key = String(caseItem?.id || judgment?.caseId || '');
    if (!key || !judgment) return;
    const judgmentType = judgment.judgmentType || judgment.judgmentCategory || JUDGMENT_TYPE.OTHER;
    const isPlaintiff = Boolean(caseItem?.flags?.isPlaintiff) || detectIsPlaintiff(caseItem?.roleCapacity);

    setFormByCaseId((prev) => ({
      ...prev,
      [key]: {
        editingJudgmentId: judgment.isLegacy ? '' : judgment.id,
        editingLegacyJudgment: Boolean(judgment.isLegacy),
        judgmentDate: judgment.judgmentDate || caseItem?.lastSessionDate || '',
        judgmentType,
        summaryDecision: judgment.summaryDecision || '',
        judgmentCategory: judgment.judgmentCategory || judgmentType,
        judgmentSummary: judgment.judgmentSummary || '',
        judgmentPronouncement: judgment.judgmentPronouncement || '',
        originSessionType: judgment.originSessionType || getDerivedCaseSessionType(caseItem),
        originSessionDate: judgment.originSessionDate || judgment.judgmentDate || caseItem?.lastSessionDate || '',
        isFinal: judgment.isFinal !== false,
        nextAction: judgment.nextAction || '',
        attachmentUrl: judgment.attachmentUrl || '',
        notes: judgment.notes || '',
        executionStatus: judgment.executionStatus || EXECUTION_STATUS.PENDING,
        appealDeadlineDate: judgment.appealDeadlineDate || '',
        appealDeadlineDays: Number(judgment.appealDeadlineDays || getTypeConfig(judgmentType)?.appealDays || 0),
        isPlaintiff,
      },
    }));
    setAddingJudgment(key);
  };

  const updateForm = (caseId, patch) => {
    setFormByCaseId((prev) => ({
      ...prev,
      [caseId]: {
        ...(prev[caseId] || {}),
        ...patch,
      },
    }));
  };

  const setRowEdit = (judgmentId, field, value) => {
    setTableEdits((prev) => ({
      ...prev,
      [judgmentId]: {
        ...(prev[judgmentId] || {}),
        [field]: value,
      },
    }));
  };

  const isPlaintiffForCase = (caseItem) => {
    return Boolean(caseItem.flags?.isPlaintiff) || detectIsPlaintiff(caseItem.roleCapacity);
  };

  const getUrgentJudgmentDaysLabel = (judgment) => {
    const days = Math.ceil((new Date(judgment.appealDeadlineDate) - new Date()) / 86400000);
    return days === 0 ? 'اليوم!' : `${days} يوم`;
  };

  const persistTypes = (next) => {
    setJudgmentTypes(next);
    localStorage.setItem('lb_judgment_types', JSON.stringify(next));
  };

  const handleDateClick = async (date) => {
    if (!date || !workspaceId) return;
    const docs = await storage.listArchiveDocuments(workspaceId);
    const linked = (Array.isArray(docs) ? docs : []).find((doc) => {
      const uploadDate = String(doc?.uploadDate || '');
      const notes = String(doc?.notes || '');
      return uploadDate.startsWith(date) || notes.includes(date);
    });

    if (linked?.fileUrl) {
      window.open(linked.fileUrl, '_blank');
      return;
    }

    alert(`لا يوجد رول مرفق لجلسة ${formatUiDate(date)}`);
  };

  const handleReturnToSessions = async (caseItem) => {
    if (!workspaceId) return;
    const targetCaseId = String(caseItem?.caseId || caseItem?.id || '').trim();
    if (!targetCaseId) return;
    await storage.updateCase(workspaceId, targetCaseId, {
      ...getRolloverCasePatch('next_session'),
      status: CASE_STATUS.ACTIVE,
      agendaRoute: 'sessions',
      returnedFromJudgmentsAt: new Date().toISOString(),
    });
    await loadJudgments();
    alert('أُعيدت الدعوى إلى الجلسات/المرافعة بنجاح');
  };

  const handleSendToChamber = async (caseItem) => {
    if (!workspaceId) return;
    const targetCaseId = String(caseItem?.caseId || caseItem?.id || '').trim();
    if (!targetCaseId) return;
    await storage.updateCase(workspaceId, targetCaseId, {
      agendaRoute: 'chamber',
      status: 'suspended',
      litigationStage: 'موقوف تعليقياً',
      returnedFromJudgmentsAt: '',
    });
    await loadJudgments();
  };

  const handleCreateJudgment = async (caseItem) => {
    if (!workspaceId) return;

    const caseId = String(caseItem.id || '');
    const form = getFormState(caseItem);
    const judgmentDate = String(form.judgmentDate || '').trim();
    const judgmentType = String(form.judgmentType || '').trim();

    if (!judgmentDate || !judgmentType) {
      alert('يرجى تحديد تاريخ الحكم وتصنيفه');
      return;
    }

    const isPlaintiff = Boolean(caseItem.flags?.isPlaintiff) || detectIsPlaintiff(caseItem.roleCapacity);
    const appealDeadlineDate = isPlaintiff ? String(form.appealDeadlineDate || '') : '';
    const appealDeadlineDays = Number(form.appealDeadlineDays || 0);
    const summaryDecision = String(form.summaryDecision || '').trim();
    const judgmentSummary = String(form.judgmentSummary || '').trim();
    const judgmentCategory = String(form.judgmentCategory || judgmentType || '').trim();
    const judgmentPronouncement = String(form.judgmentPronouncement || '').trim();
    const originSessionType = String(form.originSessionType || getDerivedCaseSessionType(caseItem)).trim();
    const originSessionDate = String(form.originSessionDate || caseItem.nextSessionDate || caseItem.lastSessionDate || '').trim();

    const judgmentPayload = {
      caseId,
      caseNumber: caseItem.caseNumber || '',
      caseYear: caseItem.caseYear || '',
      plaintiffName: caseItem.plaintiffName || caseItem.clientName || '',
      defendantName: caseItem.defendantName || '',
      court: caseItem.court || '',
      judgmentDate,
      date: judgmentDate,
      pronouncementDate: judgmentDate,
      judgmentType,
      summaryDecision,
      judgmentCategory,
      judgmentSummary,
      judgmentPronouncement,
      originSessionType,
      originSessionDate,
      isFinal: Boolean(form.isFinal),
      isPlaintiff,
      appealDeadlineDays,
      appealDeadlineDate,
      executionStatus: form.executionStatus || EXECUTION_STATUS.PENDING,
      attachmentUrl: String(form.attachmentUrl || '').trim(),
      notes: String(form.notes || '').trim(),
      nextAction: String(form.nextAction || '').trim(),
    };

    if (form.editingLegacyJudgment) {
      await storage.updateCase(workspaceId, caseId, {
        judgmentType,
        judgmentCategory,
        summaryDecision,
        judgmentSummary,
        judgmentPronouncement,
        lastSessionDate: judgmentDate,
        sessionResult: summaryDecision || judgmentSummary || judgmentType,
        status: form.isFinal ? 'judged' : 'reserved_for_judgment',
        agendaRoute: 'judgments',
        litigationStage: 'محجوز للحكم',
      });
      setAddingJudgment(null);
      setFormByCaseId((prev) => {
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
      await loadJudgments();
      return;
    }

    if (form.editingJudgmentId) {
      await storage.updateJudgment(workspaceId, form.editingJudgmentId, judgmentPayload);
      setAddingJudgment(null);
      setFormByCaseId((prev) => {
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
      await loadJudgments();
      return;
    }

    await storage.createJudgment(workspaceId, judgmentPayload);

    await storage.updateCase(workspaceId, caseId, {
      status: form.isFinal ? 'judged' : 'reserved_for_judgment',
      agendaRoute: 'judgments',
      litigationStage: 'محجوز للحكم',
      returnedFromJudgmentsAt: '',
      lastSessionDate: judgmentDate,
      sessionResult: summaryDecision || judgmentSummary || judgmentType,
    });

    if (isPlaintiff && appealDeadlineDate && !form.isFinal) {
      await storage.createTask(workspaceId, {
        caseId,
        title: `متابعة ميعاد الطعن — ينتهي ${formatUiDate(appealDeadlineDate)}`,
        dueDate: appealDeadlineDate,
        priority: TASK_PRIORITY.CRITICAL,
        status: 'open',
        autoGenerated: true,
        createdByRuleName: 'حساب ميعاد الطعن',
        explanation: `تم إنشاء هذه المهمة تلقائيًا لمتابعة ميعاد الطعن على حكم ${judgmentType}`,
      });
    }

    setAddingJudgment(null);
    setFormByCaseId((prev) => {
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
    await loadJudgments();
  };

  const saveTableEdits = async () => {
    if (!workspaceId) return;
    const entries = Object.entries(tableEdits);
    if (!entries.length) return;

    setSavingEdits(true);
    try {
      for (const [judgmentId, updates] of entries) {
        const merged = { ...updates };
        if (merged.judgmentDate && !merged.date) {
          merged.date = merged.judgmentDate;
          merged.pronouncementDate = merged.judgmentDate;
        }
        await storage.updateJudgment(workspaceId, judgmentId, merged);
      }
      setTableEdits({});
      await loadJudgments();
    } finally {
      setSavingEdits(false);
    }
  };

  return {
    cases,
    judgments,
    workspaceSettings,
    judgmentTypes,
    showTypesManager,
    loading,
    error,
    activeFilter,
    typeFilter,
    searchQuery,
    filterMonth,
    setFilterMonth,
    viewMode,
    addingJudgment,
    formByCaseId,
    page,
    pageSize,
    tableEdits,
    savingEdits,
    editingCell,
    workspaceId,
    casesContextLoading,
    setJudgmentTypes,
    setShowTypesManager,
    setActiveFilter,
    setTypeFilter,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setViewMode,
    setAddingJudgment,
    setPage,
    setPageSize,
    setEditingCell,
    loadJudgments,
    detectIsPlaintiff,
    normalizeJudgmentRecord,
    calcAppealDeadline,
    getDeadlineUrgency,
    getTypeConfig,
    persistTypes,
    getFormState,
    startAddJudgment,
    startEditJudgment,
    updateForm,
    setRowEdit,
    handleDateClick,
    handleReturnToSessions,
    handleSendToChamber,
    handleCreateJudgment,
    saveTableEdits,
    judgmentsByCaseId,
    filteredCases,
    totalPages,
    pagedCases,
    tableRows,
    pagedTableRows,
    urgentJudgments,
    filteredTableJudgments,
    isPlaintiffForCase,
    getUrgentJudgmentDaysLabel,
    executionStatusLabels: EXECUTION_STATUS_LABELS,
    defaultJudgmentType: JUDGMENT_TYPE.OTHER,
    nextActionOptions: NEXT_ACTION_OPTIONS,
  };
}
