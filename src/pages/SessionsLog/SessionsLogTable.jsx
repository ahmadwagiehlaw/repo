import { formatCaseNumber } from '@/utils/caseUtils.js';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';

export default function SessionsLogTable({ entries = [], printMode = false }) {
  const displaySettings = useDisplaySettings();

  if (!entries.length) {
    return (
      <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
        لا توجد قضايا مسجلة في هذه الجلسة
      </div>
    );
  }

  return (
    <table
      style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: printMode ? 12 : 13, fontFamily: 'Cairo',
      }}
    >
      <thead>
        <tr style={{ background: 'var(--bg-secondary, #f8fafc)' }}>
          {['رقم الدعوى', 'المدعي', 'المدعى عليه', 'الجلسة السابقة', 'الجلسة القادمة', 'القرار', 'نوع الجلسة', 'محضر الجلسة', 'ملاحظات'].map((h) => (
            <th key={h} style={{
              padding: '8px 12px', textAlign: 'right',
              borderBottom: '1px solid var(--border)',
              fontWeight: 700, color: 'var(--text-secondary)',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, idx) => (
          <tr
            key={entry.caseId || idx}
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <td style={{ padding: '8px 12px' }}>
              <span style={{ direction: 'ltr', display: 'inline-block', unicodeBidi: 'embed' }}>
                {formatCaseNumber(entry.caseNumber, entry.caseYear, {
                  caseNumberDisplayFormat: displaySettings.caseNumberDisplayFormat,
                  useArabicNumerals: displaySettings.useArabicNumerals,
                })}
              </span>
            </td>
            <td style={{ padding: '8px 12px' }}>{entry.clientName || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.defendantName || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.sessionDate || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.nextDate || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.decision || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.sessionType || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.sessionMinute || '—'}</td>
            <td style={{ padding: '8px 12px' }}>{entry.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
