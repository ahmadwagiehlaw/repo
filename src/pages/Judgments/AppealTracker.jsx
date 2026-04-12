import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';

export default function AppealTracker({
  urgentJudgments,
  onOpenCase,
  caseNumberDisplayOrder,
  getDaysLabel,
}) {
  if (urgentJudgments.length === 0) return null;

  return (
    <div
      style={{
        background: '#fee2e2',
        border: '1px solid #fca5a5',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8, fontSize: 14 }}>
        ⚠️ مواعيد طعن عاجلة ({urgentJudgments.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urgentJudgments.map((judgment) => (
          <div
            key={judgment.id}
            onClick={() => onOpenCase(judgment.caseId)}
            style={{
              background: 'white',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 13,
              border: '1px solid #fca5a5',
            }}
          >
            <CaseNumberBadge
              caseNumber={judgment.caseNumber}
              caseYear={judgment.caseYear}
              caseData={judgment}
              variant="inline"
              displayOrder={caseNumberDisplayOrder}
              style={{ color: 'var(--primary)', fontWeight: 700 }}
            />
            <span style={{ color: '#dc2626', fontWeight: 700, marginRight: 8 }}>
              {getDaysLabel(judgment)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
