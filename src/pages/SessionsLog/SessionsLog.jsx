import { useRef } from 'react';
import { useSessionsLogData } from './useSessionsLogData.js';
import SessionsLogTable from './SessionsLogTable.jsx';

function formatDisplayDate(isoDate) {
  if (!isoDate || isoDate === 'undated') return 'بدون تاريخ';
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  return `\u200E${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function SessionsLog() {
  const {
    workspaceId,
    filteredRolls,
    loading,
    error,
    searchDate,
    setSearchDate,
    openRolls,
    toggleRoll,
    activeLogFilter,
    setActiveLogFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useSessionsLogData();

  const printRef = useRef(null);

  const handlePrintRoll = (roll) => {
    const printWindow = window.open('', '_blank');
    const entries = Array.isArray(roll.entries) ? roll.entries : [];
    const rows = entries.map((e) => `
      <tr>
        <td>${e.caseNumber && e.caseYear
          ? (String(e.caseNumber).includes('/')
              ? e.caseNumber
              : e.caseNumber + '/' + e.caseYear)
          : (e.caseNumber || e.caseYear || '—')
        }</td>
        <td>${e.clientName || '—'}</td>
        <td>${e.defendantName || '—'}</td>
        <td>${e.sessionDate || '—'}</td>
        <td>${e.nextDate || '—'}</td>
        <td>${e.decision || '—'}</td>
        <td>${e.sessionType || '—'}</td>
        <td>${e.sessionMinute || '—'}</td>
        <td>${e.notes || '—'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8"/>
        <title>سجل جلسة ${formatDisplayDate(roll.sessionDate)}</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px; font-size: 13px; }
          h2 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: right; }
          th { background: #f5f5f5; font-weight: 700; }
          @media print { @page { size: A4 landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <h2>سجل جلسة ${formatDisplayDate(roll.sessionDate)}</h2>
        <p>عدد القضايا: ${entries.length}</p>
        <table>
          <thead>
            <tr>
              <th>رقم الدعوى</th>
              <th>المدعي</th>
              <th>المدعى عليه</th>
              <th>الجلسة السابقة</th>
              <th>الجلسة القادمة</th>
              <th>القرار</th>
              <th>نوع الجلسة</th>
              <th>محضر الجلسة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  if (!workspaceId) {
    return <div className="empty-state">لا توجد مساحة عمل محددة</div>;
  }

  return (
    <div dir="rtl" ref={printRef}>
      <div className="page-header">
        <h1 className="page-title">🗓️ أجندة الجلسات</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          أجندة الجلسات التاريخية — {filteredRolls.length} يوم مسجل
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'الكل' },
          { id: 'thisMonth', label: 'الشهر الحالي' },
          { id: 'lastMonth', label: 'الشهر الماضي' },
          { id: 'lastWeek', label: '⏪ الأسبوع الماضي' },
          { id: 'range', label: '📆 نطاق تاريخ' },
        ].map((f) => (
          <button
            key={f.id}
            className={activeLogFilter === f.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setActiveLogFilter(f.id); setSearchDate(''); }}
            style={{ fontSize: 13 }}
          >
            {f.label}
          </button>
        ))}
        {activeLogFilter === 'range' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'Cairo', fontSize: 13 }} />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontFamily: 'Cairo', fontSize: 13 }} />
          </div>
        )}
        <input
          type="date"
          value={searchDate}
          onChange={(e) => { setSearchDate(e.target.value); setActiveLogFilter('all'); }}
          style={{ padding: '5px 10px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontFamily: 'Cairo', fontSize: 13 }}
          title="بحث بتاريخ محدد"
        />
      </div>

      {loading && (
        <div className="loading-text">جاري تحميل سجل الجلسات...</div>
      )}

      {error && (
        <div className="empty-state" style={{ color: '#b91c1c' }}>
          حدث خطأ أثناء تحميل السجل
        </div>
      )}

      {!loading && !error && filteredRolls.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🗓️</div>
          <div className="empty-state-text">
            لا توجد جلسات مسجلة بعد — ستظهر هنا تلقائياً عند ترحيل أي جلسة
          </div>
        </div>
      )}

      {!loading && filteredRolls.map((roll) => {
        const isOpen = openRolls.has(roll.id);
        const entries = Array.isArray(roll.entries) ? roll.entries : [];
        return (
          <div
            key={roll.id}
            className="card"
            style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', cursor: 'pointer',
                background: isOpen ? 'var(--primary-light, #fffbeb)' : undefined,
                borderBottom: isOpen ? '1px solid var(--border)' : undefined,
              }}
              onClick={() => toggleRoll(roll.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{isOpen ? '▼' : '▶'}</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    جلسة {formatDisplayDate(roll.sessionDate)}
                  </span>
                  <span style={{
                    marginRight: 12, fontSize: 12,
                    color: 'var(--text-muted)',
                  }}>
                    {entries.length} قضية
                  </span>
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={(e) => { e.stopPropagation(); handlePrintRoll(roll); }}
              >
                🖨️ طباعة
              </button>
            </div>

            {isOpen && (
              <div style={{ overflowX: 'auto' }}>
                <SessionsLogTable entries={entries} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
