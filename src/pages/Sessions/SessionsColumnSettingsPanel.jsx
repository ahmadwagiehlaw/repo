export default function SessionsColumnSettingsPanel({
  show,
  allColumns,
  visibleCols,
  onToggleColumn,
  viewNameInput,
  onViewNameChange,
  onSaveView,
  savedViews,
  onApplySavedView,
}) {
  if (!show) return null;

  return (
    <div
      className="sessions-column-settings print-hide"
      style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        marginBottom: 12,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <div style={{ width: '100%', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
        اختر الأعمدة المرئية:
      </div>

      {allColumns.map((col) => (
        <label
          key={col.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={visibleCols.includes(col.key)}
            onChange={() => onToggleColumn(col.key)}
          />
          {col.label}
        </label>
      ))}

      <div style={{ width: '100%', marginTop: 8, display: 'flex', gap: 8 }}>
        <input
          id="viewNameInput"
          placeholder="اسم العرض المحفوظ..."
          className="form-input"
          style={{ flex: 1 }}
          value={viewNameInput}
          onChange={(e) => onViewNameChange(e.target.value)}
        />
        <button className="btn-primary" onClick={onSaveView}>
          حفظ العرض
        </button>
      </div>

      {savedViews.length > 0 && (
        <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            عروض محفوظة:
          </span>
          {savedViews.map((view, i) => (
            <button
              key={`${view.name}-${i}`}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={() => onApplySavedView(view)}
            >
              {view.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
