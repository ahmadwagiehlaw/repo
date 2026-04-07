export default function SessionsFiltersPanel({
  filterTabs,
  activeFilter,
  onSelectFilter,
  showDateFilter,
  onToggleDateFilter,
  showTypeFilters,
  onToggleTypeFilters,
  showInspectionFilter,
  onToggleInspectionFilter,
  activeSessionTypes,
  searchQuery,
  onSearchChange,
  dateMode,
  onSelectSingleDateMode,
  onSelectRangeDateMode,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearDateFilter,
  sessionTypeFilters,
  onToggleSessionType,
  onClearSessionTypes,
}) {
  return (
    <div className="sessions-filters-panel print-hide">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div className="filter-chips" style={{ marginBottom: 0 }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => onSelectFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}

          <button
            className={showDateFilter ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={onToggleDateFilter}
            title="فلتر بالتاريخ"
          >
            📅
          </button>

          <button
            className={showTypeFilters || activeSessionTypes.size > 0 ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={onToggleTypeFilters}
            title="فلتر بنوع الجلسة"
          >
            🗂️
            {activeSessionTypes.size > 0 && (
              <span
                style={{
                  background: 'white',
                  color: 'var(--primary)',
                  borderRadius: 20,
                  padding: '1px 6px',
                  fontSize: 11,
                  marginRight: 4,
                  fontWeight: 700,
                }}
              >
                {activeSessionTypes.size}
              </span>
            )}
          </button>

          <button
            className={showInspectionFilter ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={onToggleInspectionFilter}
            title="فلتر طلبات الاطلاع"
          >
            🗒️
          </button>
        </div>

        <input
          className="form-input"
          placeholder="بحث سريع..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 220, fontSize: 14 }}
        />
      </div>

      {showDateFilter && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '8px 12px',
            background: 'var(--bg-page)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 8,
            flexWrap: 'wrap',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            📅 فلتر بالتاريخ:
          </span>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={dateMode === 'single' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={onSelectSingleDateMode}
            >
              يوم واحد
            </button>
            <button
              className={dateMode === 'range' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={onSelectRangeDateMode}
            >
              نطاق
            </button>
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="form-input"
            style={{ width: 160, fontSize: 13 }}
          />

          {dateMode === 'range' && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>←</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="form-input"
                style={{ width: 160, fontSize: 13 }}
              />
            </>
          )}

          {(dateFrom || dateTo) && (
            <button
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={onClearDateFilter}
            >
              مسح ✕
            </button>
          )}
        </div>
      )}

      {showTypeFilters && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            padding: '8px 12px',
            background: 'var(--bg-page)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 8,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
            نوع الجلسة:
          </span>
          {sessionTypeFilters.map((type) => {
            const isActive = activeSessionTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => onToggleSessionType(type)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: '1px solid',
                  background: isActive ? 'var(--primary)' : 'white',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                  fontFamily: 'Cairo',
                }}
              >
                {type}
              </button>
            );
          })}
          {activeSessionTypes.size > 0 && (
            <button
              onClick={onClearSessionTypes}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              ✕ مسح الكل
            </button>
          )}
        </div>
      )}

      {showInspectionFilter && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--bg-page)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 8,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            🗒️ يظهر فقط الجلسات التي بها طلبات اطلاع
          </span>
          <button
            className={showInspectionFilter ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={onToggleInspectionFilter}
          >
            {showInspectionFilter ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
      )}
    </div>
  );
}
