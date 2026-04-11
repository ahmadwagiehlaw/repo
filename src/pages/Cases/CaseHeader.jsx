import { useNavigate } from 'react-router-dom';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { getCaseRoleCapacity } from '@/utils/caseCanonical.js';

function getCapacityStyle(capacity) {
  const text = String(capacity || '').trim();
  if (text.includes('مدعين') || text.includes('طاعن') || text === 'مدعي' || text.includes('مستأنف')) {
    return { background: '#166534', color: '#86efac', border: '1px solid #15803d' };
  }
  if (text.includes('لا شأن') || text.includes('لا شان')) {
    return { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' };
  }
  return { background: '#111827', color: '#94a3b8', border: '1px solid #1f2937' };
}

function getFeaturedImageUrl(caseData, fieldName) {
  const url = String(caseData?.[fieldName] || '').trim();
  if (url && url.startsWith('http')) return url;
  return '';
}

export default function CaseHeader({
  caseData,
  pillStyle,
  statusLabels,
  displayOrder,
  sensitiveHidden,
  dateDisplayOptions,
}) {
  const navigate = useNavigate();

  if (!caseData) return null;

  const fileCoverUrl = getFeaturedImageUrl(caseData, 'fileCoverImageUrl');
  const mainProcedureUrl = getFeaturedImageUrl(caseData, 'mainProcedureImageUrl');

  const roleText = String(getCaseRoleCapacity(caseData)).trim();
  const isNoStake = roleText.includes('لا شأن') || roleText.includes('لا شان');

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #334155',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        filter: isNoStake ? 'grayscale(100%) opacity(0.85)' : 'none',
        transition: 'filter 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: '64px',
            height: '84px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'grid',
            placeItems: 'center',
            fontSize: '28px',
            flexShrink: 0,
            overflow: 'hidden',
          }}
          title={fileCoverUrl ? 'غلاف الملف' : 'لم يتم تعيين غلاف للملف'}
        >
          {fileCoverUrl ? (
            <img src={fileCoverUrl} alt="غلاف الملف" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            '📁'
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CaseNumberBadge
              caseNumber={caseData.caseNumber}
              caseYear={caseData.caseYear}
              caseData={caseData}
              displayOrder={displayOrder}
              style={{ fontSize: '15px', padding: '4px 12px', borderRadius: '8px' }}
            />
            <span
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontWeight: 800,
                color: '#94a3b8',
                background: '#1e293b',
                border: '1px solid #334155',
                ...pillStyle,
              }}
            >
              {statusLabels?.[caseData.status] || caseData.status}
            </span>
          </div>

          <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', lineHeight: 1.3 }}>
            <span style={{ color: '#60a5fa', filter: sensitiveHidden ? 'blur(4px)' : 'none' }}>{caseData.plaintiffName || '—'}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', background: '#1e293b', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>ضد</span>
            <span style={{ color: '#e2e8f0', filter: sensitiveHidden ? 'blur(4px)' : 'none' }}>{caseData.defendantName || '—'}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {caseData.roleCapacity && (
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '8px', fontWeight: 700, ...getCapacityStyle(roleText) }}>
                صفة: {roleText}
              </span>
            )}
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span>آخر إجراء:</span>
              <DateDisplay value={caseData.lastSessionDate} options={dateDisplayOptions} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '12px', padding: '8px 14px', background: '#0284c7', borderColor: '#0369a1', borderRadius: '6px', fontWeight: 700 }}
            onClick={() => navigate('/templates', { state: { selectedCaseId: caseData.id } })}
            title="إنشاء مذكرة أو مستند جديد لهذه القضية"
          >
            📝 صياغة مستند
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '8px 14px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-case-panel', { detail: { id: caseData.id } }))}
          >
            ✏️ تعديل الدعوى
          </button>
        </div>
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '8px',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'grid',
            placeItems: 'center',
            fontSize: '28px',
            flexShrink: 0,
            overflow: 'hidden',
          }}
          title={mainProcedureUrl ? 'أهم إجراء بارز' : 'لم يتم تعيين صورة للإجراء الأبرز'}
        >
          {mainProcedureUrl ? (
            <img src={mainProcedureUrl} alt="أهم إجراء" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            '📜'
          )}
        </div>
      </div>
    </div>
  );
}
