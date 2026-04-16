import firebase from 'firebase/compat/app';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CASE_STATUS, EXECUTION_STATUS, JUDGMENT_TYPE } from '@/core/Constants.js';
import storage from '@/data/Storage.js';
import { getJudgmentReservationCaseUpdate } from '@/workflows/SessionRollover.js';
import { confirmDialog } from '@/utils/browserFeedback.js';
import { getDerivedCaseSessionType } from '@/utils/caseCanonical.js';

const DEFAULT_BLOCK_TYPES = [
  { id: 'facts', label: 'الوقائع', icon: '📖', color: '#3b82f6', bg: '#dbeafe' },
  { id: 'grounds', label: 'أسباب الطعن', icon: '⚠️', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'response', label: 'الرد', icon: '💬', color: '#10b981', bg: '#d1fae5' },
  { id: 'defense', label: 'الدفاع', icon: '🛡️', color: '#8b5cf6', bg: '#f3e8ff' },
  { id: 'position', label: 'الموقف', icon: '👁️', color: '#ef4444', bg: '#fee2e2' },
  { id: 'notes', label: 'ملاحظات', icon: '📝', color: '#6b7280', bg: '#f3f4f6' },
  { id: 'custom', label: 'مخصص', icon: '★', color: '#ec4899', bg: '#fce7f3' },
];

const DEFAULT_TECHNICAL_PROCEDURE_OPTIONS = [
  'مذكرة دفاع',
  'حافظة مستندات',
  'فتح باب مرافعة',
  'مذكرة رأي',
];

const DEFAULT_ADMINISTRATIVE_PROCEDURE_OPTIONS = [
  'إيداع /رفع الدعوى',
  'تحريات مباحث',
  'إعلان المدعى عليه',
  'إعلان في مواجهة النيابة',
  'طلب/استعجال معلومات',
  'طلب من المحكمة',
  'شهادة من الجدول',
  'تعجيل الدعوى من الوقف',
  'مذكرة إحالة الدعوى',
  'إرسال تقرير الخبراء للجهة',
];

function sortProceduresDescending(list) {
  const source = Array.isArray(list) ? [...list] : [];
  return source.sort((a, b) => {
    const ad = String(a?.procedureDate || a?.date || '');
    const bd = String(b?.procedureDate || b?.date || '');
    if (ad !== bd) return bd.localeCompare(ad);
    return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
  });
}

function inferProcedureCategory(procedureType, technicalOptions) {
  const normalized = String(procedureType || '').trim();
  return technicalOptions.includes(normalized) ? 'technical' : 'administrative';
}


import { isInspectionTask } from '@/utils/caseUtils.js';

export default function useCaseDetails() {
  const { caseId } = useParams();
  const { getCase, evaluateRules } = useCases();
  const { currentWorkspace } = useWorkspace();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [judgments, setJudgments] = useState([]);

  const [legalBlocks, setLegalBlocks] = useState([]);
  const [blockTypes, setBlockTypes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lb_block_types')) || DEFAULT_BLOCK_TYPES;
    } catch {
      return DEFAULT_BLOCK_TYPES;
    }
  });
  const [showBlockTypesManager, setShowBlockTypesManager] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({ title: '', dueDate: '', priority: 'medium', description: '' });
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [procedureOptions, setProcedureOptions] = useState({
    technical: DEFAULT_TECHNICAL_PROCEDURE_OPTIONS,
    administrative: DEFAULT_ADMINISTRATIVE_PROCEDURE_OPTIONS,
  });
  const [newAttachmentTitle, setNewAttachmentTitle] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({ date: '', sessionResult: '', notes: '' });
  const [showJudgmentForm, setShowJudgmentForm] = useState(false);
  const [judgmentFormData, setJudgmentFormData] = useState({ date: '', decision: '', summary: '' });

  const workspaceId = String(currentWorkspace?.id || '').trim();

  useEffect(() => {
    if (!workspaceId) {
      setProcedureOptions({
        technical: DEFAULT_TECHNICAL_PROCEDURE_OPTIONS,
        administrative: DEFAULT_ADMINISTRATIVE_PROCEDURE_OPTIONS,
      });
      return;
    }

    let mounted = true;

    const loadProcedureOptions = async () => {
      try {
        const [technicalLoaded, administrativeLoaded] = await Promise.all([
          storage.getWorkspaceOptions(workspaceId, 'caseProceduresTechnical'),
          storage.getWorkspaceOptions(workspaceId, 'caseProceduresAdministrative'),
        ]);

        const technicalValues = Array.isArray(technicalLoaded?.values)
          ? technicalLoaded.values.map((entry) => String(entry || '').trim()).filter(Boolean)
          : [];
        const administrativeValues = Array.isArray(administrativeLoaded?.values)
          ? administrativeLoaded.values.map((entry) => String(entry || '').trim()).filter(Boolean)
          : [];

        if (!mounted) return;

        setProcedureOptions({
          technical: technicalValues.length ? technicalValues : DEFAULT_TECHNICAL_PROCEDURE_OPTIONS,
          administrative: administrativeValues.length ? administrativeValues : DEFAULT_ADMINISTRATIVE_PROCEDURE_OPTIONS,
        });
      } catch {
        if (mounted) {
          setProcedureOptions({
            technical: DEFAULT_TECHNICAL_PROCEDURE_OPTIONS,
            administrative: DEFAULT_ADMINISTRATIVE_PROCEDURE_OPTIONS,
          });
        }
      }
    };

    loadProcedureOptions();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !caseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const caseRecord = await getCase(workspaceId, caseId);
        if (caseRecord) {
          setCaseData(caseRecord);

          const blocks = Array.isArray(caseRecord.legalBlocks)
            ? caseRecord.legalBlocks
            : [
                { id: `block_${Date.now()}`, type: 'facts', title: 'الوقائع', content: '', order: 1 },
                { id: `block_${Date.now()}_2`, type: 'grounds', title: 'أسباب الطعن', content: '', order: 2 },
                { id: `block_${Date.now()}_3`, type: 'response', title: 'الرد', content: '', order: 3 },
                { id: `block_${Date.now()}_4`, type: 'defense', title: 'الدفاع', content: '', order: 4 },
              ];
          setLegalBlocks(blocks);

          const [tasksData, judgementsData] = await Promise.all([
            storage.listTasks ? storage.listTasks(workspaceId, { caseId, limit: 100 }) : Promise.resolve([]),
            storage.listJudgments ? storage.listJudgments(workspaceId, { limit: 100 }) : Promise.resolve([]),
          ]).catch(() => [[], []]);

          setTasks(Array.isArray(tasksData) ? tasksData : []);
          setJudgments(Array.isArray(judgementsData) ? judgementsData.filter((judgment) => judgment.caseId === caseId) : []);
        }
      } catch (error) {
        console.error('Error loading case:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workspaceId, caseId, getCase]);
  const refreshCaseData = useCallback(async () => {
    if (!workspaceId || !caseId) return;

    try {
      const { db } = await import('@/config/firebase.js');
      const doc = await db
        .collection('workspaces')
        .doc(workspaceId)
        .collection('cases')
        .doc(caseId)
        .get();
      if (doc.exists) {
        setCaseData({ id: doc.id, ...doc.data() });
      }
    } catch (err) {
      console.error('refreshCaseData error:', err);
    }
  }, [workspaceId, caseId]);

  const saveBlocks = useCallback(async () => {
    if (!workspaceId || !caseId) return;

    try {
      setSavingBlocks(true);
      await storage.updateCase(workspaceId, caseId, {
        legalBlocks: legalBlocks.sort((a, b) => a.order - b.order),
      });
      setCaseData((prev) => (prev ? { ...prev, legalBlocks } : null));
    } catch (error) {
      console.error('Error saving legal blocks:', error);
    } finally {
      setSavingBlocks(false);
    }
  }, [workspaceId, caseId, legalBlocks]);

  const updateBlockTypes = useCallback((newTypes) => {
    setBlockTypes(newTypes);
    localStorage.setItem('lb_block_types', JSON.stringify(newTypes));
  }, []);

  const handleSaveTask = useCallback(async () => {
    if (!taskFormData.title.trim()) {
      alert('اسم المهمة مطلوب');
      return;
    }

    try {
      setSavingTask(true);
      if (editingTask) {
        await storage.updateTask(workspaceId, editingTask.id, {
          title: taskFormData.title,
          dueDate: taskFormData.dueDate,
          priority: taskFormData.priority,
          description: taskFormData.description,
        });
        setTasks(tasks.map((task) => (task.id === editingTask.id ? { ...editingTask, ...taskFormData } : task)));
      } else {
        const newTask = {
          caseId,
          title: taskFormData.title,
          dueDate: taskFormData.dueDate,
          priority: taskFormData.priority,
          description: taskFormData.description,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        await storage.createTask(workspaceId, newTask);
        const updated = await storage.listTasks(workspaceId, { caseId: caseData.id });
        setTasks((Array.isArray(updated) ? updated : []).filter((task) => !isInspectionTask(task)));
      }
      setTaskFormData({ title: '', dueDate: '', priority: 'medium', description: '' });
      setEditingTask(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('حدث خطأ أثناء حفظ المهمة');
    } finally {
      setSavingTask(false);
    }
  }, [taskFormData, editingTask, tasks, workspaceId, caseId, caseData]);

  const handleDeleteTask = useCallback(async (taskId) => {
    const proceed = await confirmDialog('هل أنت متأكد من حذف هذه المهمة؟', {
      title: 'تأكيد الحذف',
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!proceed) return;

    try {
      setSavingTask(true);
      await storage.deleteTask(workspaceId, taskId);
      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('حدث خطأ أثناء حذف المهمة');
    } finally {
      setSavingTask(false);
    }
  }, [tasks, workspaceId]);

  const handleToggleTaskComplete = useCallback(async (task) => {
    try {
      setSavingTask(true);
      await storage.updateTask(workspaceId, task.id, { completed: !task.completed });
      setTasks(tasks.map((item) => (item.id === task.id ? { ...item, completed: !item.completed } : item)));
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setSavingTask(false);
    }
  }, [tasks, workspaceId]);

  const handleAddLocalFile = useCallback(async () => {
    try {
      const { default: localFileIndex } = await import('@/services/LocalFileIndex.js');
      const file = await localFileIndex.pickFile(
        'image/*,application/pdf,.doc,.docx,.xls,.xlsx'
      );
      if (!file) return;
      const localId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const saved = await localFileIndex.saveFile(localId, file);
      if (!saved) {
        alert('فشل حفظ الملف محلياً');
        return;
      }
      const newAttachments = [...(caseData.attachments || []), {
        url: '',
        title: file.name,
        localId,
        kind: 'local',
        addedAt: new Date().toISOString(),
      }];
      await storage.updateCase(workspaceId, caseId, { attachments: newAttachments });
      setCaseData((prev) => (prev ? { ...prev, attachments: newAttachments } : null));
    } catch (error) {
      console.error('Error adding local file:', error);
    }
  }, [caseData, workspaceId, caseId]);


  const handleSaveAttachment = useCallback(async (record) => {
    if (!record) return;
    try {
      setSavingTask(true);
      const newAttachments = [...(caseData.attachments || []), record];
      await storage.updateCase(workspaceId, caseId, { attachments: newAttachments });
      setCaseData((prev) => (prev ? { ...prev, attachments: newAttachments } : null));

      // Pro: enqueue cloud sync in background (non-blocking)
      if (record.localId) {
        import('@/services/CloudSyncService.js').then(({ default: cloudSync }) => {
          cloudSync.enqueue(workspaceId, caseId, record.id, record.localId);
        });
      }

      // Auto-log if attachment type requires it
      if (record.autoLogged && record.logTemplate) {
        const logEntry = {
          date: record.sessionDate || new Date().toISOString().split('T')[0],
          action: record.logTemplate,
          attachmentId: record.id,
          attachmentType: record.attachmentType,
          createdAt: new Date().toISOString(),
        };
        await storage.updateCase(workspaceId, caseId, {
          sessionsHistory: firebase.firestore.FieldValue.arrayUnion(logEntry),
        });
        setCaseData((prev) => prev ? {
          ...prev,
          sessionsHistory: [...(prev.sessionsHistory || []), logEntry],
        } : null);
      }
    } catch (error) {
      console.error('Error saving attachment:', error);
      alert('حدث خطأ أثناء حفظ المرفق');
    } finally {
      setSavingTask(false);
    }
  }, [caseData, workspaceId, caseId]);

  const handleAddAttachment = useCallback(async () => {
    if (!newAttachmentUrl.trim()) {
      alert('الرابط/الملف مطلوب');
      return;
    }

    try {
      setSavingTask(true);
      const newAttachments = [...(caseData.attachments || []), {
        url: newAttachmentUrl,
        title: newAttachmentTitle || 'مرفق جديد',
        addedAt: new Date().toISOString(),
      }];
      await storage.updateCase(workspaceId, caseId, { attachments: newAttachments });
      setCaseData((prev) => (prev ? { ...prev, attachments: newAttachments } : null));
      setNewAttachmentUrl('');
      setNewAttachmentTitle('');
      setShowAttachmentForm(false);
    } catch (error) {
      console.error('Error adding attachment:', error);
      alert('حدث خطأ أثناء إضافة المرفق');
    } finally {
      setSavingTask(false);
    }
  }, [newAttachmentUrl, newAttachmentTitle, caseData, workspaceId, caseId]);

  const handleDeleteAttachment = useCallback(async (index) => {
    const proceed = await confirmDialog('هل أنت متأكد من حذف هذا المرفق؟', {
      title: 'تأكيد الحذف',
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!proceed) return;

    try {
      setSavingTask(true);
      const attachmentToDelete = (caseData.attachments || [])[index];
      // Clean local IndexedDB if local file
      if (attachmentToDelete?.localId) {
        const { default: localFileIndex } = await import('@/services/LocalFileIndex.js');
        await localFileIndex.removeFile(attachmentToDelete.localId);
      }
      const newAttachments = (caseData.attachments || []).filter(
        (_, attachmentIndex) => attachmentIndex !== index
      );
      await storage.updateCase(workspaceId, caseId, { attachments: newAttachments });
      setCaseData((prev) => (prev ? { ...prev, attachments: newAttachments } : null));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('حدث خطأ أثناء حذف المرفق');
    } finally {
      setSavingTask(false);
    }
  }, [caseData, workspaceId, caseId]);

  const handleAddSession = useCallback(async () => {
    if (!sessionFormData.date) {
      alert('تاريخ الجلسة مطلوب');
      return;
    }

    try {
      setSavingTask(true);
      const newSession = {
        date: sessionFormData.date,
        sessionResult: sessionFormData.sessionResult,
        notes: sessionFormData.notes,
      };
      const routingUpdate = getJudgmentReservationCaseUpdate(sessionFormData.sessionResult) || {};
      await storage.updateCase(workspaceId, caseId, {
        sessionsHistory: firebase.firestore.FieldValue.arrayUnion(newSession),
        ...routingUpdate,
      });
      // WIRE-1: Evaluate rules after mutation
      const updatedCase = await getCase(workspaceId, caseId);
      if (updatedCase && evaluateRules) { await evaluateRules(workspaceId, updatedCase); }
      setCaseData((prev) => (prev ? { ...prev, sessionsHistory: [...(prev.sessionsHistory || []), newSession], ...routingUpdate } : null));
      setSessionFormData({ date: '', sessionResult: '', notes: '' });
      setShowSessionForm(false);
    } catch (error) {
      console.error('Error adding session:', error);
      alert('حدث خطأ أثناء إضافة الجلسة');
    } finally {
      setSavingTask(false);
    }
  }, [sessionFormData, caseData, workspaceId, caseId]);

  const handleAddJudgment = useCallback(async () => {
    if (!judgmentFormData.date) {
      alert('تاريخ الحكم مطلوب');
      return;
    }

    try {
      setSavingTask(true);
      const newJudgment = {
        id: `judgment_${Date.now()}`,
        caseId,
        caseNumber: caseData?.caseNumber || '',
        caseYear: caseData?.caseYear || '',
        plaintiffName: caseData?.plaintiffName || caseData?.clientName || '',
        defendantName: caseData?.defendantName || '',
        court: caseData?.court || '',
        date: judgmentFormData.date,
        judgmentDate: judgmentFormData.date,
        pronouncementDate: judgmentFormData.date,
        decision: judgmentFormData.decision,
        summary: judgmentFormData.summary,
        judgmentType: JUDGMENT_TYPE.OTHER,
        summaryDecision: judgmentFormData.decision || '',
        judgmentCategory: JUDGMENT_TYPE.OTHER,
        judgmentSummary: judgmentFormData.summary || '',
        judgmentPronouncement: '',
        originSessionType: String(getDerivedCaseSessionType(caseData)).trim(),
        originSessionDate: String(caseData?.lastSessionDate || caseData?.nextSessionDate || '').trim(),
        isFinal: true,
        isPlaintiff: Boolean(caseData?.flags?.isPlaintiff),
        appealDeadlineDays: 0,
        appealDeadlineDate: '',
        executionStatus: EXECUTION_STATUS.PENDING,
        attachmentUrl: '',
        notes: '',
        nextAction: '',
        createdAt: new Date().toISOString(),
      };
      await storage.createJudgment?.(workspaceId, newJudgment);
      await storage.updateCase(workspaceId, caseId, {
        agendaRoute: 'judgments',
        status: CASE_STATUS.JUDGED,
      });
      // WIRE-1: Evaluate rules after mutation
      const updatedCase = await getCase(workspaceId, caseId);
      if (updatedCase && evaluateRules) { await evaluateRules(workspaceId, updatedCase); }
      setJudgments([...judgments, newJudgment]);
      setCaseData((prev) => (prev ? { ...prev, agendaRoute: 'judgments', status: CASE_STATUS.JUDGED } : null));
      setJudgmentFormData({ date: '', decision: '', summary: '' });
      setShowJudgmentForm(false);
    } catch (error) {
      console.error('Error adding judgment:', error);
      alert('حدث خطأ أثناء إضافة الحكم');
    } finally {
      setSavingTask(false);
    }
  }, [judgmentFormData, judgments, caseId, workspaceId]);

  const timelineEvents = useMemo(() => {
    const events = [];

    if (caseData?.sessionsHistory) {
      caseData.sessionsHistory.forEach((session) => {
        events.push({
          date: session.date,
          type: 'session',
          title: 'جلسة',
          content: session.sessionResult || session.description || '—',
          data: session,
        });
      });
    }

    judgments.forEach((judgment) => {
      events.push({
        date: judgment.date,
        type: 'judgment',
        title: 'حكم',
        content: judgment.decision || judgment.summary || '—',
        data: judgment,
      });
    });

    tasks
      .filter((task) => task.dueDate)
      .forEach((task) => {
        events.push({
          date: task.dueDate,
          type: 'task',
          title: 'مهمة',
          content: task.title || '—',
          data: task,
        });
      });

    return events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [caseData, judgments, tasks]);

  const caseProcedures = useMemo(() => {
    const technicalOptions = Array.isArray(procedureOptions?.technical) ? procedureOptions.technical : [];
    const mapped = (Array.isArray(caseData?.caseProcedures) ? caseData.caseProcedures : []).map((entry) => ({
      ...entry,
      procedureCategory: entry?.procedureCategory || inferProcedureCategory(entry?.procedureType, technicalOptions),
    }));
    return sortProceduresDescending(mapped);
  }, [caseData, procedureOptions]);

  const saveProcedureOptions = useCallback(async ({ technical, administrative }) => {
    if (!workspaceId) throw new Error('workspace_required');

    const technicalCleaned = Array.from(new Set(
      (Array.isArray(technical) ? technical : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    ));
    const administrativeCleaned = Array.from(new Set(
      (Array.isArray(administrative) ? administrative : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    ));

    if (!technicalCleaned.length || !administrativeCleaned.length) {
      throw new Error('procedure_options_required');
    }

    await Promise.all([
      storage.saveWorkspaceOptions(workspaceId, 'caseProceduresTechnical', technicalCleaned),
      storage.saveWorkspaceOptions(workspaceId, 'caseProceduresAdministrative', administrativeCleaned),
    ]);

    setProcedureOptions({
      technical: technicalCleaned,
      administrative: administrativeCleaned,
    });
  }, [workspaceId]);

  const addCaseProcedure = useCallback(async ({ procedureCategory, procedureType, procedureNumber, procedureDescription, procedureDate, sessionDate, notes, attachments }) => {
    if (!workspaceId || !caseId) throw new Error('context_required');
    if (!String(procedureCategory || '').trim()) throw new Error('procedure_category_required');
    if (!String(procedureType || '').trim()) throw new Error('procedure_type_required');
    if (!String(procedureDate || '').trim()) throw new Error('procedure_date_required');

    const nextProcedure = {
      id: `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      procedureCategory: String(procedureCategory || '').trim(),
      procedureType: String(procedureType || '').trim(),
      procedureNumber: String(procedureNumber || '').trim(),
      procedureDescription: String(procedureDescription || '').trim(),
      procedureDate: String(procedureDate || '').trim(),
      sessionDate: String(sessionDate || '').trim(),
      notes: String(notes || '').trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: new Date().toISOString(),
    };

    const nextProcedures = sortProceduresDescending([
      ...(Array.isArray(caseData?.caseProcedures) ? caseData.caseProcedures : []),
      nextProcedure,
    ]);

    await storage.updateCase(workspaceId, caseId, {
      caseProcedures: nextProcedures,
      updatedAt: new Date().toISOString(),
    });

    setCaseData((prev) => (prev ? { ...prev, caseProcedures: nextProcedures } : prev));
  }, [workspaceId, caseId, caseData]);

  const deleteCaseProcedure = useCallback(async (procedureId) => {
    if (!workspaceId || !caseId || !procedureId) return;

    const nextProcedures = sortProceduresDescending(
      (Array.isArray(caseData?.caseProcedures) ? caseData.caseProcedures : []).filter((entry) => entry?.id !== procedureId)
    );

    await storage.updateCase(workspaceId, caseId, {
      caseProcedures: nextProcedures,
      updatedAt: new Date().toISOString(),
    });

    setCaseData((prev) => (prev ? { ...prev, caseProcedures: nextProcedures } : prev));
  }, [workspaceId, caseId, caseData]);

  const lastSession = (caseData?.sessionsHistory || []).length > 0
    ? [...(caseData.sessionsHistory || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0]
    : null;

  return {
    caseData,
    setCaseData,
    loading,
    setLoading,
    activeTab,
    setActiveTab,
    showEditForm,
    setShowEditForm,
    saving,
    setSaving,
    tasks,
    setTasks,
    judgments,
    setJudgments,
    legalBlocks,
    setLegalBlocks,
    blockTypes,
    setBlockTypes,
    showBlockTypesManager,
    setShowBlockTypesManager,
    editingBlockId,
    setEditingBlockId,
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
    procedureOptions,
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
    handleAddLocalFile,
    handleDeleteTask,
    handleToggleTaskComplete,
    handleAddAttachment,
    handleSaveAttachment,
    handleDeleteAttachment,
    handleAddSession,
    handleAddJudgment,
    timelineEvents,
    caseProcedures,
    saveProcedureOptions,
    addCaseProcedure,
    deleteCaseProcedure,
    lastSession,
    workspaceId,
    refreshCaseData,
  };
}

