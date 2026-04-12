export default function SessionPrint({ filteredCount = 0, totalCount = 0 }) {
  const now = new Date();
  const printedAt = now.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="sessions-print-header" aria-hidden="true">
      <h1>رول الجلسات</h1>
      <div className="sessions-print-meta">
        <span>إجمالي الجلسات المعروضة: {filteredCount}</span>
        <span>إجمالي كل الجلسات: {totalCount}</span>
        <span>تاريخ الطباعة: {printedAt}</span>
      </div>
    </div>
  );
}
