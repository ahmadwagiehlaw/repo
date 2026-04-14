import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CASE_STATUS } from '@/core/Constants.js';
import storage from '@/data/Storage.js';
import {
  getJudgmentReservationCaseUpdate,
  getRolloverRouteFromDecision,
  isDecisionUnrouted,
  SessionRollover,
} from '@/workflows/SessionRollover.js';
import { openSessionRoll } from '@/utils/openSessionRoll.js';
import { getDisplaySettings, setDisplaySettings } from '@/utils/caseUtils.js';
import {
  getCaseFileLocation,
  getCaseSessionResult,
  getDerivedCaseRollNumber,
  getDerivedCaseSessionType,
} from '@/utils/caseCanonical.js';

const FULL_COPY_FIELDS = [
  'decision', 'sessionType', 'nextDate',
  'fileLocation', 'notes', 'inspectionRequests', 'sessionMinute',
];

export function useSessionsData({ allColumns, defaultVisible, decisionOptions, sessionTypeOptions }) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const rollover = new SessionRollover({ storage });

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', dir: 'desc' });
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_sessions_cols')) || defaultVisible;
    } catch {
      return defaultVisible;
    }
  });
  const [colWidths, setColWidths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_sessions_widths')) || {};
    } catch {
      return {};
    }
  });
  const [colOrder, setColOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_sessions_col_order')) || defaultVisible;
    } catch {
      return defaultVisible;
    }
  });
  const [draggedCol, setDraggedCol] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [savedViews, setSavedViews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_sessions_views')) || [];
    } catch {
      return [];
    }
  });
  const [showColSettings, setShowColSettings] = useState(false);
  const [useArabicNumerals, setUseArabicNumerals] = useState(() => getDisplaySettings().useArabicNumerals);
  const [editMode, setEditMode] = useState(false);
  const [localEdits, setLocalEdits] = useState({});
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('lb_sessions_pagesize')) || 10);
  const [page, setPage] = useState(1);
  const [dateMode, setDateMode] = useState('single');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [activeSessionTypes, setActiveSessionTypes] = useState(new Set());
  const [showInspectionFilter, setShowInspectionFilter] = useState(false);
  const [optionsManager, setOptionsManager] = useState(null);
  const [fieldOptions, setFieldOptions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_field_options')) || {
        decision: decisionOptions,
        sessionType: sessionTypeOptions,
      };
    } catch {
      return { decision: [], sessionType: [] };
    }
  });
  const [fieldDefaults, setFieldDefaults] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_field_defaults')) || {};
    } catch {
      return {};
    }
  });

  const [error, setError] = useState(null);
  const [rollingOver, setRollingOver] = useState(null);
  const [rolloverRoute, setRolloverRoute] = useState('next_session');
  const [bulkRolloverLoading, setBulkRolloverLoading] = useState(false);
  const [viewNameInput, setViewNameInput] = useState('');
  const [archiveIndex, setArchiveIndex] = useState(new Map());
  const [dateTooltip, setDateTooltip] = useState(null);

  const workspaceId = String(currentWorkspace?.id || '').trim();

  const formatNum = useCallback((value) => {
    if (!value && value !== 0) return '—';
    if (useArabicNumerals) {
      return String(value).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
    }
    return String(value);
  }, [useArabicNumerals]);

  const getCurrentWeekRange = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const distToSat = (day + 1) % 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() - distToSat);
    const thu = new Date(sat);
    thu.setDate(sat.getDate() + 5);
    return {
      start: sat.toISOString().split('T')[0],
      end: thu.toISOString().split('T')[0],
    };
  }, []);

  const normalizeSearchDate = useCallback((query) => {
    const match = query.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const match2 = query.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (match2) {
      const [, d, m, y] = match2;
      return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return null;
  }, []);

  const formatDateInput = useCallback((value) => {
    const v = String(value || '').trim();
    const patterns = [
      { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fn: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
      { re: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, fn: (m) => `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
      { re: /^(\d{1,2})\/(\d{1,2})$/, fn: (m) => `${new Date().getFullYear()}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    ];
    for (const { re, fn } of patterns) {
      const m = v.match(re);
      if (m) return fn(m);
    }
    return v;
  }, []);

  const suggestRoute = useCallback((decision) => {
    if (getJudgmentReservationCaseUpdate(decision)) return 'judgments';
    const d = String(decision || '').toLowerCase();
    if (d.includes('حكم') || d.includes('حجز')) return 'judgments';
    if (d.includes('شطب')) return 'archive';
    return 'next_session';
  }, []);

  const saveFieldOptions = useCallback((field, options) => {
    const next = { ...fieldOptions, [field]: options };
    setFieldOptions(next);
    localStorage.setItem('lb_field_options', JSON.stringify(next));
  }, [fieldOptions]);

  const saveFieldDefault = useCallback((field, value) => {
    const next = { ...fieldDefaults, [field]: value };
    setFieldDefaults(next);
    localStorage.setItem('lb_field_defaults', JSON.stringify(next));
  }, [fieldDefaults]);


  // Cache clear helper
  const clearSessionsCache = useCallback(() => {
    try {
      sessionStorage.removeItem(`lb_sessions_cases_${workspaceId}`); // legacy key
      sessionStorage.removeItem(`lb_sessions_cases_v2_${workspaceId}`); // new key
    } catch { /* ignore */ }
  }, [workspaceId]);

  const loadSessionsFromCases = useCallback(async () => {
    if (!workspaceId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);

    const CACHE_KEY = `lb_sessions_cases_v2_${workspaceId}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    try {
      let allCases = null;
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) allCases = data;
        }
      } catch { /* ignore cache errors */ }

      if (!allCases) {
        allCases = await storage.listCases(workspaceId, { limit: 2000 });
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            data: allCases,
            ts: Date.now(),
          }));
        } catch { /* ignore storage quota errors */ }
      }

      const allSessions = [];
      const EXCLUDED_ROUTES = ['archive', 'judgments', 'chamber', 'referred'];
      (Array.isArray(allCases) ? allCases : []).forEach((caseItem) => {
        const route = String(caseItem.agendaRoute || '').trim().toLowerCase();
        if (EXCLUDED_ROUTES.includes(route)) return; // skip routed-out cases
        allSessions.push({
          id: `${caseItem.id}-current`,
          caseId: caseItem.id,
          rollNumber: getDerivedCaseRollNumber(caseItem),
          caseNumber: caseItem.caseNumber,
          caseYear: caseItem.caseYear,
          clientName: caseItem.plaintiffName || caseItem.clientName || '',
          defendantName: caseItem.defendantName || caseItem.defendant || '',
          court: caseItem.court || '',
          date: caseItem.lastSessionDate || '',
          sessionType: getDerivedCaseSessionType(caseItem),
          decision: getCaseSessionResult(caseItem),
          nextDate: caseItem.nextSessionDate || '',
          agendaRoute: caseItem.agendaRoute || 'sessions',
          status: caseItem.status || CASE_STATUS.ACTIVE,
          sessionMinute: caseItem.sessionMinute || '',
          inspectionRequests: caseItem.inspectionRequests || '',
          fileLocation: getCaseFileLocation(caseItem),
          notes: caseItem.notes || '',
          hasNoNextSession: !caseItem.nextSessionDate,
        });
      });

      setSessions(allSessions);
    } catch (loadError) {
      console.error('Sessions load error:', loadError);
      setError(loadError);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadSessionsFromCases().catch(() => {});
  }, [loadSessionsFromCases]);

  const refreshArchiveIndex = useCallback(async () => {
    if (!workspaceId) {
      setArchiveIndex(new Map());
      return;
    }
    try {
      const docs = await storage.listArchiveDocuments(workspaceId);
      const index = new Map();
      docs.forEach((doc) => {
        if (doc.linkedSessionDate || doc.sessionDate) {
          const date = doc.linkedSessionDate || doc.sessionDate;
          index.set(date, doc);
        }
        if (doc.linkedSessionId) {
          index.set(doc.linkedSessionId, doc);
        }
      });
      setArchiveIndex(index);
    } catch {
      setArchiveIndex(new Map());
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const timer = setTimeout(() => {
      refreshArchiveIndex();
    }, 3000);
    return () => clearTimeout(timer);
  }, [workspaceId, refreshArchiveIndex]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeFilter, dateFrom, dateTo]);

  const filteredSessions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const week = getCurrentWeekRange();

    let result = sessions.filter((s) => {
      if (activeFilter === 'week') {
        return String(s.nextDate || '') >= week.start && String(s.nextDate || '') <= week.end;
      }
      if (activeFilter === 'upcoming') return String(s.nextDate || '') >= today;
      if (activeFilter === 'lastWeek') {
        const end = today;
        const start = new Date();
        start.setDate(new Date().getDate() - 7);
        const startStr = start.toISOString().split('T')[0];
        return String(s.date || '') >= startStr && String(s.date || '') <= end;
      }
      if (activeFilter === 'unrouted') return isDecisionUnrouted(s.decision, s);
      if (activeFilter === 'inquiry') return !!s.hasNoNextSession;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const normalizedDate = normalizeSearchDate(q);

      result = result.filter((s) => {
        if (normalizedDate) {
          return (
            String(s.date || '').includes(normalizedDate)
            || String(s.nextDate || '').includes(normalizedDate)
          );
        }

        const searchable = [
          s.caseNumber,
          s.caseYear,
          s.clientName,
          s.defendantName,
          s.court,
          s.decision,
          s.sessionType,
          s.date,
          s.nextDate,
        ].join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }

    if (dateMode === 'single' && dateFrom) {
      result = result.filter((s) => (
        String(s.date || '') === dateFrom || String(s.nextDate || '') === dateFrom
      ));
    }
    if (dateMode === 'range' && dateFrom) {
      result = result.filter((s) => {
        const d = s.nextDate || s.date;
        if (!d) return false;
        if (dateTo) return d >= dateFrom && d <= dateTo;
        return d >= dateFrom;
      });
    }

    if (activeSessionTypes.size > 0) {
      result = result.filter((s) => activeSessionTypes.has(s.sessionType));
    }

    if (showInspectionFilter) {
      result = result.filter((s) => String(s.inspectionRequests || '').trim());
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const isNumeric = !isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '';
      const cmp = isNumeric
        ? aNum - bNum
        : String(aVal).localeCompare(String(bVal), 'ar');
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    sessions,
    searchQuery,
    activeFilter,
    sortConfig,
    dateFrom,
    dateTo,
    dateMode,
    activeSessionTypes,
    showInspectionFilter,
    normalizeSearchDate,
    getCurrentWeekRange,
  ]);

  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const totalPagesForUi = Math.max(1, totalPages);
  const safePage = Math.min(page, totalPagesForUi);
  const paginatedSessions = filteredSessions.slice((safePage - 1) * pageSize, safePage * pageSize);

  const copyRowFromPrevious = useCallback((sessionId) => {
    const rows = paginatedSessions;
    const idx = rows.findIndex((s) => s.id === sessionId);
    if (idx <= 0) return;

    const prev = rows[idx - 1];
    const prevEdits = localEdits[prev.id] || {};

    setLocalEdits((existing) => {
      const currentEdits = existing[sessionId] || {};
      const copied = {};

      FULL_COPY_FIELDS.forEach((field) => {
        const val = prevEdits[field] ?? prev[field];
        if (val) copied[field] = val;
      });

      return { ...existing, [sessionId]: { ...currentEdits, ...copied } };
    });
  }, [paginatedSessions, localEdits]);

  const orderedVisibleColumns = useMemo(() => (
    colOrder
      .filter((key) => visibleCols.includes(key))
      .map((key) => allColumns.find((c) => c.key === key))
      .filter(Boolean)
  ), [allColumns, colOrder, visibleCols]);

  useEffect(() => {
    if (page > totalPagesForUi) {
      setPage(totalPagesForUi);
    }
  }, [page, totalPagesForUi]);

  useEffect(() => {
    if (!editMode) return;
    setLocalEdits((prev) => {
      const next = { ...prev };
      let changed = false;

      sessions.forEach((s) => {
        ['decision', 'sessionType'].forEach((field) => {
          const defaultVal = fieldDefaults[field];
          if (!defaultVal) return;
          if (s[field]) return;
          if (next[s.id]?.[field]) return;

          next[s.id] = { ...(next[s.id] || {}), [field]: defaultVal };
          changed = true;
        });
      });

      return changed ? next : prev;
    });
  }, [editMode, sessions, fieldDefaults]);

  useEffect(() => {
    setColOrder((prev) => {
      const normalized = Array.isArray(prev) ? prev : [];
      const onlyVisible = normalized.filter((key) => visibleCols.includes(key));
      const missingVisible = visibleCols.filter((key) => !onlyVisible.includes(key));
      const next = [...onlyVisible, ...missingVisible];
      localStorage.setItem('lb_sessions_col_order', JSON.stringify(next));
      return next;
    });
  }, [visibleCols]);

  const saveView = useCallback(() => {
    const name = viewNameInput.trim();
    if (!name) return;
    const newView = {
      name,
      cols: visibleCols,
      order: colOrder,
    };
    const newViews = [...savedViews, newView];
    setSavedViews(newViews);
    localStorage.setItem('lb_sessions_views', JSON.stringify(newViews));
    setViewNameInput('');
  }, [viewNameInput, visibleCols, colOrder, savedViews]);

  const handleColResize = useCallback((key, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[key] || allColumns.find((c) => c.key === key)?.width || 120;

    const onMove = (ev) => {
      const newW = Math.max(60, startW + (startX - ev.clientX));
      setColWidths((prev) => {
        const next = { ...prev, [key]: newW };
        localStorage.setItem('lb_sessions_widths', JSON.stringify(next));
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [allColumns, colWidths]);

  const handleColumnDrop = useCallback((targetColKey) => {
    if (!draggedCol || draggedCol === targetColKey) return;
    const newOrder = [...colOrder];
    const fromIdx = newOrder.indexOf(draggedCol);
    const toIdx = newOrder.indexOf(targetColKey);
    if (fromIdx === -1 || toIdx === -1) return;
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedCol);
    setColOrder(newOrder);
    localStorage.setItem('lb_sessions_col_order', JSON.stringify(newOrder));
    setDraggedCol(null);
  }, [draggedCol, colOrder]);

  const handleSortColumn = useCallback((col) => {
    if (!col.sortable) return;
    setSortConfig((prev) => ({
      key: col.key,
      dir: prev.key === col.key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleRollover = useCallback(async (session, route) => {
    try {
      await rollover.execute(workspaceId, session, {
        route,
        actorName: user?.displayName || 'المستشار',
      });
      setRollingOver(null);
      setRolloverRoute('next_session');
      await loadSessionsFromCases();
      clearSessionsCache();
      alert('تم تحريك الجلسة بنجاح ✅');
    } catch (rolloverError) {
      alert(`تعذر تحريك الجلسة: ${rolloverError.message}`);
    }
  }, [loadSessionsFromCases, rollover, user?.displayName, workspaceId, clearSessionsCache]);


  const printBulkSessions = useCallback((sessionsList) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = sessionsList.map((s) => `
      <tr>
        <td>${s.caseNumber || ''}${s.caseYear ? '/' + s.caseYear : ''}</td>
        <td>${s.clientName || '—'}</td>
        <td>${s.court || '—'}</td>
        <td>${s.date || '—'}</td>
        <td>${s.nextDate || '—'}</td>
        <td>${s.sessionType || '—'}</td>
        <td>${s.decision || '—'}</td>
        <td>${s.notes || '—'}</td>
      </tr>
    `).join('');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8"/>
        <title>الجلسات المرحّلة</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif;
                 direction: rtl; padding: 20px; font-size: 13px; }
          h2 { margin-bottom: 8px; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1;
                   padding: 8px 10px; text-align: right; }
          th { background: #f8fafc; font-weight: 700; }
          @media print { @page { size: A4 landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>الجلسات المرحّلة</h2>
        <div class="meta">
          عدد الجلسات: ${sessionsList.length} —
          تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
        </div>
        <table>
          <thead>
            <tr>
              <th>رقم الدعوى</th><th>المدعي</th><th>المحكمة</th>
              <th>الجلسة الحالية</th><th>الجلسة القادمة</th>
              <th>نوع الجلسة</th><th>القرار</th><th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  }, []);

  const handleBulkRollover = useCallback(async () => {
    if (bulkRolloverLoading) return;

    const selected = sessions.filter((session) => selectedRows.has(session.id));
    if (selected.length === 0) return;

    const actionable = selected
      .filter((session) => session?.caseId)
      .map((session) => ({
        session,
        route: getRolloverRouteFromDecision(session.decision) || 'next_session',
      }));

    if (actionable.length === 0) {
      alert('لا توجد جلسات قابلة للترحيل ضمن التحديد الحالي');
      return;
    }

    const printFirst = window.confirm(
      `سيتم ترحيل ${actionable.length} جلسة.\n\nهل تريد طباعة قائمة الجلسات قبل الترحيل؟\n\n` +
      `(اضغط موافق للطباعة ثم الترحيل — اضغط إلغاء للترحيل مباشرة)`
    );

    if (printFirst) {
      printBulkSessions(actionable.map((a) => a.session));
    }

    try {
      setBulkRolloverLoading(true);
      for (const { session, route } of actionable) {
        await rollover.execute(workspaceId, session, {
          route,
          actorName: user?.displayName || 'المستشار',
        });
      }
      setSelectedRows((prev) => {
        const next = new Set(prev);
        actionable.forEach(({ session }) => next.delete(session.id));
        return next;
      });
      await loadSessionsFromCases();
      const skippedCount = selected.length - actionable.length;
      alert(
        skippedCount > 0
          ? `تم ترحيل ${actionable.length} جلسة، وتخطي ${skippedCount} سجل غير قابل للترحيل ✅`
          : `تم ترحيل ${actionable.length} جلسة بنجاح ✅`
      );
    } catch (bulkError) {
      alert(`تعذر الترحيل الجماعي: ${bulkError.message}`);
    } finally {
      setBulkRolloverLoading(false);
    }
  }, [bulkRolloverLoading, loadSessionsFromCases, rollover, selectedRows, sessions, user?.displayName, workspaceId]);

  const isEditableColumn = useCallback((colKey) => editMode && [
    'decision', 'nextDate', 'sessionType', 'rollNumber',
    'notes', 'sessionMinute', 'inspectionRequests', 'fileLocation'
  ].includes(colKey), [editMode]);

  const saveAllEdits = useCallback(async () => {
    const updates = Object.entries(localEdits);
    if (!updates.length) {
      setEditMode(false);
      return;
    }

    setEditMode(false);
    const promises = [];

    for (const [sessionId, fields] of updates) {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session?.caseId) continue;

      const caseUpdate = {};
      if (fields.decision !== undefined) {
        caseUpdate.sessionResult = fields.decision;
        Object.assign(caseUpdate, getJudgmentReservationCaseUpdate(fields.decision) || {});
      }
      if (fields.nextDate !== undefined) caseUpdate.nextSessionDate = fields.nextDate;
      if (fields.sessionType !== undefined) caseUpdate.sessionType = fields.sessionType;
      if (fields.rollNumber !== undefined) caseUpdate.rollNumber = fields.rollNumber;
      if (fields.notes !== undefined) caseUpdate.notes = fields.notes;
      if (fields.sessionMinute !== undefined) caseUpdate.sessionMinute = fields.sessionMinute;
      if (fields.inspectionRequests !== undefined) caseUpdate.inspectionRequests = fields.inspectionRequests;
      if (fields.fileLocation !== undefined) caseUpdate.fileLocation = fields.fileLocation;

      if (Object.keys(caseUpdate).length) {
        promises.push(storage.updateCase(workspaceId, session.caseId, caseUpdate));
      }
    }

    await Promise.all(promises);
    clearSessionsCache();

    setSessions((prev) => prev.map((s) => {
      const edits = localEdits[s.id];
      if (!edits) return s;
      return { ...s, ...edits };
    }));

    setLocalEdits({});
    alert(`تم حفظ ${updates.length} تعديل ✅`);
  }, [localEdits, sessions, workspaceId, clearSessionsCache]);

  const applyBulkFieldUpdate = useCallback(async (field, val) => {
    if (!val) return;

    const fieldMap = {
      decision: { sessionResult: val },
      nextDate: { nextSessionDate: val },
      sessionType: { sessionType: val },
      fileLocation: { fileLocation: val },
      notes: { notes: val },
    };

    const updates = fieldMap[field];
    if (!updates) return;
    const finalUpdates = field === 'decision'
      ? { ...updates, ...(getJudgmentReservationCaseUpdate(val) || {}) }
      : updates;

    const promises = [];
    for (const sessionId of selectedRows) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session?.caseId) {
        promises.push(storage.updateCase(workspaceId, session.caseId, finalUpdates));
      }
    }
    await Promise.all(promises);

    setSessions((prev) => prev.map((s) => (
      selectedRows.has(s.id)
        ? { ...s, [field]: val }
        : s
    )));
  }, [selectedRows, sessions, workspaceId]);

  const openSessionDate = useCallback(async (targetDate) => {
    if (!targetDate || !workspaceId) return;
    const found = await openSessionRoll(targetDate, workspaceId, storage);
    if (!found) {
      setDateTooltip(targetDate);
      setTimeout(() => setDateTooltip(null), 2000);
    }
  }, [workspaceId]);

  const toggleArabicNumerals = useCallback(() => {
    const next = !useArabicNumerals;
    setUseArabicNumerals(next);
    setDisplaySettings({ useArabicNumerals: next });
  }, [useArabicNumerals]);

  const setVisibleColsPersisted = useCallback((next) => {
    setVisibleCols(next);
    localStorage.setItem('lb_sessions_cols', JSON.stringify(next));
  }, []);

  const applySavedView = useCallback((view) => {
    setVisibleCols(view.cols);
    if (view.order) setColOrder(view.order);
    localStorage.setItem('lb_sessions_cols', JSON.stringify(view.cols));
    if (view.order) localStorage.setItem('lb_sessions_col_order', JSON.stringify(view.order));
  }, []);

  const setPageSizePersisted = useCallback((val) => {
    setPageSize(val);
    setPage(1);
    localStorage.setItem('lb_sessions_pagesize', String(val));
  }, []);

  return {
    currentWorkspace,
    workspaceId,
    sessions,
    filteredSessions,
    paginatedSessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    sortConfig,
    setSortConfig,
    visibleCols,
    setVisibleCols: setVisibleColsPersisted,
    colWidths,
    setColWidths,
    colOrder,
    setColOrder,
    draggedCol,
    setDraggedCol,
    selectedRows,
    setSelectedRows,
    savedViews,
    setSavedViews,
    showColSettings,
    setShowColSettings,
    useArabicNumerals,
    toggleArabicNumerals,
    editMode,
    setEditMode,
    localEdits,
    setLocalEdits,
    pageSize,
    setPageSize: setPageSizePersisted,
    page,
    setPage,
    copyRowFromPrevious,
    dateMode,
    setDateMode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showDateFilter,
    setShowDateFilter,
    showTypeFilters,
    setShowTypeFilters,
    activeSessionTypes,
    setActiveSessionTypes,
    showInspectionFilter,
    setShowInspectionFilter,
    optionsManager,
    setOptionsManager,
    fieldOptions,
    fieldDefaults,
    errorState: error,
    rollingOver,
    setRollingOver,
    rolloverRoute,
    setRolloverRoute,
    bulkRolloverLoading,
    viewNameInput,
    setViewNameInput,
    archiveIndex,
    refreshArchiveIndex,
    dateTooltip,
    loadSessionsFromCases,
    handleColResize,
    handleColumnDrop,
    handleSortColumn,
    handleRollover,
    handleBulkRollover,
    isEditableColumn,
    saveAllEdits,
    formatNum,
    getCurrentWeekRange,
    formatDateInput,
    suggestRoute,
    saveFieldOptions,
    saveFieldDefault,
    saveView,
    totalPagesForUi,
    orderedVisibleColumns,
    openSessionDate,
    applyBulkFieldUpdate,
    applySavedView,
  };
}
