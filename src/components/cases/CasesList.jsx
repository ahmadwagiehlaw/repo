import { useEffect, useMemo, useRef, useState } from 'react';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import { CASE_FLAGS_DEFAULT } from '@/core/Constants.js';
import CaseForm from '@/components/cases/CaseForm.jsx';
import SmartImporter from '@/components/import/SmartImporter.jsx';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { useSensitiveMode } from '@/hooks/useSensitiveMode.js';
import { openCasePanel } from '@/utils/openCasePanel.js';
import { formatDisplayDate, getCaseNumberPillStyle } from '@/utils/caseUtils.js';
import { confirmDialog } from '@/utils/browserFeedback.js';
import {
  getCaseFileLocation,
  getCaseRoleCapacity,
  getCaseSessionResult,
  getDerivedCaseSessionType,
} from '@/utils/caseCanonical.js';

const FILTER_CHIP_ITEMS = [
  { id: 'pleading', label: 'المتداول', icon: '▶' },
  { id: 'no_next_session', label: 'بدون جلسة قادمة', icon: '⚠' },
  { id: 'chamber', label: 'الشعبة', icon: '🏛' },
  { id: 'referred', label: 'المحال', icon: '↗' },
  { id: 'isImportant', label: 'الهامة', icon: '★' },
  { id: 'isPlaintiff', label: 'مدعين', icon: '◉' },
  { id: 'all', label: 'الكل', icon: '☰' },
];

const FILE_STATUS_LABELS = {
  original: 'أصلي',
  temporary: 'مؤقت',
  joined: 'مضموم',
  incomplete: 'غير كامل',
};

const STATUS_LABELS = {
  new: 'جديدة',
  active: 'نشطة',
  under_review: 'قيد المراجعة',
  reserved_for_judgment: 'محجوزة للحكم',
  judged: 'محكوم فيها',
  appeal_window_open: 'نافذة الطعن',
  suspended: 'موقوفة',
  struck_out: 'مشطوبة',
  archived: 'مؤرشفة',
};

function getCapacityStyle(capacity) {
  const text = String(capacity || '').trim();
  if (text.includes('مدعين') || text.includes('طاعن') || text === 'مدعي' || text.includes('مستأنف')) {
    return { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' };
  }
  if (text.includes('لا شأن') || text.includes('لا شان')) {
    return { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', opacity: 0.7 };
  }
  return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
}

function mergedFlags(baseFlags, optimisticFlags) {
  return {
    ...CASE_FLAGS_DEFAULT,
    ...(baseFlags || {}),
    ...(optimisticFlags || {}),
  };
}

function getRouteDisplay(caseItem) {
  const route = String(caseItem?.agendaRoute || '').trim().toLowerCase();
  switch (route) {
    case 'sessions':  return { label: 'الجلسات',  background: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' };
    case 'judgments': return { label: 'الأحكام',  background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' };
    case 'archive':   return { label: 'الأرشيف',  background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' };
    case 'chamber':   return { label: 'الشعبة',   background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
    case 'referred':  return { label: 'المحال',   background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' };
    default:          return { label: 'غير محدد', background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' };
  }
}

function isChamberCase(caseItem) {
  return (
    caseItem?.agendaRoute === 'chamber'
    || String(caseItem?.status || '').includes('suspended')
    || String(caseItem?.procedureTrack || '').includes('شعبة')
    || String(caseItem?.litigationStage || '').includes('شعبة')
  );
}

function isReferredCase(caseItem) {
  return (
    caseItem?.agendaRoute === 'referred'
    || String(caseItem?.procedureTrack || '').includes('إحال')
    || String(caseItem?.litigationStage || '').includes('إحال')
  );
}

function isNoNextSessionCase(caseItem) {
  return (
    !caseItem?.nextSessionDate
    && caseItem?.agendaRoute !== 'archive'
    && caseItem?.agendaRoute !== 'judgments'
    && !isChamberCase(caseItem)
    && !isReferredCase(caseItem)
  );
}

function isPleadingCase(caseItem) {
  return (
    caseItem?.agendaRoute !== 'archive'
    && caseItem?.agendaRoute !== 'judgments'
    && !isChamberCase(caseItem)
    && !isReferredCase(caseItem)
    && !isNoNextSessionCase(caseItem)
  );
}

function getSessionTriple(caseItem) {
  const history = Array.isArray(caseItem?.sessionsHistory)
    ? [...caseItem.sessionsHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    : [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const past   = history.filter(s => new Date(s.date || 0) <= today);
  const future = [...history.filter(s => new Date(s.date || 0) > today)]
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const current  = past[0] || null;
  const previous = past[1] || null;
  const next     = future[0] || (caseItem?.nextSessionDate
    ? { date: caseItem.nextSessionDate, sessionType: caseItem.nextSessionType }
    : null);
  return { current, previous, next };
}

function isDormantRole(value) {
  const compact = String(value || '').trim().replace(/[\s_-]+/g, '').toLowerCase();
  return compact === 'لاشأن' || compact === 'nointerest';
}

export default function CasesList() {
  const { cases, loading, filters, setFilter, updateFlags, loadCases } = useCases();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();
  const { hidden: sensitiveHidden } = useSensitiveMode();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [optimisticByCaseId, setOptimisticByCaseId] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    () => Number(localStorage.getItem('lb_cases_pagesize')) || 12
  );

  const workspaceId = String(currentWorkspace?.id || '').trim();
  const activeFilter = String(filters?.active || 'pleading');
  const [selectedCases, setSelectedCases] = useState(new Set());
  const [isBulkRolling, setIsBulkRolling] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const initializedDefaultFilter = useRef(false);

  useEffect(() => {
    if (initializedDefaultFilter.current) return;
    initializedDefaultFilter.current = true;
    setFilter('pleading');
  }, [setFilter]);

  const toggleCaseSelection = (id) => {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getBulkRolloverUpdates = (action) => {
    switch (action) {
      case 'chamber':  return { agendaRoute: 'chamber',   litigationStage: 'موقوف تعليقياً', status: 'suspended' };
      case 'judgment': return { agendaRoute: 'judgments', status: 'reserved_for_judgment', litigationStage: 'محجوز للحكم' };
      case 'referred': return { agendaRoute: 'referred',  litigationStage: 'موقوف تعليقياً', status: 'suspended' };
      case 'pleading': return { agendaRoute: 'sessions',  status: 'active', litigationStage: 'متداول' };
      default: return null;
    }
  };

  const handleBulkRollover = async (action) => {
    if (!workspaceId || selectedCases.size === 0) return;
    setIsBulkRolling(true);
    const updates = getBulkRolloverUpdates(action);
    try {
      await Promise.all(Array.from(selectedCases).map((id) => storage.updateCase(workspaceId, id, updates)));
      setSelectedCases(new Set());
      window.location.reload();
    } catch (err) {
      console.error('Bulk Rollover failed', err);
    } finally {
      setIsBulkRolling(false);
    }
  };

  const filteredAndSearched = useMemo(() => {
    let result = Array.isArray(cases) ? cases : [];

    if (activeFilter === 'reserved_for_judgment') {
      result = result.filter((c) => c.agendaRoute === 'judgments' || c.status === 'reserved_for_judgment');
    } else if (activeFilter !== 'all') {
      if (activeFilter === 'pleading')        result = result.filter((c) => isPleadingCase(c));
      else if (activeFilter === 'referred')   result = result.filter((c) => isReferredCase(c));
      else if (activeFilter === 'no_next_session') result = result.filter((c) => isNoNextSessionCase(c));
      else if (activeFilter === 'chamber')    result = result.filter((c) => c.agendaRoute === 'chamber' || String(c.procedureTrack || '').includes('شعبة'));
      else if (activeFilter === 'isImportant') result = result.filter((c) => c.flags?.isImportant);
      else if (activeFilter === 'isPlaintiff') result = result.filter((c) => c.flags?.isPlaintiff || String(c.roleCapacity || '').includes('مدع'));
      else result = result.filter((c) => c.flags?.[activeFilter] === true);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const searchable = [
          c.caseNumber, c.caseYear, c.plaintiffName, c.clientName,
          c.defendantName, c.court, getCaseSessionResult(c),
          c.lastSessionDate, c.nextSessionDate,
        ].join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }
    return result;
  }, [cases, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSearched.length / pageSize));
  const paginatedCases = filteredAndSearched.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [activeFilter, searchQuery]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const handleCaseClick = (caseId) => { if (caseId) openCasePanel(caseId); };

  const toggleFlag = async (event, caseItem, flagName) => {
    event.stopPropagation();
    if (flagName === 'isUrgent') return;
    const currentFlags = mergedFlags(caseItem.flags, optimisticByCaseId[caseItem.id]);
    const nextValue = !Boolean(currentFlags[flagName]);
    setConfirmDialog({ caseItem, flagName, nextValue, title: 'تأكيد التغيير', message: 'هل تريد تأكيد تغيير هذه العلامة؟' });
  };

  const confirmFlagToggle = async () => {
    if (!confirmDialog) return;
    const { caseItem, flagName, nextValue } = confirmDialog;
    setConfirmDialog(null);
    const targetWorkspaceId = String(currentWorkspace?.id || caseItem?.workspaceId || '').trim();
    if (!targetWorkspaceId || !caseItem?.id) return;

    const currentFlags = mergedFlags(caseItem.flags, optimisticByCaseId[caseItem.id]);
    setOptimisticByCaseId((prev) => ({
      ...prev,
      [caseItem.id]: { ...(prev[caseItem.id] || {}), [flagName]: nextValue },
    }));

    try {
      await updateFlags(targetWorkspaceId, caseItem.id, flagName, nextValue);
    } catch (error) {
      setOptimisticByCaseId((prev) => ({
        ...prev,
        [caseItem.id]: { ...(prev[caseItem.id] || {}), [flagName]: Boolean(currentFlags[flagName]) },
      }));
    }
  };

  const handleDeleteCase = async (event, caseItem) => {
    event.stopPropagation();
    const targetWorkspaceId = String(currentWorkspace?.id || caseItem?.workspaceId || '').trim();
    if (!targetWorkspaceId || !caseItem?.id) return;
    const confirmed = window.confirm('تأكيد حذف القضية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!confirmed) return;
    try {
      await storage.deleteCase(targetWorkspaceId, caseItem.id);
      await loadCases(targetWorkspaceId, 1000);
    } catch (error) {
      alert('تعذر حذف القضية حالياً.');
    }
  };

  if (loading) return <div className="loading-text">جاري تحميل القضايا...</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">القضايا</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            إجمالي: {filteredAndSearched.length} قضية
          </span>
          <button type="button" className={isSelectionMode ? "btn-primary" : "btn-secondary"} style={{ fontSize: 13 }} onClick={() => {
            if (isSelectionMode) { setIsSelectionMode(false); setSelectedCases(new Set()); }
            else { setIsSelectionMode(true); }
          }}>
            {isSelectionMode ? 'إلغاء وضع التحديد' : '✓ تحديد / ترحيل متعدد'}
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowImporter(true)}>
            استيراد
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAddForm(true)}>
            إضافة قضية
          </button>
        </div>
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <div className="filter-chips" style={{ marginBottom: 0 }}>
            {FILTER_CHIP_ITEMS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`filter-chip ${activeFilter === chip.id ? 'active' : ''}`}
                onClick={() => setFilter(chip.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{chip.icon}</span>
                  <span>{chip.label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* شريط الترحيل الجماعي */}
          {isSelectionMode && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
              border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)', direction: 'rtl',
              flexWrap: 'wrap', animation: 'fadeIn 0.2s ease-out',
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selectedCases.size > 0 ? '#3b82f6' : '#94a3b8', color: 'white', minWidth: '22px', height: '22px',
                borderRadius: '11px', padding: '0 8px', fontSize: '12px', fontWeight: 800,
              }}>
                {selectedCases.size} محدد
              </span>
              
              <button 
                onClick={() => {
                  if (selectedCases.size === filteredAndSearched.length) {
                    setSelectedCases(new Set());
                  } else {
                    setSelectedCases(new Set(filteredAndSearched.map(c => c.id)));
                  }
                }}
                style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
              >
                {selectedCases.size === filteredAndSearched.length && filteredAndSearched.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>

              <div style={{ width: '1px', height: '16px', background: '#e2e8f0', margin: '0 4px' }} />

              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ترحيل إلى:</span>
              <button onClick={() => handleBulkRollover('pleading')} disabled={isBulkRolling || selectedCases.size === 0} style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: selectedCases.size === 0 ? 0.5 : 1 }}>تداول</button>
              <button onClick={() => handleBulkRollover('judgment')} disabled={isBulkRolling || selectedCases.size === 0} style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: selectedCases.size === 0 ? 0.5 : 1 }}>حجز للحكم</button>
              <button onClick={() => handleBulkRollover('chamber')} disabled={isBulkRolling || selectedCases.size === 0} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: selectedCases.size === 0 ? 0.5 : 1 }}>الشعبة</button>
              <button onClick={() => handleBulkRollover('referred')} disabled={isBulkRolling || selectedCases.size === 0} style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: selectedCases.size === 0 ? 0.5 : 1 }}>إحالة</button>
            </div>
          )}
        </div>

        <input
          className="form-input"
          placeholder="بحث سريع..."
          value={searchQuery}
          onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          style={{ width: 220, fontSize: 14 }}
        />
      </div>

      {/* ── Cases Grid ── */}
      {!filteredAndSearched.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-text">لا توجد قضايا مطابقة</div>
        </div>
      ) : (
        <>
          <div className="cases-grid">
            {paginatedCases.map((caseItem) => {
              const flags         = mergedFlags(caseItem.flags, optimisticByCaseId[caseItem.id]);
              const pillStyle     = getCaseNumberPillStyle(caseItem);
              const routeMeta     = getRouteDisplay(caseItem);
              const triple        = getSessionTriple(caseItem);
              const fileLocation  = getCaseFileLocation(caseItem);
              const roleCapacity  = getCaseRoleCapacity(caseItem);
              const isDormant     = isDormantRole(roleCapacity);
              const isMissingFile = String(fileLocation || '').includes('غير موجود') || String(fileLocation || '').includes('مفقود');
              const isVipPlaintiff = ['مدعين', 'طاعن', 'مستأنف', 'مستشكل'].some((x) => String(roleCapacity).includes(x));
              const isNoInterest  = String(roleCapacity).includes('لا شأن');
              const currentResult = triple.current
                ? (triple.current.result || triple.current.sessionResult || triple.current.courtDecision || '')
                : getCaseSessionResult(caseItem);
              const fileWarning   = /مفقود|غير موجود/i.test(fileLocation);
              const joinedCount   = Array.isArray(caseItem.joinedCases) ? caseItem.joinedCases.length : 0;
              const hasFlags      = flags.isImportant || flags.isUrgent || flags.needsReview;
              const statusLabel   = STATUS_LABELS[caseItem.status] || 'غير محدد';
              const isSelected    = selectedCases.has(caseItem.id);

              return (
                <div
                  key={caseItem.id}
                  className={`case-card-v2 ${hasFlags ? 'flagged' : ''} ${isDormant ? 'dormant' : ''}`}
                  style={{
                    position: 'relative', transition: 'all 0.2s ease', cursor: isSelectionMode ? 'pointer' : 'default',
                    ...(isSelected
                      ? { border: '2px solid #3b82f6', backgroundColor: '#eff6ff', transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(59,130,246,0.15)' }
                      : isMissingFile ? { border: '2px solid #fca5a5', backgroundColor: '#fef2f2' }
                      : isVipPlaintiff ? { borderRight: '4px solid #16a34a' }
                      : isNoInterest ? { opacity: 0.65, filter: 'grayscale(0.3)' } : {}),
                  }}
                  onClick={() => {
                    if (isSelectionMode) toggleCaseSelection(caseItem.id);
                    else handleCaseClick(caseItem.id);
                  }}
                >
                  {isSelectionMode && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12, zIndex: 10,
                      width: 22, height: 22, borderRadius: '4px',
                      background: isSelected ? '#3b82f6' : '#fff',
                      border: isSelected ? 'none' : '2px solid #cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 'bold'
                    }}>
                      {isSelected && '✓'}
                    </div>
                  )}
                  {/* ── Identity Row ── */}
                  <div className="case-card-row case-card-row--identity" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CaseNumberBadge
                      caseNumber={caseItem.caseNumber}
                      caseYear={caseItem.caseYear}
                      caseData={caseItem}
                      variant="pill"
                      displayOrder={displaySettings.caseNumberDisplayOrder}
                      className="case-number-pill"
                      style={pillStyle}
                    />
                    <button
                      className="badge-btn badge-inactive"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCase(e, caseItem); }}
                      style={{ color: '#dc2626', marginInlineStart: 8 }}
                    >
                      🗑
                    </button>
                    {caseItem.criticalHighlightUrl && (
                      <button
                        title="فتح الملف / الإجراء المهم"
                        onClick={e => {
                          e.stopPropagation();
                          const url = caseItem.criticalHighlightUrl;
                          if (!url) return;
                          if (url.startsWith('data:')) {
                            const mimeType = url.split(',')[0].split(':')[1].split(';')[0];
                            const byteString = atob(url.split(',')[1]);
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                            const blob = new Blob([ab], { type: mimeType });
                            window.open(URL.createObjectURL(blob), '_blank');
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 6,
                          background: '#1e293b', border: '1px solid #f59e0b',
                          color: '#fbbf24', fontSize: 14, flexShrink: 0,
                          cursor: 'pointer',
                          marginInlineStart: 'auto',
                        }}
                      >⚡</button>
                    )}
                  </div>

                  {/* ── Badge Bar ── */}
                  <div className="case-badge-bar" onClick={e => e.stopPropagation()} style={{ margin: '6px 0 0 0' }}>
                    {['isImportant', 'needsReview', 'isUrgent', 'isPlaintiff'].map(flag => {
                      const icons = { isImportant: '⭐', needsReview: '🔔', isUrgent: '🔴', isPlaintiff: '⚖️' };
                      return (
                        <button
                          key={flag}
                          className={`badge-btn ${flags[flag] ? 'badge-active' : 'badge-inactive'} ${flag === 'isUrgent' ? 'badge-readonly' : ''}`}
                          onClick={e => toggleFlag(e, caseItem, flag)}
                        >
                          {icons[flag]}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Plaintiff / Defendant ── */}
                  <div className="case-card-row case-card-row--plaintiff">
                    <div
                      className="case-plaintiff"
                      style={{ filter: sensitiveHidden ? 'blur(4px)' : 'none', userSelect: sensitiveHidden ? 'none' : 'text', fontWeight: 900, fontSize: '15px' }}
                    >
                      {caseItem.plaintiffName || caseItem.clientName}
                    </div>
                  </div>
                  {caseItem.defendantName && (
                    <div className="case-card-row case-card-row--defendant">
                      <span
                        className="case-defendant"
                        style={{ filter: sensitiveHidden ? 'blur(4px)' : 'none', userSelect: sensitiveHidden ? 'none' : 'text', fontWeight: 500, color: '#64748b' }}
                      >
                        ضد {caseItem.defendantName}
                      </span>
                    </div>
                  )}

                  {/* ── Sessions Grid ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px',
                    marginTop: '16px', padding: '10px 12px',
                    background: isSelected ? 'rgba(255,255,255,0.6)' : '#f8fafc',
                    borderRadius: '8px', border: '1px solid #e2e8f0',
                  }}>
                    {/* الجلسة القادمة */}
                    <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, marginBottom: '4px' }}>الجلسة القادمة</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: caseItem.nextSessionDate ? 'var(--text-primary)' : '#94a3b8' }}>
                        {caseItem.nextSessionDate ? formatDisplayDate(caseItem.nextSessionDate) : 'لم تُحدد'}
                      </div>
                      {caseItem.nextSessionType && (
                        <div style={{ display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginTop: '6px', fontWeight: 800, width: 'fit-content' }}>
                          {caseItem.nextSessionType}
                        </div>
                      )}
                    </div>

                    {/* آخر جلسة */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800, marginBottom: '4px' }}>آخر جلسة</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {triple.current
                            ? formatDisplayDate(triple.current.date)
                            : (caseItem.lastSessionDate ? formatDisplayDate(caseItem.lastSessionDate) : '—')}
                        </span>
                        {currentResult && (
                          <span style={{
                            fontSize: '11px', color: '#1e3a8a', background: '#eff6ff',
                            padding: '3px 8px', borderRadius: '4px', fontWeight: 700,
                            flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }} title={currentResult}>
                            {currentResult}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Footer ── */}
                  <div className="case-card-row case-card-row--footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', flexWrap: 'wrap', gap: 6 }}>
                    {fileLocation && (
                      <span className={`case-capsule ${fileWarning ? 'case-capsule--warn' : ''}`}>
                        <span style={{ marginInlineEnd: 4 }}>📁</span>
                        {fileLocation}
                      </span>
                    )}
                    {caseItem.fileStatus && <span className="case-capsule">{FILE_STATUS_LABELS[caseItem.fileStatus] || caseItem.fileStatus}</span>}
                    <span className="case-capsule">{routeMeta.label}</span>
                    {roleCapacity && (
                      <span className={`case-capsule ${isDormant ? 'case-capsule--dormant' : ''}`} style={getCapacityStyle(roleCapacity)}>
                        {roleCapacity}
                      </span>
                    )}
                    <span className="case-capsule case-workflow-chip">{statusLabel}</span>
                    {joinedCount > 0 && <span className="case-joined-chip">+{joinedCount} منضمة</span>}
                  </div>

                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '20px 0', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>السابق</button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'center' }}>
              صفحة {page} من {totalPages} ({filteredAndSearched.length} قضية)
            </span>
            <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>التالي</button>
            <select
              value={pageSize}
              onChange={(e) => { const val = Number(e.target.value); setPageSize(val); setPage(1); localStorage.setItem('lb_cases_pagesize', String(val)); }}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer' }}
            >
              <option value={10}>10 لكل صفحة</option>
              <option value={20}>20 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
            </select>
          </div>
        </>
      )}

      {/* ── Importer Modal ── */}
      {showImporter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '720px', marginTop: '20px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, direction: 'rtl' }}>
              <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>مستورد البيانات الذكي</h2></div>
              <button onClick={() => setShowImporter(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <SmartImporter workspaceId={workspaceId} onClose={() => { setShowImporter(false); loadCases(workspaceId, 200); }} />
          </div>
        </div>
      )}

      {/* ── Add Form Modal ── */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px', marginTop: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>إضافة قضية جديدة</h2>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ padding: '4px 12px' }}>✕</button>
            </div>
            <CaseForm
              caseData={null}
              workspaceId={workspaceId}
              onSave={async () => { setShowAddForm(false); await loadCases(workspaceId); }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl' }}>
          <div className="confirm-dialog">
            <h3 className="confirm-dialog__title">{confirmDialog.title}</h3>
            <p className="confirm-dialog__message">{confirmDialog.message}</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirmDialog(null)}>إلغاء</button>
              <button type="button" className="btn-primary" onClick={confirmFlagToggle}>تأكيد</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
