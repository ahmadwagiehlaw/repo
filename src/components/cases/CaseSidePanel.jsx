import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import CaseForm from './CaseForm.jsx';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { formatDisplayDate, getCaseNumberPillStyle } from '@/utils/caseUtils.js';
import {
  getCaseTitle,
  getCaseSessionResult,
  getCaseRoleCapacity,
  getCaseFileLocation,
  getCaseProcedureTrack,
  getDerivedCaseSessionType,
} from '@/utils/caseCanonical.js';

const STATUS_LABELS = {
  new: 'جديدة',
  active: 'متداولة',
  under_review: 'قيد المراجعة',
  reserved_for_judgment: 'محجوزة للحكم',
  judged: 'محكوم فيها',
  appeal_window_open: 'تراعي مواعيد الطعن',
  suspended: 'موقوفة',
  struck_out: 'مشطوبة',
  archived: 'مؤرشفة',
};

function getCapacityStyle(capacity) {
  const text = String(capacity || '').trim();
  if (text.includes('مدعين') || text.includes('طاعن') || text === 'مدعي' || text.includes('مستأنف')) {
    return { background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' };
  }
  if (text.includes('لا شأن') || text.includes('لا شان')) {
    return { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', opacity: 0.7 };
  }
  return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
}

function getInlineAlertKey(alert) {
  return `${alert.id}:${alert.text}`;
}

function getSnoozeUntil(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export default function CaseSidePanel() {
  const navigate = useNavigate();
  const { getCase, evaluateRules } = useCases();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();
  
  const [open, setOpen] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showRolloverMenu, setShowRolloverMenu] = useState(false);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState(null);

  const imageAttachments = useMemo(() => {
    if (!caseData?.attachments) return [];
    return caseData.attachments.filter(att =>
      String(att.url || att.title || att.name || '').match(/\.(png|jpe?g|gif|webp)($|\?)/i) ||
      (att.localId && String(att.title || '').match(/\.(png|jpe?g|gif|webp)$/i))
    );
  }, [caseData]);

  useEffect(() => {
    const firstLocal = imageAttachments.find(a => a.localId && !a.url);
    if (!firstLocal) { setLocalCoverUrl(null); return; }
    import('@/services/LocalFileIndex.js').then(m =>
      m.default.openFile(firstLocal.localId).then(result => {
        setLocalCoverUrl(result?.url || null);
      })
    );
  }, [imageAttachments]);

  const displayCover = useMemo(() => {
    if (!caseData) return null;
    if (caseData.coverImage) return caseData.coverImage;
    if (imageAttachments.length > 0) {
      const first = imageAttachments[0];
      return first.url || localCoverUrl || null;
    }
    return null;
  }, [caseData, imageAttachments, localCoverUrl]);

  // حساب التايم لاين الثلاثي
  const triple = useMemo(() => {
    if (!caseData) return { current: null, previous: null, next: null };
    const history = Array.isArray(caseData.sessionsHistory)
      ? [...caseData.sessionsHistory].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      : [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const past = history.filter(s => new Date(s.date || 0) <= today);
    const future = [...history.filter(s => new Date(s.date || 0) > today)].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    const current = past[0] || null;
    const previous = past[1] || null;
    const next = future[0] || (caseData.nextSessionDate ? { date: caseData.nextSessionDate, sessionType: caseData.nextSessionType } : null);

    return { current, previous, next };
  }, [caseData]);

  const handleUpdateCover = async (url) => {
    if (!workspaceId || !caseData) return;
    try {
      setCaseData(prev => ({ ...prev, coverImage: url }));
      await storage.updateCase(workspaceId, caseData.id, { coverImage: url });
      setShowCoverSelector(false);
    } catch (error) { console.error('Failed to update cover', error); }
  };

  const handleUpdateCriticalHighlight = async (url) => {
    if (!workspaceId || !caseData) return;
    try {
      setCaseData(prev => ({ ...prev, criticalHighlightUrl: url }));
      await storage.updateCase(workspaceId, caseData.id, { criticalHighlightUrl: url });
    } catch (error) { console.error('Failed to update critical highlight', error); }
  };

  const workspaceId = currentWorkspace?.id;

  const handleQuickRollover = async (action) => {
    if (!workspaceId || !caseData) return;
    let updates = null;
    switch (action) {
      case 'chamber': updates = { agendaRoute: 'chamber', litigationStage: 'موقوف تعليقياً', status: 'suspended' }; break;
      case 'judgment': updates = { agendaRoute: 'judgments', status: 'reserved_for_judgment', litigationStage: 'محجوز للحكم' }; break;
      case 'referred': updates = { agendaRoute: 'referred', litigationStage: 'موقوف تعليقياً', status: 'suspended' }; break;
      case 'pleading': updates = { agendaRoute: 'sessions', status: 'active', litigationStage: 'متداول' }; break;
    }
    if (!updates) return;
    try {
      setCaseData((prev) => ({ ...prev, ...updates }));
      await storage.updateCase(workspaceId, caseData.id, updates);
      setShowRolloverMenu(false);
    } catch (error) { console.error('Quick Rollover failed', error); }
  };

  const handleQuickSave = async (field, value) => {
    if (!workspaceId || !caseData) return;
    try {
      setCaseData(prev => ({ ...prev, [field]: value }));
      await storage.updateCase(workspaceId, caseData.id, { [field]: value });
    } catch (err) { console.error('Quick save failed', err); }
  };

  const handleToggleNotifications = async () => {
    if (!workspaceId || !caseData?.id) return;

    const notificationsEnabled = caseData.notificationsEnabled !== true;
    const nextCaseData = { ...caseData, notificationsEnabled };
    setCaseData(nextCaseData);

    try {
      await storage.updateCase(workspaceId, caseData.id, { notificationsEnabled });
    } catch (error) {
      console.error('Failed to update notifications state', error);
      setCaseData(caseData);
      return;
    }

    try {
      if (typeof evaluateRules === 'function') {
        await evaluateRules(workspaceId, nextCaseData);
        const refreshed = await getCase(workspaceId, caseData.id);
        if (refreshed) setCaseData(refreshed);
      }
    } catch (error) {
      console.warn('Rules evaluation after notifications toggle failed', error);
    }
  };

  const handleQuickCustomFieldSave = async (fieldId, value) => {
    if (!workspaceId || !caseData) return;
    const newCustomFields = { ...(caseData.customFields || {}), [fieldId]: value };
    try {
      setCaseData(prev => ({ ...prev, customFields: newCustomFields }));
      await storage.updateCase(workspaceId, caseData.id, { customFields: newCustomFields });
    } catch (err) { console.error('Quick save failed', err); }
  };

  const updateInlineAlertState = async (updates) => {
    if (!workspaceId || !caseData?.id) return;
    const nextCaseData = { ...caseData, ...updates };
    setCaseData(nextCaseData);
    try {
      await storage.updateCase(workspaceId, caseData.id, updates);
    } catch (error) {
      console.error('Inline alert update failed', error);
      setCaseData(caseData);
    }
  };

  const dismissInlineAlert = (alert) => {
    const key = getInlineAlertKey(alert);
    const dismissedInlineAlerts = Array.from(new Set([...(caseData.dismissedInlineAlerts || []), key]));
    const snoozedInlineAlerts = { ...(caseData.snoozedInlineAlerts || {}) };
    delete snoozedInlineAlerts[alert.id];
    updateInlineAlertState({ dismissedInlineAlerts, snoozedInlineAlerts });
  };

  const snoozeInlineAlert = (alert, hours) => {
    const snoozedInlineAlerts = {
      ...(caseData.snoozedInlineAlerts || {}),
      [alert.id]: {
        key: getInlineAlertKey(alert),
        until: getSnoozeUntil(hours),
      },
    };
    updateInlineAlertState({ snoozedInlineAlerts });
  };

  const dismissVisibleInlineAlerts = () => {
    const visibleKeys = alerts.map(getInlineAlertKey);
    const dismissedInlineAlerts = Array.from(new Set([...(caseData.dismissedInlineAlerts || []), ...visibleKeys]));
    const snoozedInlineAlerts = { ...(caseData.snoozedInlineAlerts || {}) };
    alerts.forEach((alert) => delete snoozedInlineAlerts[alert.id]);
    updateInlineAlertState({ dismissedInlineAlerts, snoozedInlineAlerts });
  };

  useEffect(() => {
    const handleOpen = async (event) => {
      const caseId = event.detail?.caseId || event.detail?.id || (typeof event.detail === 'string' ? event.detail : null);
      if (!caseId || !currentWorkspace?.id) return;
      setOpen(true);
      setLoading(true);
      setShowQuickEdit(false);
      try {
        const data = await getCase(currentWorkspace.id, caseId);
        setCaseData(data);
      } catch (error) { console.error('Failed to load case details', error); } 
      finally { setLoading(false); }
    };
    window.addEventListener('open-case-panel', handleOpen);
    window.addEventListener('lawbase:open-case-panel', handleOpen);
    return () => {
      window.removeEventListener('open-case-panel', handleOpen);
      window.removeEventListener('lawbase:open-case-panel', handleOpen);
    };
  }, [currentWorkspace?.id, getCase]);

  const alerts = useMemo(() => {
    if (!caseData) return [];
    const list = [];
    const fileLoc = String(caseData.fileLocation || '').trim();
    if (fileLoc === 'غير موجود' || fileLoc === 'مفقود') list.push({ id: 'file', type: 'danger', icon: '🚨', text: `تنبيه: ملف الدعوى (${fileLoc})` });
    const isJudgedOrReserved = caseData.status === 'reserved_for_judgment' || caseData.agendaRoute === 'judgments';
    const missingJudgment = !caseData.summaryDecision && !caseData.judgmentPronouncement;
    if (isJudgedOrReserved && missingJudgment) list.push({ id: 'judgment', type: 'warning', icon: '⚠️', text: 'الدعوى محجوزة للحكم ولم يُسجل منطوق الحكم!' });
    const dismissed = new Set(Array.isArray(caseData.dismissedInlineAlerts) ? caseData.dismissedInlineAlerts : []);
    const snoozed = caseData.snoozedInlineAlerts && typeof caseData.snoozedInlineAlerts === 'object'
      ? caseData.snoozedInlineAlerts
      : {};
    const now = new Date();
    return list.filter((alert) => {
      const key = getInlineAlertKey(alert);
      if (dismissed.has(key)) return false;
      const snooze = snoozed[alert.id];
      if (!snooze || snooze.key !== key || !snooze.until) return true;
      return new Date(snooze.until) <= now;
    });
  }, [caseData]);

  if (!open) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={() => setOpen(false)} />

      <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: 'min(480px, 100vw)', background: '#f8fafc', zIndex: 9999, boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        
        <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: showQuickEdit ? '#fff7ed' : 'white', borderColor: showQuickEdit ? '#fdba74' : undefined, color: showQuickEdit ? '#c2410c' : undefined }} onClick={() => setShowQuickEdit(!showQuickEdit)}>
              {showQuickEdit ? '✖ إلغاء التعديل' : '✏️ تعديل سريع'}
            </button>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setOpen(false); navigate(`/cases/${caseData?.id}`); }}>
              📂 فتح الملف
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, borderColor: '#cbd5e1', background: showRolloverMenu ? '#f1f5f9' : 'white', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowRolloverMenu(!showRolloverMenu)}>
                ⚡ ترحيل ▾
              </button>
              {showRolloverMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowRolloverMenu(false)} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, width: '170px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <button onClick={() => handleQuickRollover('chamber')} style={{ padding: '10px 14px', textAlign: 'right', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', gap: '8px', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>🏛️ إحالة للشعبة</button>
                    <button onClick={() => handleQuickRollover('judgment')} style={{ padding: '10px 14px', textAlign: 'right', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#b45309', display: 'flex', gap: '8px', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>⚖️ حجز للحكم</button>
                    <button onClick={() => handleQuickRollover('referred')} style={{ padding: '10px 14px', textAlign: 'right', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4338ca', display: 'flex', gap: '8px', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>➡️ إحالة</button>
                    <button onClick={() => handleQuickRollover('pleading')} style={{ padding: '10px 14px', textAlign: 'right', background: '#f0fdf4', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#16a34a', display: 'flex', gap: '8px', alignItems: 'center', transition: 'background 0.2s', borderTop: '1px solid #dcfce7' }} onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}>↩️ إعادة للتداول / للمرافعة</button>
                  </div>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جاري تحميل البيانات...</div>
          ) : caseData ? (
            showQuickEdit ? (
              <div style={{ padding: '12px', display: 'grid', gap: '10px' }}>
                <CaseForm caseData={caseData} workspaceId={workspaceId} compact actionsPosition="top" onSave={async () => { const refreshed = await getCase(workspaceId, caseData.id); setCaseData(refreshed); setShowQuickEdit(false); }} onCancel={() => setShowQuickEdit(false)} />
              </div>
            ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Identity Section */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: '110px', alignSelf: 'stretch', minHeight: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                  {displayCover ? (
                    <img src={displayCover} alt="غلاف الملف" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '32px', opacity: 0.2, filter: 'grayscale(1)' }}>📁</div>
                  )}
                  <button
                    onClick={() => setShowCoverSelector(!showCoverSelector)}
                    style={{
                      position: 'absolute', bottom: 4, right: 4, left: 4,
                      background: 'rgba(15, 23, 42, 0.75)', color: 'white',
                      border: 'none', borderRadius: '4px', fontSize: 10,
                      padding: '4px', cursor: 'pointer', backdropFilter: 'blur(2px)'
                    }}
                  >
                    {displayCover && caseData.coverImage ? '🖼 تغيير الغلاف' : '🖼 تعيين غلاف'}
                  </button>
                  {showCoverSelector && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.97)', zIndex: 10, display: 'flex', flexDirection: 'column', padding: '8px', overflowY: 'auto', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', color: 'var(--primary)', marginBottom: 4 }}>تعيين صورة الغلاف</div>
                      {/* Image attachments */}
                      {imageAttachments.map((att, idx) => (
                        <div key={idx}
                          onClick={async () => {
                            if (att.localId && !att.url) {
                              const { default: lfi } = await import('@/services/LocalFileIndex.js');
                              const result = await lfi.openFile(att.localId);
                              if (result) handleUpdateCover(result.url);
                            } else {
                              handleUpdateCover(att.url);
                            }
                          }}
                          style={{ padding: '6px 4px', borderBottom: '1px solid #e2e8f0', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                          {att.localId ? '💾 ' : '🔗 '}{att.title || `صورة ${idx + 1}`}
                        </div>
                      ))}
                      <div onClick={() => handleUpdateCover(null)} style={{ padding: '6px 4px', fontSize: 10, cursor: 'pointer', color: '#ef4444', textAlign: 'center', fontWeight: 600 }}>🗑 إزالة الغلاف</div>
                      <div onClick={() => setShowCoverSelector(false)} style={{ padding: '4px', fontSize: 10, cursor: 'pointer', color: '#94a3b8', textAlign: 'center' }}>إغلاق</div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <CaseNumberBadge caseNumber={caseData.caseNumber} caseYear={caseData.caseYear} caseData={caseData} displayOrder={displaySettings.caseNumberDisplayOrder} style={{ fontSize: 18 }} />
                    {caseData?.criticalHighlightUrl && (
                      <a
                        href={caseData.criticalHighlightUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="فتح الملف / الإجراء المهم مباشرة"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#fbbf24',
                          background: '#1e293b',
                          border: '1px solid #f59e0b',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ فتح الملف المهم
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      title={caseData.notificationsEnabled === true ? 'إيقاف تنبيهات الجلسات' : 'تفعيل تنبيهات الجلسات'}
                      style={{
                        border: '1px solid',
                        borderColor: caseData.notificationsEnabled === true ? '#bbf7d0' : '#fecaca',
                        background: caseData.notificationsEnabled === true ? '#f0fdf4' : '#fef2f2',
                        color: caseData.notificationsEnabled === true ? '#166534' : '#b91c1c',
                        borderRadius: '999px',
                        padding: '3px 9px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {caseData.notificationsEnabled === true ? '🔔 التنبيهات مفعلة' : '🔕 التنبيهات متوقفة'}
                    </button>
                    {caseData.joinedCases && caseData.joinedCases.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', border: '1px dashed #cbd5e1', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        🔗 منضمة: {Array.isArray(caseData.joinedCases) ? caseData.joinedCases.join(' - ') : caseData.joinedCases}
                      </div>
                    )}
                  </div>

                  {/* هيكل الخصوم النظيف */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 800 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>المدعي:</span>
                        {caseData.plaintiffName || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 1, background: '#e2e8f0', margin: '2px 0', position: 'relative' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'white', padding: '0 8px', position: 'absolute' }}>ضد</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>المدعى عليه:</span>
                        {caseData.defendantName || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '2px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, ...getCaseNumberPillStyle(caseData) }}>
                      {STATUS_LABELS[caseData.status] || caseData.status}
                    </span>
                    {caseData.roleCapacity && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, ...getCapacityStyle(getCaseRoleCapacity(caseData)) }}>
                        صفة: {getCaseRoleCapacity(caseData)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                      تنبيهات ظاهرة: {alerts.length}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={dismissVisibleInlineAlerts}
                      style={{ padding: '4px 10px', fontSize: 11, borderColor: '#fecaca', color: '#b91c1c', background: '#fff5f5' }}
                    >
                      حذف كل التنبيهات
                    </button>
                  </div>
                  {alerts.map(alert => (
                    <div key={alert.id} style={{ padding: '12px 16px', borderRadius: '10px', display: 'grid', gap: 8, fontSize: 13, fontWeight: 600, background: alert.type === 'danger' ? '#fef2f2' : '#fffbeb', color: alert.type === 'danger' ? '#b91c1c' : '#d97706', border: `1px solid ${alert.type === 'danger' ? '#fecaca' : '#fde68a'}` }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 18 }}>{alert.icon}</span>
                        <span style={{ flex: 1 }}>{alert.text}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => snoozeInlineAlert(alert, 3)}
                          style={{ padding: '3px 8px', fontSize: 11, background: 'white' }}
                        >
                          غفوة ٣ ساعات
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => snoozeInlineAlert(alert, 24)}
                          style={{ padding: '3px 8px', fontSize: 11, background: 'white' }}
                        >
                          غفوة يوم
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => dismissInlineAlert(alert)}
                          style={{ padding: '3px 8px', fontSize: 11, borderColor: '#fecaca', color: '#b91c1c', background: '#fff5f5' }}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Notes */}
              <div style={{ position: 'relative' }}>
                <textarea
                  defaultValue={caseData.notes || ''}
                  onBlur={(e) => { if(e.target.value !== caseData.notes) handleQuickSave('notes', e.target.value); }}
                  placeholder="أضف ملاحظة سريعة هنا (حفظ تلقائي)..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '14px 14px 14px 40px', background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: '8px', fontSize: '13px', minHeight: '48px', resize: 'vertical', outline: 'none', color: '#92400e', fontWeight: 600, fontFamily: 'Cairo' }}
                  rows={1}
                />
                <span style={{ position: 'absolute', top: '-10px', right: '12px', background: '#fef3c7', padding: '2px 8px', fontSize: '10px', color: '#d97706', fontWeight: 800, borderRadius: '4px', border: '1px solid #fde68a' }}>ملاحظات سريعة</span>
                <span style={{ position: 'absolute', top: '14px', left: '14px', opacity: 0.3 }}>✏️</span>
              </div>

              {/* 2. Timeline (الخط الزمني الثلاثي الأنيق) */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-secondary)' }}>📅 الخط الزمني للجلسات</h4>
                
                {/* الجلسة القادمة */}
                <div style={{ borderRight: '2px solid #16a34a', paddingRight: 14, position: 'relative', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: '#16a34a', border: '2px solid white' }} />
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 800, marginBottom: 4 }}>الجلسة القادمة</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{triple.next ? formatDisplayDate(triple.next.date) : 'لم تُحدد'}</div>
                  {triple.next?.sessionType && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600 }}>المطلوب: {triple.next.sessionType}</div>}
                </div>

                {/* الجلسة الحالية / المنعقدة */}
                <div style={{ borderRight: '2px solid var(--primary)', paddingRight: 14, position: 'relative', marginBottom: triple.previous ? 16 : 0 }}>
                  <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', border: '2px solid white' }} />
                  <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, marginBottom: 4 }}>الجلسة الحالية</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{triple.current ? formatDisplayDate(triple.current.date) : (caseData.lastSessionDate ? formatDisplayDate(caseData.lastSessionDate) : '—')}</div>
                  {(triple.current?.sessionResult || getCaseSessionResult(caseData)) && <div style={{ fontSize: 12, background: '#eff6ff', padding: '6px 10px', borderRadius: 6, marginTop: 6, color: '#1e3a8a', fontWeight: 700 }}>القرار: {triple.current?.sessionResult || getCaseSessionResult(caseData)}</div>}
                </div>

                {/* الجلسة السابقة */}
                {triple.previous && (
                  <div style={{ borderRight: '2px solid #cbd5e1', paddingRight: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', right: -6, top: 0, width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', border: '2px solid white' }} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>الجلسة السابقة</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{formatDisplayDate(triple.previous.date)}</div>
                    {triple.previous.sessionResult && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>القرار: {triple.previous.sessionResult}</div>}
                  </div>
                )}


              </div>

              {/* 3. Core Details */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-secondary)' }}>🏛️ البيانات الأساسية</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {caseData.filingDate && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>تاريخ الرفع: <b style={{color:'var(--text-primary)'}}>{formatDisplayDate(caseData.filingDate)}</b></span>}
                  {caseData.firstInstanceJudgment && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>حكم أول درجة: <b style={{color:'var(--text-primary)'}}>{caseData.firstInstanceJudgment}</b></span>}
                  {(caseData.customFields?.sessionPreparation || caseData.customFields?.sessionMinutes) && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>تحضير الجلسة: <b style={{color:'var(--text-primary)'}}>{caseData.customFields?.sessionPreparation || caseData.customFields?.sessionMinutes}</b></span>}
                  {caseData.customFields?.reviewRequests && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>طلبات الإطلاع: <b style={{color:'var(--text-primary)'}}>{caseData.customFields.reviewRequests}</b></span>}
                  {(caseData.court || caseData.circuit) && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>المحكمة: <b style={{color:'var(--text-primary)'}}>{caseData.court} {caseData.circuit ? `(${caseData.circuit})` : ''}</b></span>}
                  {getDerivedCaseSessionType(caseData) && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>نوع الجلسة: <b style={{color:'var(--text-primary)'}}>{getDerivedCaseSessionType(caseData)}</b></span>}
                  {caseData.fileLocation && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>مكان الملف: <b style={{color:'var(--text-primary)'}}>{getCaseFileLocation(caseData)}</b></span>}
                  {caseData.fileStatus && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>حالة الملف: <b style={{color:'var(--primary)'}}>{caseData.fileStatus}</b></span>}
                  {caseData.agendaRoute && <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>المسار: <b style={{color:'#9333ea'}}>{caseData.agendaRoute === 'sessions' ? 'جلسات' : caseData.agendaRoute}</b></span>}
                </div>
              </div>

              {/* 4. Case Subject / Title (موضوع الدعوى) */}
              {getCaseTitle(caseData) && (
                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#d97706', fontWeight: 800 }}>📑 موضوع الدعوى والطلبات</h4>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {getCaseTitle(caseData)}
                  </div>
                </div>
              )}

              {/* 5. Procedures */}
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

              {/* 6. Attachments */}
              {caseData.attachments && caseData.attachments.length > 0 && (
                <details style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <summary style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>📎 المرفقات ({caseData.attachments.length})</summary>
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {caseData.attachments.map((att, i) => {
                      const isCritical = caseData.criticalHighlightUrl === att.url;
                      return (
                        <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '4px 8px' }}>
                          <a href={att.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {att.title || `مرفق ${i + 1}`}</a>
                          <button title="تعيين كإجراء حرج" onClick={() => handleUpdateCriticalHighlight(isCritical ? null : att.url)} style={{ background: isCritical ? '#e11d48' : 'transparent', color: isCritical ? 'white' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '4px 6px', fontSize: '11px', cursor: 'pointer' }}>⚡</button>
                        </div>
                      );
                    })}
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
