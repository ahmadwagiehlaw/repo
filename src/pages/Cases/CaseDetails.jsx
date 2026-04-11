import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaseAttachmentsTab from '@/pages/Cases/CaseAttachmentsTab.jsx';
import CaseDocumentsTab from '@/pages/Cases/CaseDocumentsTab.jsx';
import CaseEditTab from '@/pages/Cases/CaseEditTab.jsx';
import CaseHeader from '@/pages/Cases/CaseHeader.jsx';
import CaseInfo from '@/pages/Cases/CaseInfo.jsx';
import CaseLegalBlocksSection from '@/pages/Cases/CaseLegalBlocksSection.jsx';
import CaseReportModal from '@/pages/Cases/CaseReportModal.jsx';
import CaseTasksTab from '@/pages/Cases/CaseTasksTab.jsx';
import CaseTimeline from '@/pages/Cases/CaseTimeline.jsx';
import CaseProceduresTab from '@/pages/Cases/CaseProceduresTab.jsx';
import useCaseDetails from '@/pages/Cases/useCaseDetails.js';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { useSensitiveMode } from '@/hooks/useSensitiveMode.js';
import { formatDisplayDate, getCaseNumberPillStyle, getDateDisplayOptions } from '@/utils/caseUtils.js';
import {
  BlockTypeTag,
  CASE_TABS,
  DEFAULT_BLOCK_TYPES,
  InfoCard,
  STATUS_LABELS,
  isInspectionTask,
} from '@/pages/Cases/CaseDetailsHelpers.jsx';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CaseDetails() {
  const navigate = useNavigate();
  const [editInitialTab, setEditInitialTab] = useState('البيانات الأساسية');
  const displaySettings = useDisplaySettings();
  const { hidden: sensitiveHidden } = useSensitiveMode();
  const dateDisplayOptions = useMemo(() => getDateDisplayOptions(displaySettings), [displaySettings]);
  const formatUiDate = (value) => formatDisplayDate(value, dateDisplayOptions);
  const {
    caseData,
    loading,
    activeTab,
    setActiveTab,
    tasks,
    judgments,
    legalBlocks,
    setLegalBlocks,
    blockTypes,
    showBlockTypesManager,
    setShowBlockTypesManager,
    savingBlocks,
    showReportModal,
    setShowReportModal,
    showTaskForm,
    setShowTaskForm,
    editingTask,
    setEditingTask,
    taskFormData,
    setTaskFormData,
    showAttachmentForm,
    setShowAttachmentForm,
    newAttachmentUrl,
    setNewAttachmentUrl,
    newAttachmentTitle,
    setNewAttachmentTitle,
    savingTask,
    showSessionForm,
    setShowSessionForm,
    sessionFormData,
    setSessionFormData,
    showJudgmentForm,
    setShowJudgmentForm,
    judgmentFormData,
    setJudgmentFormData,
    saveBlocks,
    updateBlockTypes,
    handleSaveTask,
    handleDeleteTask,
    handleToggleTaskComplete,
    handleAddAttachment,
    handleAddLocalFile,
    handleSaveAttachment,
    handleDeleteAttachment,
    handleAddSession,
    handleAddJudgment,
    timelineEvents,
    caseProcedures,
    procedureOptions,
    saveProcedureOptions,
    addCaseProcedure,
    deleteCaseProcedure,
    lastSession,
    workspaceId,
    refreshCaseData,
  } = useCaseDetails();

  const pillStyle = getCaseNumberPillStyle(caseData);
  const sortedSessions = [...(caseData?.sessionsHistory || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const sortedJudgments = [...judgments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const openTasks = tasks.filter((t) => !t?.completed);
  const primaryUpcomingSession = sortedSessions.find((s) => String(s?.date || '').trim());
  const latestJudgment = sortedJudgments[0] || null;
  const recentProcedures = [...(caseProcedures || [])]
    .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
    .slice(0, 4);
  const handlePrintReport = () => {
    const safeCaseData = caseData || {};
    const safeSessions = Array.isArray(safeCaseData.sessionsHistory) ? safeCaseData.sessionsHistory : [];
    const safeJudgments = Array.isArray(judgments) ? judgments : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeLegalBlocks = Array.isArray(legalBlocks) ? legalBlocks : [];
    const caseNum = [String(safeCaseData.caseNumber || '').trim(), String(safeCaseData.caseYear || '').trim()]
      .filter(Boolean)
      .join('/') || '—';
    const caseTitle = safeCaseData.plaintiffName || safeCaseData.clientName || '—';
    const caseStatus = STATUS_LABELS[safeCaseData.status] || safeCaseData.status || '—';
    const plaintiffName = safeCaseData.plaintiffName || '—';
    const defendantName = safeCaseData.defendantName || '—';
    const courtName = safeCaseData.court || '—';
    const firstInstanceNumber = safeCaseData.firstInstanceNumber || '—';
    const firstInstanceCourt = safeCaseData.firstInstanceCourt || '—';
    const firstInstanceDate = safeCaseData.firstInstanceDate ? formatUiDate(safeCaseData.firstInstanceDate) : '—';
    const firstInstanceJudgment = safeCaseData.firstInstanceJudgment || '—';

    const sessionsHtml = safeSessions
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5)
      .map(s => `<li>${formatUiDate(s?.date)}: ${s?.sessionResult || '—'}</li>`)
      .join('');

    const judgementsHtml = safeJudgments
      .map(j => `<li>${formatUiDate(j?.date)}: ${j?.decision || j?.summary || '—'}</li>`)
      .join('');

    const legalBlocksHtml = safeLegalBlocks
      .sort((a, b) => a.order - b.order)
      .map(b => `
        <h3 style="margin-top: 20px; color: #0284c7;">${b.title || ''}</h3>
        <p style="font-size: 13px; line-height: 1.6;">${b.content || ''}</p>
      `)
      .join('');

    const tasksHtml = safeTasks
      .filter(t => !t?.completed)
      .map(t => `<li>${t?.title || '—'} ${t?.dueDate ? `(${formatUiDate(t.dueDate)})` : ''}</li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; }
          body { font-family: Cairo, Arial, sans-serif; padding: 40px; background: #f5f5f5; direction: rtl; }
          .report { background: white; padding: 40px; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 10px; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section-title { font-size: 18px; font-weight: 700; color: #0284c7; margin-bottom: 15px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
          ul { padding-right: 20px; }
          li { margin-bottom: 8px; color: #333; font-size: 13px; }
          .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px; }
          .info-item { }
          .info-label { font-weight: 600; color: #666; font-size: 12px; }
          .info-value { color: #333; font-size: 14px; margin-top: 2px; }
          @media print { body { background: white; } .report { box-shadow: none; } }
        </style>
      </head>
      <body>
          <div class="report">
          <div class="header">
            <h1>${caseNum}</h1>
            <p>${caseTitle}</p>
          </div>

          <div class="section">
            <div class="section-title">📋 معلومات الدعوى</div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">📌 الحالة</div>
                <div class="info-value">${caseStatus}</div>
              </div>
              <div class="info-item">
                <div class="info-label">👤 المدعي</div>
                <div class="info-value">${plaintiffName}</div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">👥 المدعى عليه</div>
                <div class="info-value">${defendantName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">🏛️ المحكمة</div>
                <div class="info-value">${courtName}</div>
              </div>
            </div>
          </div>

          ${(safeCaseData.firstInstanceNumber || safeCaseData.firstInstanceCourt || safeCaseData.firstInstanceDate || safeCaseData.firstInstanceJudgment) ? `<div class="section">
            <div class="section-title">📜 بيانات الدعوى المطعون فيها / المستأنفة</div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">الرقم</div>
                <div class="info-value">${firstInstanceNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">المحكمة</div>
                <div class="info-value">${firstInstanceCourt}</div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">تاريخ الحكم</div>
                <div class="info-value">${firstInstanceDate}</div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">منطوق الحكم</div>
                <div class="info-value">${firstInstanceJudgment}</div>
              </div>
            </div>
          </div>` : ''}

          ${sessionsHtml ? `<div class="section">
            <div class="section-title">📅 آخر الجلسات</div>
            <ul>${sessionsHtml}</ul>
          </div>` : ''}

          ${judgementsHtml ? `<div class="section">
            <div class="section-title">⚖️ الأحكام</div>
            <ul>${judgementsHtml}</ul>
          </div>` : ''}

          ${legalBlocksHtml ? `<div class="section">
            <div class="section-title">📝 العمل الفني</div>
            ${legalBlocksHtml}
          </div>` : ''}

          ${tasksHtml ? `<div class="section">
            <div class="section-title">✓ المهام المتبقية</div>
            <ul>${tasksHtml}</ul>
          </div>` : ''}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
            تم إنشاء التقرير في ${formatUiDate(new Date().toISOString())}
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '', 'width=900,height=700');
    if (!printWin) {
      alert('تعذر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        جاري التحميل...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>القضية غير موجودة</div>
        <button onClick={() => navigate('/cases')} className="btn-primary">
          العودة إلى القضايا
        </button>
      </div>
    );
  }

  // ========== RENDER TAB CONTENT ==========

  const roleCapacityRaw = String(caseData?.roleCapacity || caseData?.role || '').trim();
  const isNoStake = roleCapacityRaw.includes('لا شأن') || roleCapacityRaw.includes('لا شان');

  let tabContent = null;

  if (activeTab === 'overview') {
    // --- SMART CALCULATIONS ---
    const totalSessions = Array.isArray(caseData?.sessionsHistory) ? caseData.sessionsHistory.length : 0;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.length - completedTasks;
    const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    
    // Case Lifespan Math
    const filingDate = caseData?.filingDate;
    let caseLifespan = null;
    if (filingDate) {
      const days = Math.floor((new Date() - new Date(filingDate)) / (1000 * 60 * 60 * 24));
      caseLifespan = days >= 0 ? days : 0;
    }

    // Urgent Items
    const urgentTasks = tasks.filter(t => !t.completed && t.priority === 'high');

    tabContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ROW 1: VITAL KPIs (مؤشرات الأداء الحيوية) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          
          {/* KPI: Case Age */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>عمر الدعوى</span>
            </div>
            {caseLifespan !== null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>{caseLifespan}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>يوماً في التداول</span>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>تاريخ القيد غير مسجل</div>
                <button onClick={() => { setEditInitialTab('بيانات إجرائية'); setActiveTab('edit'); }} style={{ background: '#f8fafc', border: '1px dashed var(--border)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, width: '100%' }}>
                  + إضافة تاريخ القيد لحساب العمر
                </button>
              </div>
            )}
          </div>

          {/* KPI: Task Health */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>مؤشر الإنجاز</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: taskProgress === 100 ? '#16a34a' : '#0f172a' }}>{taskProgress}%</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>({completedTasks} من {tasks.length} مهام)</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${taskProgress}%`, height: '100%', background: taskProgress === 100 ? '#16a34a' : 'var(--primary)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          {/* KPI: Sessions Volume */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>⚖️</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>حجم التداول</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a' }}>{totalSessions}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>جلسة حتى الآن</span>
            </div>
          </div>
        </div>

        {/* ROW 2: ACTION CENTER & TIMELINE */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Action Center (Left) */}
          <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ ماذا بعد؟ (الأولويات)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Next Session Bubble */}
                {caseData?.nextSessionDate ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '24px' }}>📅</div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800 }}>الجلسة القادمة</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a' }}>{formatDisplayDate(caseData.nextSessionDate)}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center', opacity: 0.8 }}>
                    <div style={{ fontSize: '24px' }}>📅</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>لا توجد جلسات مجدولة قريباً</div>
                  </div>
                )}

                {/* Urgent Tasks */}
                {urgentTasks.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '24px' }}>🔥</div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 800 }}>مهام عاجلة جداً</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#991b1b' }}>لديك {urgentTasks.length} مهام ذات أولوية قصوى</div>
                    </div>
                  </div>
                )}
                
                {urgentTasks.length === 0 && !caseData?.nextSessionDate && (
                   <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>لا توجد أولويات عاجلة حالياً</div>
                )}
              </div>
            </div>

            {/* QUICK PORTALS (بوابات التبويبات) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setActiveTab('judgments')} style={{ background: 'white', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚖️</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>سجل الأحكام</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{judgments.length} أحكام مسجلة</div>
              </button>
              
              <button onClick={() => setActiveTab('documents')} style={{ background: 'white', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>المستندات والمذكرات</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{(caseData?.attachments?.length || 0)} مرفقات ومستندات</div>
              </button>

              <button onClick={() => setActiveTab('legal')} style={{ background: 'white', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}><span>📝</span> التحليل القانوني للعمل الفني</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{legalBlocks.length} كتل فنية (أسانيد، وقائع، دفاع)</div>
                  </div>
                  <div style={{ color: 'var(--primary)', fontSize: '18px' }}>←</div>
                </div>
              </button>
            </div>

          </div>

          {/* Mini-Timeline (Right) */}
          <div style={{ flex: '2 1 400px', minWidth: 0, background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⏳</span> آخر التطورات (نبض الدعوى)
              </h3>
              <button onClick={() => setActiveTab('sessions')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>عرض السجل كاملاً</button>
            </div>
            <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
              <CaseTimeline timelineEvents={timelineEvents.slice(0, 5)} dateDisplayOptions={dateDisplayOptions} />
            </div>
          </div>

        </div>
      </div>
    );
  } else if (activeTab === 'sessions') {
    tabContent = (
      <CaseTimeline
        mode="sessions"
        sessions={sortedSessions}
        judgments={sortedJudgments}
        timelineEvents={timelineEvents}
        onAddSession={() => {
          setSessionFormData({ date: '', sessionResult: '', notes: '' });
          setShowSessionForm(true);
        }}
        onAddJudgment={() => {}}
        dateDisplayOptions={dateDisplayOptions}
      />
    );
  } else if (activeTab === 'judgments') {
    tabContent = (
      <CaseTimeline
        mode="judgments"
        sessions={sortedSessions}
        judgments={sortedJudgments}
        timelineEvents={timelineEvents}
        onAddSession={() => {}}
        onAddJudgment={() => {
          setJudgmentFormData({ date: '', decision: '', summary: '' });
          setShowJudgmentForm(true);
        }}
        dateDisplayOptions={dateDisplayOptions}
      />
    );
  } else if (activeTab === 'tasks') {
    tabContent = (
      <CaseTasksTab
        tasks={tasks}
        dateDisplayOptions={dateDisplayOptions}
        onAddTask={() => {
          setEditingTask(null);
          setTaskFormData({ title: '', dueDate: '', priority: 'medium', description: '' });
          setShowTaskForm(true);
        }}
        onToggleTaskComplete={handleToggleTaskComplete}
        onEditTask={(task) => {
          setEditingTask(task);
          setTaskFormData({
            title: task.title,
            dueDate: task.dueDate || '',
            priority: task.priority || 'medium',
            description: task.description || '',
          });
          setShowTaskForm(true);
        }}
        onDeleteTask={handleDeleteTask}
      />
    );
  } else if (activeTab === 'procedures') {
    tabContent = (
      <CaseProceduresTab
        procedures={caseProcedures}
        procedureOptions={procedureOptions}
        defaultSessionDate={String(caseData?.lastSessionDate || caseData?.nextSessionDate || '').trim()}
        dateDisplayOptions={dateDisplayOptions}
        onAddProcedure={addCaseProcedure}
        onDeleteProcedure={deleteCaseProcedure}
        onSaveProcedureOptions={saveProcedureOptions}
      />
    );
  } else if (activeTab === 'legal') {
    tabContent = (
      <CaseLegalBlocksSection
        legalBlocks={legalBlocks}
        blockTypes={blockTypes}
        savingBlocks={savingBlocks}
        showBlockTypesManager={showBlockTypesManager}
        setShowBlockTypesManager={setShowBlockTypesManager}
        saveBlocks={saveBlocks}
        updateBlockTypes={updateBlockTypes}
        setShowReportModal={setShowReportModal}
        onAddBlock={() => {
          const newBlock = {
            id: `block_${Date.now()}`,
            type: 'custom',
            title: 'كتلة جديدة',
            content: '',
            order: Math.max(...legalBlocks.map(b => b.order), 0) + 1,
          };
          setLegalBlocks([...legalBlocks, newBlock]);
        }}
        onUpdateBlockTitle={(blockId, value) => {
          setLegalBlocks(legalBlocks.map(b => b.id === blockId ? { ...b, title: value } : b));
        }}
        onUpdateBlockType={(blockId, value) => {
          setLegalBlocks(legalBlocks.map(b => b.id === blockId ? { ...b, type: value } : b));
        }}
        onMoveBlockUp={(blockId, blockOrder) => {
          setLegalBlocks(legalBlocks.map(b => {
            if (b.id === blockId) return { ...b, order: b.order - 1 };
            if (b.order === blockOrder - 1) return { ...b, order: b.order + 1 };
            return b;
          }));
        }}
        onMoveBlockDown={(blockId, blockOrder) => {
          setLegalBlocks(legalBlocks.map(b => {
            if (b.id === blockId) return { ...b, order: b.order + 1 };
            if (b.order === blockOrder + 1) return { ...b, order: b.order - 1 };
            return b;
          }));
        }}
        onDeleteBlock={(blockId) => {
          setLegalBlocks(legalBlocks.filter(b => b.id !== blockId));
        }}
        onUpdateBlockContent={(blockId, value) => {
          setLegalBlocks(legalBlocks.map(b =>
            b.id === blockId ? { ...b, content: value } : b
          ));
        }}
      />
    );
  } else if (activeTab === 'attachments') {
    tabContent = (
      <CaseAttachmentsTab
        attachments={caseData.attachments || []}
        dateDisplayOptions={dateDisplayOptions}
        onSaveAttachment={handleSaveAttachment}
        onDeleteAttachment={handleDeleteAttachment}
      />
    );
  } else if (activeTab === 'documents') {
    tabContent = (
      <CaseDocumentsTab
        caseData={caseData}
        dateDisplayOptions={dateDisplayOptions}
      />
    );
  } else if (activeTab === 'edit') {
    tabContent = (
      <CaseEditTab 
        caseData={caseData} 
        workspaceId={workspaceId} 
        onSave={() => {
          if (refreshCaseData) refreshCaseData();
          setActiveTab('overview');
        }} 
      />
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        [contenteditable]:focus-visible {
          outline: none;
          box-shadow: inset 0 0 0 2px var(--primary);
        }
        @media print {
          body * { display: none; }
          .print-modal * { display: block !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <CaseHeader
          caseData={caseData}
          caseNum={caseData?.caseNumber}
          lastSession={lastSession}
          pillStyle={pillStyle}
          statusLabels={STATUS_LABELS}
          displayOrder={displaySettings.caseNumberDisplayOrder}
          dateDisplayOptions={dateDisplayOptions}
          sensitiveHidden={sensitiveHidden}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto', paddingBottom: '12px' }}>
          {CASE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'Cairo',
                fontSize: '13px',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ marginBottom: '40px' }}>
          {tabContent}
        </div>
      </div>

      {/* Block Types Manager Modal */}
      {showBlockTypesManager && (
        <>
          <div
            onClick={() => setShowBlockTypesManager(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: 'min(680px, calc(100vw - 24px))',
              maxHeight: '88vh',
              overflowY: 'auto',
              zIndex: 501,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ⚙️ تخصيص أنواع الكتل
              <button
                onClick={() => setShowBlockTypesManager(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {blockTypes.map((type) => (
                <div
                  key={type.id}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    value={type.icon}
                    onChange={(e) => {
                      updateBlockTypes(blockTypes.map(t => t.id === type.id ? { ...t, icon: e.target.value } : t));
                    }}
                    style={{
                      width: '40px',
                      padding: '4px 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '16px',
                    }}
                  />
                  <input
                    type="text"
                    value={type.label}
                    onChange={(e) => {
                      updateBlockTypes(blockTypes.map(t => t.id === type.id ? { ...t, label: e.target.value } : t));
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontFamily: 'Cairo',
                    }}
                    dir="rtl"
                  />
                  <input
                    type="color"
                    value={type.color}
                    onChange={(e) => {
                      updateBlockTypes(blockTypes.map(t => t.id === type.id ? { ...t, color: e.target.value } : t));
                    }}
                    style={{
                      width: '40px',
                      height: '32px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setShowBlockTypesManager(false)}
                className="btn-primary"
                style={{ flex: 1, padding: '8px 12px' }}
              >
                تم
              </button>
            </div>
          </div>
        </>
      )}

      <CaseReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        onPrint={handlePrintReport}
        caseData={caseData}
      />

      {/* Task Form Modal */}
      {showTaskForm && (
        <>
          <div
            onClick={() => setShowTaskForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: 'min(680px, calc(100vw - 24px))',
              maxHeight: '88vh',
              overflowY: 'auto',
              zIndex: 501,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              {editingTask ? '✏️ تعديل المهمة' : '✓ إضافة مهمة جديدة'}
              <button
                onClick={() => setShowTaskForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>عنوان المهمة *</label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  placeholder="أدخل عنوان المهمة"
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>الموعد</label>
                <input
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>الأولوية</label>
                <select
                  value={taskFormData.priority}
                  onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', fontFamily: 'Cairo' }}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>الملاحظات</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveTask}
                  disabled={savingTask}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  {savingTask ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attachment Form Modal */}
      {showAttachmentForm && (
        <>
          <div
            onClick={() => setShowAttachmentForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: 'min(680px, calc(100vw - 24px))',
              maxHeight: '88vh',
              overflowY: 'auto',
              zIndex: 501,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              📎 إضافة مرفق جديد
              <button
                onClick={() => setShowAttachmentForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>رابط المرفق (Google Drive / URL) *</label>
                <input
                  type="url"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', fontFamily: 'Cairo' }}
                  dir="ltr"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>اسم المرفق</label>
                <input
                  type="text"
                  value={newAttachmentTitle}
                  onChange={(e) => setNewAttachmentTitle(e.target.value)}
                  placeholder="اسم أو وصف المرفق"
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '4px', fontSize: '12px', color: '#065f46' }}>
                💡 يمكنك إضافة رابط من Google Drive أو أي موقع للملفات
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddAttachment}
                  disabled={savingTask}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  {savingTask ? 'جاري الإضافة...' : 'إضافة'}
                </button>
                <button
                  onClick={() => setShowAttachmentForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Session Form Modal */}
      {showSessionForm && (
        <>
          <div
            onClick={() => setShowSessionForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: 'min(680px, calc(100vw - 24px))',
              maxHeight: '88vh',
              overflowY: 'auto',
              zIndex: 501,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              📅 إضافة جلسة جديدة
              <button
                onClick={() => setShowSessionForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>تاريخ الجلسة *</label>
                <input
                  type="date"
                  value={sessionFormData.date}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, date: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>نتيجة الجلسة *</label>
                <textarea
                  value={sessionFormData.sessionResult}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, sessionResult: e.target.value })}
                  placeholder="تأجيل للدور القادم، البت في الدعوى، إلخ..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ملاحظات</label>
                <textarea
                  value={sessionFormData.notes}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية عن الجلسة..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', minHeight: '60px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddSession}
                  disabled={savingTask}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  {savingTask ? 'جاري الإضافة...' : 'إضافة'}
                </button>
                <button
                  onClick={() => setShowSessionForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Judgment Form Modal */}
      {showJudgmentForm && (
        <>
          <div
            onClick={() => setShowJudgmentForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: 'min(680px, calc(100vw - 24px))',
              maxHeight: '88vh',
              overflowY: 'auto',
              zIndex: 501,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              ⚖️ إضافة حكم جديد
              <button
                onClick={() => setShowJudgmentForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>تاريخ الحكم *</label>
                <input
                  type="date"
                  value={judgmentFormData.date}
                  onChange={(e) => setJudgmentFormData({ ...judgmentFormData, date: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>القرار *</label>
                <textarea
                  value={judgmentFormData.decision}
                  onChange={(e) => setJudgmentFormData({ ...judgmentFormData, decision: e.target.value })}
                  placeholder="براءة، إدانة، مصادرة، تعويض، إلخ..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ملخص الحكم</label>
                <textarea
                  value={judgmentFormData.summary}
                  onChange={(e) => setJudgmentFormData({ ...judgmentFormData, summary: e.target.value })}
                  placeholder="ملخص مختصر لأسباب الحكم..."
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'Cairo' }}
                  dir="rtl"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddJudgment}
                  disabled={savingTask}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  {savingTask ? 'جاري الإضافة...' : 'إضافة'}
                </button>
                <button
                  onClick={() => setShowJudgmentForm(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}





