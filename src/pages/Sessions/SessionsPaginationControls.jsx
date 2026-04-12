export default function SessionsPaginationControls({
  filteredSessionsCount,
  page,
  totalPagesForUi,
  onPrevPage,
  onNextPage,
  pageSize,
  onPageSizeChange,
}) {
  if (filteredSessionsCount <= 0) return null;

  return (
    <div
      className="sessions-pagination print-hide"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        padding: '16px 0',
        flexWrap: 'wrap',
      }}
    >
      <button className="btn-secondary" disabled={page === 1} onClick={onPrevPage}>
        السابق
      </button>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'center' }}>
        صفحة {page} من {totalPagesForUi} ({filteredSessionsCount} جلسة)
      </span>
      <button className="btn-secondary" disabled={page === totalPagesForUi} onClick={onNextPage}>
        التالي
      </button>

      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        style={{
          padding: '6px 10px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'Cairo',
          fontSize: 13,
        }}
      >
        {[10, 15, 20, 30, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n} لكل صفحة
          </option>
        ))}
      </select>
    </div>
  );
}
