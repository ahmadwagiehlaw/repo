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
    searchQuery,
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
    setSearchQuery,
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                setPage(1);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 220, fontSize: 13 }}
          />
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={() => setShowTypesManager(true)}
            title="إدارة تصنيفات الأحكام"
          >
            التصنيفات
          </button>
          <button
            type="button"
            className={viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={() => setViewMode('cards')}
          >
            كرود
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={() => setViewMode('table')}
          >
            جدول
          </button>
        </div>
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
        onStartAddJudgment={setAddingJudgment}
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
