import { useNavigate } from 'react-router-dom';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { getCaseRoleCapacity } from '@/utils/caseCanonical.js';

function getCapacityStyle(capacity) {
  const text = String(capacity || '').trim();
  // Role styles (For us/Plaintiff/Appellant = Green; Muted/No Stake = Gray; Default = Slate)
  if (text.includes('مدعين') || text.includes('طاعن') || text === 'مدعي' || text.includes('مستأنف')) return { background: '#166534', color: '#86efac', border: '1px solid #15803d' };
  if (text.includes('لا شأن') || text.includes('لا شان')) return { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' };
  return { background: '#111827', color: '#94a3b8', border: '1px solid #1f2937' };
}

// Function to safely extract featured image URL or return a consistent placeholder visual spec
function getFeaturedImageUrl(caseData, fieldName) {
  const url = caseData?.[fieldName] || '';
  if (url && url.startsWith('http')) return url; // Basic URL validation
  // Placeholder spec (downstream UI agent will handle styling)
  return `PLACEHOLDER_FOR_${fieldName.toUpperCase()}`;
}

export default function CaseHeader({ 
  caseData, 
  pillStyle, 
  statusLabels, 
  displayOrder, 
  sensitiveHidden, 
  dateDisplayOptions 
}) {
  const navigate = useNavigate();
  
  if (!caseData) return null;

  // Extract featured images from data (fallback logic included)
  const fileCoverUrl = getFeaturedImageUrl(caseData, 'fileCoverImageUrl');
  const mainProcedureUrl = getFeaturedImageUrl(caseData, 'mainProcedureImageUrl');

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      flexWrap: 'wrap',
      gap: '16px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', /* Softer Premium Slate */
      padding: '20px 32px', 
      borderRadius: 'var(--radius-lg)', 
      border: '1px solid #334155', 
      marginBottom: '24px', 
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' 
    }}>
      
      {/* Right Section: Identity, File Cover, Data (Timeline flow) */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0, flex: 1 }}>
        {/* RIGHT FEATURED IMAGE: غلاف الملف (File Cover) */}
        <div style={{ 
          width: '72px', height: '96px' /* Compact book aspect ratio */, borderRadius: '12px', 
          background: '#1e293b', border: '1px solid #334155', 
          display: 'grid', placeItems: 'center', fontSize: '32px', flexShrink: 0, overflow: 'hidden',
          cursor: fileCoverUrl.startsWith('PLACEHOLDER') ? 'pointer' : 'default'
        }} title={fileCoverUrl.startsWith('PLACEHOLDER') ? 'أضف صورة غلاف الملف من المرفقات' : 'غلاف الملف البارز'}>
          {fileCoverUrl.startsWith('PLACEHOLDER') ? '📁' : <img src={fileCoverUrl} alt="غلاف الملف" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
          {/* Row 1: Case Number Badge & Status Pill */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CaseNumberBadge 
              caseNumber={caseData.caseNumber} 
              caseYear={caseData.caseYear} 
              caseData={caseData} 
              displayOrder={displayOrder} 
              style={{ fontSize: '16px', padding: '6px 14px', borderRadius: '10px' }} 
            />
            <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '999px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', background: '#111827', border: '1px solid #1f2937', ...pillStyle }}>
              {statusLabels?.[caseData.status] || caseData.status}
            </span>
          </div>
          
          {/* Row 2: Plaintiff vs Defendant Parties (Highly Compact & Distinct) */}
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', lineHeight: 1.4 }}>
            <span style={{ color: '#60a5fa' /* Bright Plaintiff Blue */ }}>{caseData.plaintiffName || '—'}</span>
            <span style={{ fontSize: '13px', color: '#94a3b8', background: '#111827', padding: '2px 8px', borderRadius: '4px', border: '1px solid #1f2937' }}>ضد</span>
            <span style={{ color: '#e2e8f0' /* Light Defendant Gray */ }}>{caseData.defendantName || '—'}</span>
          </div>

          {/* Row 3: Role Capacity Badge */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {caseData.roleCapacity && (
              <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '10px', fontWeight: 700, ...getCapacityStyle(getCaseRoleCapacity(caseData)) }}>
                صفة: {getCaseRoleCapacity(caseData)}
              </span>
            )}
            <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '8px' }}>
               <span>تاريخ آخر إجراء:</span> <DateDisplay value={caseData.lastSessionDate} options={dateDisplayOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Center/Left Section: Left Featured Image, Actions */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
        
        {/* Actions (Sleek and aligned with Premium Aesthetics) */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '13px', padding: '10px 18px', background: '#0284c7', borderColor: '#0369a1', borderRadius: '8px', fontWeight: 700 }}
            onClick={() => navigate('/templates', { state: { selectedCaseId: caseData.id } })}
            title="إنشاء مذكرة أو مستند جديد لهذه القضية"
          >
            📝 صياغة مستند
          </button>
          
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '10px 18px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-case-panel', { detail: { id: caseData.id } }))}
          >
            ✏️ تعديل الدعوى
          </button>
        </div>

        {/* LEFT FEATURED IMAGE: أهم إجراء (Main Procedure) / نسخة الملف */}
        <div style={{ 
          width: '96px', height: '96px' /* Square procedure aspect ratio */, borderRadius: '12px', 
          background: '#1e293b', border: '1px solid #334155', 
          display: 'grid', placeItems: 'center', fontSize: '32px', flexShrink: 0, overflow: 'hidden',
          cursor: mainProcedureUrl.startsWith('PLACEHOLDER') ? 'pointer' : 'default'
        }} title={mainProcedureUrl.startsWith('PLACEHOLDER') ? 'أضف صورة أهم إجراء من المرفقات' : 'أهم إجراء/نسخة الملف البارزة'}>
          {mainProcedureUrl.startsWith('PLACEHOLDER') ? '📜' : <img src={mainProcedureUrl} alt="أهم إجراء" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
      </div>

    </div>
  );
}
