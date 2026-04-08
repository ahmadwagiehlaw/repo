import { useMemo } from 'react';
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

// ============================================================================
// CONSTANTS
// ============================================================================

const CASE_TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: '📋' },
  { id: 'sessions', label: 'الجلسات', icon: '📅' },
  { id: 'judgments', label: 'الأحكام', icon: '⚖️' },
  { id: 'procedures', label: 'إجراءات الدعوى', icon: '🗂️' },
  { id: 'tasks', label: 'المهام', icon: '✓' },
  { id: 'legal', label: 'التحليل القانوني', icon: '📝' },
  { id: 'documents', label: 'المستندات', icon: '📄' },
  { id: 'attachments', label: 'أوراق الدعوى', icon: '📎' },
  { id: 'edit', label: 'تعديل', icon: '✏️' },
];

const DEFAULT_BLOCK_TYPES = [
  { id: 'facts', label: 'الوقائع', icon: '📖', color: '#3b82f6', bg: '#dbeafe' },
  { id: 'grounds', label: 'أسباب الطعن', icon: '⚠', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'response', label: 'الرد', icon: '💬', color: '#10b981', bg: '#d1fae5' },
  { id: 'defense', label: 'الدفاع', icon: '🛡️', color: '#8b5cf6', bg: '#f3e8ff' },
  { id: 'position', label: 'الموقف', icon: '👁️', color: '#ef4444', bg: '#fee2e2' },
  { id: 'notes', label: 'ملاحظات', icon: '📝', color: '#6b7280', bg: '#f3f4f6' },
  { id: 'custom', label: 'مخصص', icon: '★', color: '#ec4899', bg: '#fce7f3' },
];

const STATUS_LABELS = {
  new: 'جديدة',
  active: 'نشطة',
  under_review: 'قيد المراجعة',
  reserved_for_judgment: 'محجوزة للحكم',
  judged: 'محكوم فيها',
  appeal_window_open: 'نافذة الطعن',
  suspended: 'موقوفة',
  struck_out: 'مشطوبة',
  archived: 'مؤرشفة',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoCard({ icon, label, value, blurred = false }) {
  return (
    <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          filter: blurred ? 'blur(4px)' : 'none',
          userSelect: blurred ? 'none' : 'text',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function BlockTypeTag({ type, onSelect, isActive }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      style={{
        padding: '4px 12px',
        borderRadius: '6px',
        border: isActive ? `2px solid ${type.color}` : `1px solid var(--border)`,
        background: isActive ? type.bg : 'transparent',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'Cairo',
        color: isActive ? type.color : 'var(--text-secondary)',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {type.icon} {type.label}
    </button>
  );
}

function isInspectionTask(task) {
  const title = String(task?.title || '');
  return title.startsWith('طلب اطلاع:') || task?.source === 'inspection';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CaseDetails() {
  const navigate = useNavigate();
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

  let tabContent = null;

  if (activeTab === 'overview') {
    tabContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* 1. TOP PANORAMA: Quick Metrics Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Widget A: Next Session / Status */}
          <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 800, marginBottom: '8px' }}>📅 الجلسة القادمة</div>
            {caseData?.nextSessionDate ? (
              <>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a8a' }}>{formatDisplayDate(caseData.nextSessionDate)}</div>
                <div style={{ fontSize: '14px', color: '#2563eb', marginTop: '4px', fontWeight: 700 }}>{caseData.nextSessionType || 'غير محدد'}</div>
              </>
            ) : (
               <div style={{ fontSize: '16px', fontWeight: 700, color: '#64748b' }}>لا توجد جلسات قادمة</div>
            )}
          </div>

          {/* Widget B: Latest Judgment / Result */}
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 800, marginBottom: '8px' }}>⚖️ الموقف القانوني (آخر قرار/حكم)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534', lineHeight: 1.5 }}>
              {latestJudgment ? (latestJudgment.decision || latestJudgment.summary || 'حكم مسجل') : (primaryUpcomingSession?.sessionResult || 'لم يصدر قرار بعد')}
            </div>
          </div>

          {/* Widget C: File Location */}
          <div style={{ background: String(caseData.fileLocation).includes('غير موجود') ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '12px', padding: '20px', border: `1px solid ${String(caseData.fileLocation).includes('غير موجود') ? '#fca5a5' : '#e2e8f0'}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', color: String(caseData.fileLocation).includes('غير موجود') ? '#b91c1c' : '#475569', fontWeight: 800, marginBottom: '8px' }}>📂 مكان الملف الفعلي</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: String(caseData.fileLocation).includes('غير موجود') ? '#dc2626' : '#0f172a' }}>
              {caseData.fileLocation || 'غير محدد'}
            </div>
          </div>
        </div>

        {/* 2. MAIN SPLIT: Right (Timeline/Work) vs Left (Data/Attachments) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          
          {/* RIGHT COLUMN: The Case Journey & Legal Work (Wider) */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            
            {/* Extended Timeline */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
               <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <span>⏳</span> خريطة سير الدعوى
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                <CaseTimeline timelineEvents={timelineEvents} dateDisplayOptions={dateDisplayOptions} />
              </div>
            </div>

            {/* Legal Blocks Section */}
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
                const newBlock = { id: `block_${Date.now()}`, type: 'custom', title: 'كتلة جديدة', content: '', order: Math.max(...legalBlocks.map(b => b.order), 0) + 1 };
                setLegalBlocks([...legalBlocks, newBlock]);
              }}
              onUpdateBlockTitle={(blockId, value) => setLegalBlocks(legalBlocks.map(b => b.id === blockId ? { ...b, title: value } : b))}
              onUpdateBlockType={(blockId, value) => setLegalBlocks(legalBlocks.map(b => b.id === blockId ? { ...b, type: value } : b))}
              onMoveBlockUp={(blockId, blockOrder) => setLegalBlocks(legalBlocks.map(b => { if (b.id === blockId) return { ...b, order: b.order - 1 }; if (b.order === blockOrder - 1) return { ...b, order: b.order + 1 }; return b; }))}
              onMoveBlockDown={(blockId, blockOrder) => setLegalBlocks(legalBlocks.map(b => { if (b.id === blockId) return { ...b, order: b.order + 1 }; if (b.order === blockOrder + 1) return { ...b, order: b.order - 1 }; return b; }))}
              onDeleteBlock={(blockId) => setLegalBlocks(legalBlocks.filter(b => b.id !== blockId))}
              onUpdateBlockContent={(blockId, value) => setLegalBlocks(legalBlocks.map(b => b.id === blockId ? { ...b, content: value } : b))}
            />
          </div>

          {/* LEFT COLUMN: Meta Data & Attachments (Narrower, Scrollable) */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            
            {/* Scrollable Basic Data Container */}
            <div style={{ background: 'white', padding: '0', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
               <h3 style={{ margin: '0', color: 'var(--primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', padding: '16px 20px', background: '#f8fafc' }}>
                <span>📄</span> البيانات الأساسية
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '20px' }}>
                <CaseInfo caseData={caseData} statusLabels={STATUS_LABELS} sensitiveHidden={sensitiveHidden} />
              </div>
            </div>

            {/* Quick Attachments */}
            {caseData.attachments?.length > 0 && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                  <span>📎</span> أوراق ومرفقات سريعة
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {caseData.attachments.slice(0, 5).map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', color: 'var(--primary)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                      {att.title || 'مرفق بدون اسم'}
                    </a>
                  ))}
                  {caseData.attachments.length > 5 && (
                    <div style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '4px' }}>+ {caseData.attachments.length - 5} مرفقات أخرى (شاهد التبويب)</div>
                  )}
                </div>
              </div>
            )}

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
            title: 'ظƒطھظ„ط© ط¬ط¯ظٹط¯ط©',
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
        onAddAttachment={() => {
          setNewAttachmentUrl('');
          setNewAttachmentTitle('');
          setShowAttachmentForm(true);
        }}
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
    tabContent = <CaseEditTab caseData={caseData} onSave={() => navigate('/cases')} />;
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



