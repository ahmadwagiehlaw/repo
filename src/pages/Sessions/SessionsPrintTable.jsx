import { SESSION_TYPE_LABELS } from '@/core/Constants.js';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import { formatCaseNumber } from '@/utils/caseUtils.js';

function getCellValue(session, colKey, { displayOrder, dateDisplayOptions }) {
  if (colKey === 'caseNumber') {
    return formatCaseNumber(session.caseNumber, session.caseYear, { displayOrder });
  }

  if (colKey === 'date' || colKey === 'nextDate' || colKey === 'previousSession') {
    return <DateDisplay value={session[colKey]} options={dateDisplayOptions} />;
  }

  if (colKey === 'sessionType') {
    return SESSION_TYPE_LABELS[session.sessionType] || session.sessionType || '—';
  }

  return session[colKey] || '—';
}

export default function SessionsPrintTable({
  allColumns,
  selectedColumns,
  data,
  allDataCount,
  settings,
  displayOrder,
  dateDisplayOptions,
}) {
  const printedAt = new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const columns = allColumns.filter((col) => selectedColumns.includes(col.key));

  return (
    <div
      className={`sessions-print-only print-color-${settings.colorMode || 'brand'} print-density-${settings.density || 'comfortable'}`}
      aria-hidden="true"
    >
      <div className="sessions-print-header">
        <h1>{settings.title || 'رول الجلسات'}</h1>
        {settings.includeMeta && (
          <div className="sessions-print-meta">
            <span>الجلسات المطبوعة: {data.length}</span>
            <span>إجمالي الجلسات بالنظام: {allDataCount}</span>
            <span>تاريخ الطباعة: {printedAt}</span>
          </div>
        )}
      </div>

      <table className="data-table sessions-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((session) => (
            <tr key={`print-${session.id}`}>
              {columns.map((col) => (
                <td key={`${session.id}-${col.key}`}>
                  {getCellValue(session, col.key, { displayOrder, dateDisplayOptions })}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} style={{ textAlign: 'center' }}>
                لا توجد بيانات مطابقة للطباعة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
