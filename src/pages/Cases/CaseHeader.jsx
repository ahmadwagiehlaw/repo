import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import CaseForm from '@/components/cases/CaseForm.jsx';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { formatDisplayDate, getCaseNumberPillStyle } from '@/utils/caseUtils.js';
import {
  getCaseTitle, getCaseSessionResult, getCaseRoleCapacity,
  getCaseFileLocation, getCaseProcedureTrack, getDerivedCaseSessionType,
} from '@/utils/caseCanonical.js';

const STATUS_LABELS = {
  new: 'جديدة', active: 'متداولة', under_review: 'قيد المراجعة',
  reserved_for_judgment: 'محجوزة للحكم', judged: 'محكوم فيها',
  appeal_window_open: 'تراعي مواعيد الطعن', suspended: 'موقوفة',
  struck_out: 'مشطوبة', archived: 'مؤرشفة',
};

function getCapacityStyle(capacity) {
  const text = String(capacity || '').trim();
  if (text.includes('مدعين') || text.includes('طاعن') || text === 'مدعي' || text.includes('مستأنف')) return { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' };
  if (text.includes('لا شأن') || text.includes('لا شان')) return { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', opacity: 0.7 };
  return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
}

export default function CaseSidePanel() {
  const navigate = useNavigate();
  const { getCase } = useCases();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();
  
  const [open, setOpen] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showRolloverMenu, setShowRolloverMenu] = useState(false);

  const imageAttachments = useMemo(() => {
    if (!caseData?.attachments) return [];
    return caseData.attachments.filter(att => String(att.url || att.name || '').match(/\.(png|jpe?g|gif|webp)($|\?)/i));
  }, [caseData]);

  const displayCover = useMemo(() => {
    if (!caseData) return null;
    if (caseData.coverImage) return caseData.coverImage;
    if (imageAttachments.length > 0) return imageAttachments[0].url;
    return null;
  }, [caseData, imageAttachments]);

  const triple = useMemo(() => {
    if (!caseData) return { current: null, previous: null, next: null };
    const history = Array.isArray(caseData.sessionsHistory) ? [...caseData.sessionsHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)) : [];
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const past = history.filter(s => new Date(s.date || 0) <= today);
    const future = [...history.filter(s => new Date(s.date || 0) > today)].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    return {
      current: past[0] || null,
      previous: past[1] || null,
      next: future[0] || (caseData.nextSessionDate ? { date: caseData.nextSessionDate, sessionType: caseData.nextSessionType } : null)
    };
  }, [caseData]);

  const workspaceId = currentWorkspace?.id;

  const handleQuickSave = async (field, value) => {
    if (!workspaceId || !caseData) return;
    try {
      setCaseData(prev => ({ ...prev, [field]: value }));
      await storage.updateCase(workspaceId, caseData.id, { [field]: value });
    } catch (err) {}
  };

  const handleQuickCustomFieldSave = async (fieldId, value) => {
    if (!workspaceId || !caseData) return;
    const newCustomFields = { ...(caseData.customFields || {}), [fieldId]: value };
    try {
      setCaseData(prev => ({ ...prev, customFields: newCustomFields }));
      await storage.updateCase(workspaceId, caseData.id, { customFields: newCustomFields });
    } catch (err) {}
  };

  useEffect(() => {
    const handleOpen = async (event) => {
      const caseId = event.detail?.caseId || event.detail?.id || (typeof event.detail === 'string' ? event.detail : null);
      if (!caseId || !currentWorkspace?.id) return;
      setOpen(true); setLoading(true); setShowQuickEdit(false);
      try {
        const data = await getCase(currentWorkspace.id, caseId);
        setCaseData(data);
      } catch (error) {} finally { setLoading(false); }
    };
    window.addEventListener('open-case-panel', handleOpen);
    window.addEventListener('lawbase:open-case-panel', handleOpen);
    return () => { window.removeEventListener('open-case-panel', handleOpen); window.removeEventListener('lawbase:open-case-panel', handleOpen); };
  }, [currentWorkspace?.id, getCase]);

  if (!open) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={() => setOpen(false)} />

      <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: 'min(480px, 100vw)', background: '#f8fafc', zIndex: 9999, boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        
        <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowQuickEdit(!showQuickEdit)}>✏️ تعديل سريع</button>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setOpen(false); navigate(`/cases/${caseData?.id}`); }}>📂 فتح الملف</button>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل البيانات...</div>
          ) : caseData ? (
            showQuickEdit ? (
              <div style={{ padding: '12px' }}>
                <CaseForm caseData={caseData} workspaceId={workspaceId} compact actionsPosition="top" onSave={async () => { const refreshed = await getCase(workspaceId, caseData.id); setCaseData(refreshed); setShowQuickEdit(false); }} onCancel={() => setShowQuickEdit(false)} />
              </div>
            ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Identity Section + Badges */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: '110px', alignSelf: 'stretch', minHeight: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {displayCover ? <img src={displayCover} alt="غلاف الملف" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '32px', opacity: 0.2, filter: 'grayscale(1)' }}>📁</div>}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <CaseNumberBadge caseNumber={caseData.caseNumber} caseYear={caseData.caseYear} caseData={caseData} displayOrder={displaySettings.caseNumberDisplayOrder} style={{ fontSize: 18 }} />
                  </div>
                  {/* Parties */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 800 }}><span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>المدعي:</span>{caseData.plaintiffName || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 1, background: '#e2e8f0', margin: '2px 0', position: 'relative' }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'white', padding: '0 8px', position: 'absolute' }}>ضد</span></div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}><span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>المدعى عليه:</span>{caseData.defendantName || '—'}</div>
                  </div>
                  {/* Badges Returned */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, ...getCaseNumberPillStyle(caseData) }}>{STATUS_LABELS[caseData.status] || caseData.status}</span>
                    {caseData.roleCapacity && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, ...getCapacityStyle(getCaseRoleCapacity(caseData)) }}>صفة: {getCaseRoleCapacity(caseData)}</span>}
                  </div>
                </div>
              </div>

              {/* 2. Quick Note */}
              <div style={{ position: 'relative' }}>
                <input
                  defaultValue={caseData.notes || ''}
                  onBlur={(e) => { if(e.target.value !== caseData.notes) handleQuickSave('notes', e.target.value); }}
                  placeholder="ملاحظة سريعة (حفظ تلقائي)..."
                  style={{ width: '100%', padding: '10px 14px 10px 30px', background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#92400e', fontWeight: 600 }}
                />
                <span style={{ position: 'absolute', top: '10px', left: '10px', opacity: 0.3 }}>✏️</span>
              </div>

              {/* 3. Timeline + Minutes/Requests Inside */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-secondary)' }}>📅 مسار الجلسات</h4>
                
                {/* Nodes */}
                <div style={{ borderRight: '2px solid #16a34a', paddingRight: 14, position: 'relative', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: '#16a34a', border: '2px solid white' }} />
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 800, marginBottom: 4 }}>القادمة</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{triple.next ? formatDisplayDate(triple.next.date) : 'لم تُحدد'}</div>
                  {triple.next?.sessionType && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 700 }}>المطلوب: {triple.next.sessionType}</div>}
                </div>
                <div style={{ borderRight: '2px solid var(--primary)', paddingRight: 14, position: 'relative', marginBottom: triple.previous ? 16 : 0 }}>
                  <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', border: '2px solid white' }} />
                  <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, marginBottom: 4 }}>الحالية</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{triple.current ? formatDisplayDate(triple.current.date) : (caseData.lastSessionDate ? formatDisplayDate(caseData.lastSessionDate) : '—')}</div>
                  {(triple.current?.sessionResult || getCaseSessionResult(caseData)) && <div style={{ fontSize: 11, background: '#eff6ff', padding: '4px 8px', borderRadius: 4, marginTop: 4, color: '#1e3a8a', fontWeight: 700 }}>القرار: {triple.current?.sessionResult || getCaseSessionResult(caseData)}</div>}
                </div>
                {triple.previous && (
                  <div style={{ borderRight: '2px solid #cbd5e1', paddingRight: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', border: '2px solid white' }} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>السابقة</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{formatDisplayDate(triple.previous.date)}</div>
                  </div>
                )}

                {/* Compact Fields Inside Timeline */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px', display: 'block' }}>📝 محضر الجلسة</label>
                    <input
                      defaultValue={caseData.customFields?.sessionMinutes || ''}
                      onBlur={(e) => handleQuickCustomFieldSave('sessionMinutes', e.target.value)}
                      placeholder="تفاصيل المحضر..."
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outlineColor: 'var(--primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px', display: 'block' }}>🔍 طلبات الإطلاع</label>
                    <input
                      defaultValue={caseData.customFields?.reviewRequests || ''}
                      onBlur={(e) => handleQuickCustomFieldSave('reviewRequests', e.target.value)}
                      placeholder="تصاريح، طلبات..."
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outlineColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Core Details (Clean Grid) */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-secondary)' }}>🏛️ البيانات الأساسية</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px' }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نوع الدعوى</div><div style={{ fontSize: 13, fontWeight: 600 }}>{getCaseProcedureTrack(caseData) || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>المحكمة / الدائرة</div><div style={{ fontSize: 13, fontWeight: 600 }}>{caseData.court || '—'} {caseData.circuit ? `(${caseData.circuit})` : ''}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>مكان الملف</div><div style={{ fontSize: 13, fontWeight: 600 }}>{getCaseFileLocation(caseData) || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>حالة الملف</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{caseData.fileStatus || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نوع الجلسة</div><div style={{ fontSize: 13, fontWeight: 600 }}>{getDerivedCaseSessionType(caseData) || '—'}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>المسار</div><div style={{ fontSize: 13, fontWeight: 600, color: '#9333ea' }}>{caseData.agendaRoute === 'sessions' ? 'جلسات' : caseData.agendaRoute || '—'}</div></div>
                </div>
                {caseData.joinedCases && caseData.joinedCases.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>دعاوى منضمة / مرتبطة</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>🔗 {Array.isArray(caseData.joinedCases) ? caseData.joinedCases.join(' - ') : caseData.joinedCases}</div>
                  </div>
                )}
              </div>

              {/* 5. Case Subject / Title */}
              {getCaseTitle(caseData) && (
                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#d97706', fontWeight: 800 }}>📑 موضوع الدعوى والطلبات</h4>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{getCaseTitle(caseData)}</div>
                </div>
              )}

              {/* 6. Procedures (Restored) */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>⚙️ إجراءات الدعوى</h4>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { setOpen(false); navigate(`/cases/${caseData.id}?tab=procedures`); }}>+ إضافة / عرض</button>
                </div>
                {caseData.procedures && caseData.procedures.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {caseData.procedures.slice(0, 3).map((proc, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 600, color: 'var(--primary)', marginLeft: 6 }}>{proc.date || ''}</span> 
                        {proc.title || proc.description || 'إجراء'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', background: '#f8fafc', borderRadius: 6 }}>لا توجد إجراءات مسجلة حديثاً</div>
                )}
              </div>

              {/* 7. Attachments (Restored) */}
              {caseData.attachments && caseData.attachments.length > 0 && (
                <details style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <summary style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>📎 المرفقات ({caseData.attachments.length})</summary>
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {caseData.attachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '4px 8px' }}>
                        <a href={att.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {att.title || `مرفق ${i + 1}`}</a>
                      </div>
                    ))}
                  </div>
                </details>
              )}

            </div>
            )
          ) : null}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}
