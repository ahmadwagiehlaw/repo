import { useEffect, useMemo, useState } from 'react';
import SessionDetails from './SessionDetails.jsx';
import SessionForm from './SessionForm.jsx';
import SessionsPrintSettingsModal from './SessionsPrintSettingsModal.jsx';
import SessionsPrintTable from './SessionsPrintTable.jsx';
import SessionsBulkActionsBar from './SessionsBulkActionsBar.jsx';
import SessionsColumnSettingsPanel from './SessionsColumnSettingsPanel.jsx';
import SessionsFiltersPanel from './SessionsFiltersPanel.jsx';
import SessionsList, { ALL_COLUMNS, DEFAULT_VISIBLE } from './SessionsList.jsx';
import SessionsOptionsManagerModal from './SessionsOptionsManagerModal.jsx';
import SessionsPaginationControls from './SessionsPaginationControls.jsx';
import SessionsRolloverModal from './SessionsRolloverModal.jsx';
import { useSessionsData } from './useSessionsData.js';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { getDateDisplayOptions } from '@/utils/caseUtils.js';

const FILTER_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'week', label: '📅 جلسات الأسبوع' },
  { id: 'upcoming', label: 'القادمة' },
  { id: 'lastWeek', label: '⏪ الأسبوع الماضي' },
  { id: 'unrouted', label: '⚠️ غير المرحلة' },
  { id: 'inquiry', label: '🔍 استعلام' },
];

const SESSION_TYPE_FILTERS = ['موضوع', 'فحص', 'مفوضين', 'تقرير', 'حكم', 'جديد', 'متداول'];

const DECISION_OPTIONS = [
  'للإعلان',
  'للاطلاع',
  'للحكم',
  'حجز للحكم',
  'تأجيل للمرافعة',
  'شطب',
  'إحالة للتحقيق',
  'تقرير مفوضين',
  'إعادة إعلان',
  'وقف جزائي',
];

const SESSION_TYPE_OPTIONS = ['موضوع', 'فحص', 'مفوضين', 'تقرير', 'حكم', 'جديد', 'متداول'];

const DEFAULT_PRINT_SETTINGS = {
  title: 'رول الجلسات',
  columns: [],
  orientation: 'landscape',
  colorMode: 'brand',
  density: 'comfortable',
  includeMeta: true,
  showOnlyFiltered: true,
};

function sanitizePrintSettings(raw, fallbackColumns) {
  const base = { ...DEFAULT_PRINT_SETTINGS };
  if (!raw || typeof raw !== 'object') {
    return { ...base, columns: fallbackColumns };
  }

  const orientation = raw.orientation === 'portrait' ? 'portrait' : 'landscape';
  const colorMode = ['brand', 'mono', 'soft'].includes(raw.colorMode) ? raw.colorMode : 'brand';
  const density = ['comfortable', 'compact'].includes(raw.density) ? raw.density : 'comfortable';
  const columns = Array.isArray(raw.columns) && raw.columns.length > 0 ? raw.columns : fallbackColumns;

  return {
    ...base,
    ...raw,
    orientation,
    colorMode,
    density,
    columns,
    includeMeta: raw.includeMeta !== false,
    showOnlyFiltered: raw.showOnlyFiltered !== false,
    title: String(raw.title || base.title),
  };
}

export default function Sessions() {
  const displaySettings = useDisplaySettings();
  const dateDisplayOptions = getDateDisplayOptions(displaySettings);
  const {
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
    visibleCols,
    setVisibleCols,
    colWidths,
    colOrder,
    draggedCol,
    setDraggedCol,
    selectedRows,
    setSelectedRows,
    savedViews,
    showColSettings,
    setShowColSettings,
    useArabicNumerals,
    toggleArabicNumerals,
    editMode,
    setEditMode,
    localEdits,
    setLocalEdits,
    pageSize,
    setPageSize,
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
    rollingOver,
    setRollingOver,
    rolloverRoute,
    setRolloverRoute,
    bulkRolloverLoading,
    viewNameInput,
    setViewNameInput,
    archiveIndex,
    dateTooltip,
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
    openSessionDate,
    applyBulkFieldUpdate,
    applySavedView,
    orderedVisibleColumns,
    currentWorkspace,
  } = useSessionsData({
    allColumns: ALL_COLUMNS,
    defaultVisible: DEFAULT_VISIBLE,
    decisionOptions: DECISION_OPTIONS,
    sessionTypeOptions: SESSION_TYPE_OPTIONS,
  });

  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const fallbackPrintColumns = useMemo(
    () => orderedVisibleColumns.map((col) => col.key),
    [orderedVisibleColumns]
  );
  const [printSettings, setPrintSettings] = useState(() => ({
    ...DEFAULT_PRINT_SETTINGS,
    columns: fallbackPrintColumns,
  }));

  const printSettingsStorageKey = useMemo(
    () => (workspaceId ? `lb_sessions_print_settings_${workspaceId}` : null),
    [workspaceId]
  );

  useEffect(() => {
    if (!printSettingsStorageKey) return;
    try {
      const raw = localStorage.getItem(printSettingsStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setPrintSettings(sanitizePrintSettings(parsed, fallbackPrintColumns));
    } catch {
      setPrintSettings(sanitizePrintSettings(null, fallbackPrintColumns));
    }
  }, [printSettingsStorageKey, fallbackPrintColumns]);

  const printColumns = useMemo(() => {
    const allKeys = new Set(ALL_COLUMNS.map((col) => col.key));
    const selected = (printSettings.columns || []).filter((key) => allKeys.has(key));
    return selected.length > 0 ? selected : fallbackPrintColumns;
  }, [printSettings.columns, fallbackPrintColumns]);

  const printData = useMemo(
    () => (printSettings.showOnlyFiltered ? filteredSessions : sessions),
    [printSettings.showOnlyFiltered, filteredSessions, sessions]
  );

  useEffect(() => {
    const cleanup = () => document.body.classList.remove('lb-printing');
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  const handleSavePrintSettings = (next) => {
    const sanitized = sanitizePrintSettings(next, fallbackPrintColumns);
    setPrintSettings(sanitized);
    if (printSettingsStorageKey) {
      localStorage.setItem(printSettingsStorageKey, JSON.stringify(sanitized));
    }
    setShowPrintSettings(false);
  };

  const handlePrint = () => {
    const styleId = 'lb-print-page-style';
    let styleNode = document.getElementById(styleId);
    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.id = styleId;
      document.head.appendChild(styleNode);
    }
    const orientation = printSettings.orientation === 'portrait' ? 'portrait' : 'landscape';
    styleNode.textContent = `@media print { @page { size: A4 ${orientation}; margin: 10mm; } }`;
    document.body.classList.add('lb-printing');
    window.print();
  };

  if (!workspaceId) {
    return <div className="empty-state">لا توجد مساحة عمل محددة</div>;
  }

  return (
    <div dir="rtl">
      <SessionsPrintTable
        allColumns={ALL_COLUMNS}
        selectedColumns={printColumns}
        data={printData}
        allDataCount={sessions.length}
        settings={printSettings}
        displayOrder={displaySettings.caseNumberDisplayOrder}
        dateDisplayOptions={dateDisplayOptions}
        workspaceName={currentWorkspace?.name || ''}
      />

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 className="page-title">الجلسات</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            إجمالي: {formatNum(filteredSessions.length)} جلسة من {formatNum(sessions.length)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowColSettings((s) => !s)}>
            الأعمدة
          </button>
          <button
            className={useArabicNumerals ? 'btn-primary' : 'btn-secondary'}
            onClick={toggleArabicNumerals}
            style={{ fontSize: 13 }}
          >
            {useArabicNumerals ? '١٢٣' : '123'}
          </button>

          <button className="btn-secondary" onClick={handlePrint}>
            طباعة الرول
          </button>
          <button className="btn-secondary" onClick={() => setShowPrintSettings(true)}>
            ⚙ إعدادات الطباعة
          </button>

          <button
            className={editMode ? 'btn-primary' : 'btn-secondary'}
            onClick={() => (editMode ? saveAllEdits() : setEditMode(true))}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {editMode ? '✅ حفظ التعديلات' : '✏️ تعديل'}
          </button>

          <span style={{ color: 'var(--text-muted)', fontSize: 12, alignSelf: 'center' }}>
            إضافة الجلسات تتم من تحديث بيانات القضية
          </span>
        </div>
      </div>

      <SessionsColumnSettingsPanel
        show={showColSettings}
        allColumns={ALL_COLUMNS}
        visibleCols={visibleCols}
        onToggleColumn={(columnKey) => {
          const next = visibleCols.includes(columnKey)
            ? visibleCols.filter((key) => key !== columnKey)
            : [...visibleCols, columnKey];
          setVisibleCols(next);
        }}
        viewNameInput={viewNameInput}
        onViewNameChange={setViewNameInput}
        onSaveView={saveView}
        savedViews={savedViews}
        onApplySavedView={applySavedView}
      />

      <SessionsFiltersPanel
        filterTabs={FILTER_TABS}
        activeFilter={activeFilter}
        onSelectFilter={(filterId) => {
          setActiveFilter(filterId);
          setPage(1);
        }}
        showDateFilter={showDateFilter}
        onToggleDateFilter={() => setShowDateFilter((s) => !s)}
        showTypeFilters={showTypeFilters}
        onToggleTypeFilters={() => setShowTypeFilters((s) => !s)}
        showInspectionFilter={showInspectionFilter}
        onToggleInspectionFilter={() => setShowInspectionFilter((s) => !s)}
        activeSessionTypes={activeSessionTypes}
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        dateMode={dateMode}
        onSelectSingleDateMode={() => {
          setDateMode('single');
          setDateTo('');
        }}
        onSelectRangeDateMode={() => setDateMode('range')}
        dateFrom={dateFrom}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setPage(1);
          if (dateMode === 'single') setTimeout(() => setShowDateFilter(false), 300);
        }}
        dateTo={dateTo}
        onDateToChange={(value) => {
          setDateTo(value);
          setPage(1);
        }}
        onClearDateFilter={() => {
          setDateFrom('');
          setDateTo('');
          setPage(1);
        }}
        sessionTypeFilters={SESSION_TYPE_FILTERS}
        onToggleSessionType={(type) => {
          setActiveSessionTypes((prev) => {
            const next = new Set(prev);
            next.has(type) ? next.delete(type) : next.add(type);
            return next;
          });
          setPage(1);
        }}
        onClearSessionTypes={() => setActiveSessionTypes(new Set())}
      />

      <SessionsBulkActionsBar
        selectedRows={selectedRows}
        loading={bulkRolloverLoading}
        fieldOptions={fieldOptions}
        onClearSelection={() => setSelectedRows(new Set())}
        onBulkRollover={handleBulkRollover}
        onApplyBulkFieldUpdate={applyBulkFieldUpdate}
      />

      <SessionsList
        displayOrder={displaySettings.caseNumberDisplayOrder}
        dateDisplayOptions={dateDisplayOptions}
        loading={loading}
        error={error}
        filteredSessions={filteredSessions}
        paginatedSessions={paginatedSessions}
        orderedVisibleColumns={orderedVisibleColumns}
        colWidths={colWidths}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        draggedCol={draggedCol}
        setDraggedCol={setDraggedCol}
        colOrder={colOrder}
        sortConfig={sortConfig}
        handleColumnDrop={handleColumnDrop}
        handleSortColumn={handleSortColumn}
        handleColResize={handleColResize}
        editMode={editMode}
        setOptionsManager={setOptionsManager}
        archiveIndex={archiveIndex}
        getCurrentWeekRange={getCurrentWeekRange}
        isEditableColumn={isEditableColumn}
        localEdits={localEdits}
        setLocalEdits={setLocalEdits}
        copyRowFromPrevious={copyRowFromPrevious}
        formatDateInput={formatDateInput}
        fieldOptions={fieldOptions}
        openSessionDate={openSessionDate}
        dateTooltip={dateTooltip}
        onStartRollover={(session) => {
          setRollingOver(session);
          setRolloverRoute(suggestRoute(session.decision));
        }}
        emptyStateTitle={activeFilter === 'unrouted' ? 'لا توجد جلسات غير مرحلة' : 'لا توجد جلسات'}
        emptyStateIcon={activeFilter === 'unrouted' ? '⚠️' : '📅'}
      />

      <SessionsOptionsManagerModal
        optionsManager={optionsManager}
        fieldOptions={fieldOptions}
        fieldDefaults={fieldDefaults}
        onClose={() => setOptionsManager(null)}
        onSaveFieldOptions={saveFieldOptions}
        onSaveFieldDefault={saveFieldDefault}
      />

      <SessionsPaginationControls
        filteredSessionsCount={filteredSessions.length}
        page={page}
        totalPagesForUi={totalPagesForUi}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPagesForUi, p + 1))}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      <SessionsRolloverModal
        rollingOver={rollingOver}
        rolloverRoute={rolloverRoute}
        onRouteChange={setRolloverRoute}
        onClose={() => setRollingOver(null)}
        onConfirm={() => handleRollover(rollingOver, rolloverRoute)}
      />

      <SessionForm />
      <SessionDetails />

      <SessionsPrintSettingsModal
        open={showPrintSettings}
        allColumns={ALL_COLUMNS}
        settings={printSettings}
        onClose={() => setShowPrintSettings(false)}
        onSave={handleSavePrintSettings}
      />
    </div>
  );
}
