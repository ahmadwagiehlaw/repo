import { useMemo } from 'react';
import AppealTracker from '@/pages/Judgments/AppealTracker.jsx';
import JudgmentsList from '@/pages/Judgments/JudgmentsList.jsx';
import { useJudgmentsData } from '@/pages/Judgments/useJudgmentsData.js';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { formatDisplayDate, getDateDisplayOptions } from '@/utils/caseUtils.js';
import { openCasePanel } from '@/utils/openCasePanel.js';

export default function Judgments() {
  const displaySettings = useDisplaySettings();
  const dateDisplayOptions = useMemo(() => getDateDisplayOptions(displaySettings), [displaySettings]);
  const formatUiDate = (value) => formatDisplayDate(value, dateDisplayOptions);

  const {
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
    page,
    pageSize,
    tableEdits,
    savingEdits,
    editingCell,
    workspaceId,
    casesContextLoading,
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
    executionStatusLabels,
    defaultJudgmentType,
    nextActionOptions,
  } = useJudgmentsData({ formatUiDate });

  void tableRows;
  void pagedTableRows;

  if (!workspaceId) {
    return <div className="empty-state">لا توجد مساحة عمل محددة</div>;
  }

  if (loading || casesContextLoading) {
    return <div className="loading-text">جاري تحميل سجل الأحكام...</div>;
  }

  if (error) {
    return <div className="empty-state" style={{ color: '#b91c1c' }}>تعذر تحميل بيانات الأحكام</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">سجل الأحكام</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {filteredCases.length} قضية
        </div>
      </div>

      <AppealTracker
        urgentJudgments={urgentJudgments}
        onOpenCase={openCasePanel}
        caseNumberDisplayOrder={displaySettings.caseNumberDisplayOrder}
        getDaysLabel={getUrgentJudgmentDaysLabel}
      />

      {/* Unified Control Dashboard */}
      <div
        style={{
          background: 'var(--bg-page)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        {/* Top Row: Main Filters & Search/Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: activeFilter !== 'reserved' ? '1px solid var(--border-light)' : 'none',
          }}
        >
          {/* Date Range Filter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              📅 من:
            </span>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              style={{ width: 155, fontSize: 12 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              إلى:
            </span>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              style={{ width: 155, fontSize: 12 }}
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                style={{
                  background: '#fee2e2', border: 'none', borderRadius: 6,
                  color: '#dc2626', cursor: 'pointer', fontSize: 11,
                  padding: '4px 10px', fontFamily: 'Cairo', fontWeight: 700,
                }}
              >
                ✕ مسح التاريخ
              </button>
            )}
          </div>

          {/* Main Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'reserved', label: 'محجوزة للحكم' },
              { id: 'judged', label: 'محكوم فيها' },
              { id: 'plaintiff_urgent', label: '⚠️ مواعيد عاجلة' },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveFilter(filter.id);
                  if (filter.id === 'reserved') {
                    setTypeFilter('all');
                  }
                  setPage(1);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Search & Action Toggles */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="month"
                className="form-input"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                style={{ width: 140, fontSize: 13 }}
                title="تصفية بشهر وسنة الحكم"
              />
              {filterMonth && (
                <button 
                  onClick={() => setFilterMonth('')} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
                  title="إلغاء الفلتر"
                >✕</button>
              )}
            </div>
            <input
              className="form-input"
              placeholder="بحث برقم الدعوى أو الخصوم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '260px', fontSize: '13px' }}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '8px 12px' }}
              onClick={() => setShowTypesManager(true)}
              title="إدارة تصنيفات الأحكام"
            >
              ⚙️ التصنيفات
            </button>
            <div style={{ display: 'flex', background: 'var(--bg-body)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button
                type="button"
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: viewMode === 'cards' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'cards' ? 'white' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'cards' ? 700 : 500,
                  fontFamily: 'Cairo',
                }}
                onClick={() => setViewMode('cards')}
              >
                كروت
              </button>
              <button
                type="button"
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'table' ? 700 : 500,
                  fontFamily: 'Cairo',
                }}
                onClick={() => setViewMode('table')}
              >
                جدول
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Secondary Type Filters */}
        {activeFilter !== 'reserved' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--bg-body)' }}>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                border: typeFilter === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: typeFilter === 'all' ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'white',
                color: typeFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: typeFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Cairo',
              }}
            >
              جميع التصنيفات
            </button>
            {judgmentTypes.map((type) => {
              const isActive = typeFilter === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter(type.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? `${type.color}15` : 'white',
                    border: `1px solid ${isActive ? type.color : 'var(--border)'}`,
                    color: isActive ? type.color : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'Cairo',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: type.color }} />
                  {type.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showTypesManager && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              width: 520,
              maxHeight: '85vh',
              overflowY: 'auto',
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>إدارة تصنيفات الأحكام</h3>
              <button
                type="button"
                onClick={() => setShowTypesManager(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {judgmentTypes.map((type, index) => (
              <div
                key={type.value || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 60px 60px auto',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                  padding: '8px 10px',
                  background: 'var(--bg-page)',
                  borderRadius: 'var(--radius-sm)',
                  borderRight: `3px solid ${type.color}`,
                }}
              >
                <input
                  className="form-input"
                  value={type.label}
                  onChange={(e) => {
                    const next = [...judgmentTypes];
                    next[index] = { ...next[index], label: e.target.value };
                    persistTypes(next);
                  }}
                  style={{ fontSize: 13 }}
                />

                <input
                  type="number"
                  className="form-input"
                  value={type.appealDays || 0}
                  title="أيام الطعن"
                  placeholder="أيام الطعن"
                  onChange={(e) => {
                    const next = [...judgmentTypes];
                    next[index] = { ...next[index], appealDays: Number(e.target.value) };
                    persistTypes(next);
                  }}
                  style={{ fontSize: 13 }}
                />

                <input
                  type="color"
                  value={type.color || '#6b7280'}
                  onChange={(e) => {
                    const next = [...judgmentTypes];
                    const color = e.target.value;
                    next[index] = { ...next[index], color, bg: `${color}20` };
                    persistTypes(next);
                  }}
                  style={{ width: '100%', height: 36, cursor: 'pointer', border: 'none', borderRadius: 6, padding: 2 }}
                />

                <button
                  type="button"
                  title="تعيين كافتراضي"
                  onClick={() => {
                    const next = judgmentTypes.map((currentType, currentIndex) => ({ ...currentType, isDefault: currentIndex === index }));
                    persistTypes(next);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: type.isDefault ? '#d97706' : '#cbd5e1' }}
                >
                  ⭑
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = judgmentTypes.filter((_, currentIndex) => currentIndex !== index);
                    persistTypes(next);
                  }}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                >
                  حذف
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => {
                const next = [...judgmentTypes, {
                  value: `custom_${Date.now()}`,
                  label: 'تصنيف جديد',
                  color: '#6b7280',
                  bg: '#f3f4f6',
                  appealDays: 40,
                }];
                persistTypes(next);
              }}
            >
              + إضافة تصنيف
            </button>

            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              * أيام الطعن = 0 يعني لا يُحسب ميعاد طعن لهذا التصنيف
            </div>
          </div>
        </div>
      )}

      <JudgmentsList
        viewMode={viewMode}
        pagedCases={pagedCases}
        filteredTableJudgments={filteredTableJudgments}
        judgmentsByCaseId={judgmentsByCaseId}
        judgmentTypes={judgmentTypes}
        workspaceSettings={workspaceSettings}
        tableEdits={tableEdits}
        editingCell={editingCell}
        addingJudgment={addingJudgment}
        getFormState={getFormState}
        getTypeConfig={getTypeConfig}
        getDeadlineUrgency={getDeadlineUrgency}
        isPlaintiffForCase={isPlaintiffForCase}
        caseNumberDisplayOrder={displaySettings.caseNumberDisplayOrder}
        dateDisplayOptions={dateDisplayOptions}
        defaultJudgmentType={defaultJudgmentType}
        nextActionOptions={nextActionOptions}
        executionStatusLabels={executionStatusLabels}
        onOpenCase={openCasePanel}
        onStartAddJudgment={startAddJudgment}
        onEditJudgment={startEditJudgment}
        onCancelAddJudgment={() => setAddingJudgment(null)}
        onDateClick={handleDateClick}
        onOpenAttachment={(url) => window.open(url, '_blank')}
        onReturnToSessions={handleReturnToSessions}
        onSendToChamber={handleSendToChamber}
        onJudgmentDateChange={(caseItem, form, judgmentDate) => {
          const appealDeadlineDate = calcAppealDeadline(
            judgmentDate,
            form.judgmentType,
            caseItem.court,
            workspaceSettings,
            judgmentTypes,
          ) || '';
          updateForm(caseItem.id, { judgmentDate, appealDeadlineDate });
        }}
        onJudgmentTypeChange={(caseItem, form, judgmentType) => {
          const typeConfig = getTypeConfig(judgmentType);
          const appealDeadlineDate = calcAppealDeadline(
            form.judgmentDate,
            judgmentType,
            caseItem.court,
            workspaceSettings,
            judgmentTypes,
          ) || '';
          updateForm(caseItem.id, {
            judgmentType,
            judgmentCategory: judgmentType,
            appealDeadlineDays: Number(typeConfig.appealDays || 0),
            appealDeadlineDate,
          });
        }}
        onJudgmentFormFieldChange={(caseId, field, value) => updateForm(caseId, { [field]: value })}
        onSaveJudgment={handleCreateJudgment}
        onSetEditingCell={setEditingCell}
        onSetRowEdit={setRowEdit}
        onSaveTableEdits={saveTableEdits}
        savingEdits={savingEdits}
        hasPendingTableEdits={Object.keys(tableEdits).length > 0}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>لكل صفحة</span>
          <select
            className="form-input"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) || 8);
              setPage(1);
            }}
            style={{ width: 80 }}
          >
            {[6, 8, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1}
          >
            السابق
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>صفحة {page} / {totalPages}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            disabled={page >= totalPages}
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}
