const BULK_FIELDS = [
  { field: 'decision', label: 'القرار', optionsKey: 'decision' },
  { field: 'sessionType', label: 'نوع الجلسة', optionsKey: 'sessionType' },
  { field: 'nextDate', label: 'الجلسة القادمة', type: 'date' },
  { field: 'fileLocation', label: 'مكان الملف' },
  { field: 'notes', label: 'ملاحظات' },
];

export default function SessionsBulkActionsBar({
  selectedRows,
  loading = false,
  fieldOptions,
  onClearSelection,
  onBulkRollover,
  onApplyBulkFieldUpdate,
}) {
  if (selectedRows.size === 0) return null;

  return (
    <div
      className="sessions-bulk-actions print-hide"
      style={{
        background: 'var(--primary)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>{selectedRows.size} جلسة محددة</span>
        <button
          onClick={onClearSelection}
          style={{
            background: 'none',
            border: '1px solid white',
            color: 'white',
            borderRadius: 6,
            padding: '3px 10px',
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'Cairo',
            fontSize: 12,
            opacity: loading ? 0.7 : 1,
          }}
        >
          إلغاء التحديد
        </button>
        <button
          onClick={onBulkRollover}
          disabled={loading}
          style={{
            background: 'white',
            color: 'var(--primary)',
            border: 'none',
            borderRadius: 6,
            padding: '3px 12px',
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'Cairo',
            fontWeight: 700,
            fontSize: 12,
            opacity: loading ? 0.7 : 1,
          }}
        >
          ترحيل جماعي
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {BULK_FIELDS.map(({ field, label, type, optionsKey }) => {
          const options = fieldOptions[optionsKey] || [];
          const inputId = `bulk-${field}`;
          return (
            <div key={field} style={{ display: 'flex', gap: 6 }}>
              <input
                id={inputId}
                type={type || 'text'}
                list={options.length ? `bulk-opts-${field}` : undefined}
                placeholder={`${label}...`}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              />
              {options.length > 0 && (
                <datalist id={`bulk-opts-${field}`}>
                  {options.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              )}
              <button
                onClick={async () => {
                  const input = document.getElementById(inputId);
                  const value = input?.value?.trim();
                  if (!value) return;
                  await onApplyBulkFieldUpdate(field, value);
                  if (input) input.value = '';
                }}
                style={{
                  background: 'white',
                  color: 'var(--primary)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontFamily: 'Cairo',
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                تطبيق
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
