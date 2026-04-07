import { useEffect, useState } from 'react';
import storage from '@/data/Storage.js';
import {
  CASE_FLAGS_DEFAULT,
  CASE_STATUS,
  CUSTOM_FIELD_TYPES,
  LITIGATION_STAGE_OPTIONS,
} from '@/core/Constants.js';
import { normalizeCaseNumberFields, normalizeStoredDate } from '@/utils/caseUtils.js';
import { getJudgmentReservationCaseUpdate } from '@/workflows/SessionRollover.js';

const ROLE_CAPACITY_OPTIONS = ['مدعين / طاعنين', 'مدعى علينا / مطعون ضدنا', 'لا شأن'];
const FILE_LOCATION_OPTIONS = ['في المكتب','غير موجود', 'في البيت'];
const FILE_STATUS_OPTIONS = [
  { value: 'original', label: 'ملف أصلي' },
  { value: 'temporary', label: 'ملف مؤقت' },
  { value: 'joined', label: 'ملف منضم' },
  { value: 'incomplete', label: 'ملف غير كامل' },
];

const AGENDA_ROUTE_OPTIONS = [
  { value: 'sessions', label: 'أجندة الجلسات' },
  { value: 'judgments', label: 'أجندة الأحكام' },
  { value: 'chamber', label: 'شعبة' },
  { value: 'referred', label: 'محال' },
  { value: 'inquiry', label: 'استعلام' },
];

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديدة' },
  { value: 'active', label: 'نشطة - متداولة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'reserved_for_judgment', label: 'محجوزة للحكم' },
  { value: 'judged', label: 'محكوم فيها' },
  { value: 'appeal_window_open', label: 'نافذة الطعن مفتوحة' },
  { value: 'suspended', label: 'موقوفة - وقف جزائي' },
  { value: 'struck_out', label: 'مشطوبة' },
  { value: 'archived', label: 'مؤرشفة' },
];

const TAB_OPTIONS = ['البيانات الأساسية', 'بيانات إجرائية', 'الجلسات والمسار', 'بيانات إضافية'];

const FIELD_OPTION_CONFIG = {
  litigationStage: { optionType: 'litigationStages', stateKey: 'litigationStages', title: 'إدارة خيارات مرحلة التقاضي', label: 'مرحلة التقاضي', empty: 'لا توجد مراحل تقاضي محفوظة' },
  fileLocation: { optionType: 'fileLocations', stateKey: 'fileLocations', title: 'إدارة خيارات مكان الملف', label: 'مكان الملف', empty: 'لا توجد أماكن ملفات محفوظة' },
  procedureTrack: { optionType: 'procedureTracks', stateKey: 'procedureTracks', title: 'إدارة خيارات نوع الدعوى', label: 'نوع الدعوى', empty: 'لا توجد أنواع دعاوى محفوظة' },
  fileStatus: { optionType: 'fileStatuses', stateKey: 'fileStatuses', title: 'إدارة خيارات حالة الملف', label: 'حالة الملف', empty: 'لا توجد حالات ملفات محفوظة' },
};

function normalizeOptions(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeWithDefaults(defaultItems, workspaceItems) {
  const defaults = normalizeOptions(defaultItems);
  const custom = normalizeOptions(workspaceItems);
  return normalizeOptions([...defaults, ...custom]);
}

function mergeOptionRecords(defaultItems, workspaceItems) {
  const defaults = (Array.isArray(defaultItems) ? defaultItems : []).map(item => ({ value: item.value, label: item.label }));
  const seen = new Set(defaults.flatMap((item) => [item.value.toLowerCase(), item.label.toLowerCase()]));
  const custom = normalizeOptions(workspaceItems)
    .filter((item) => !seen.has(item.toLowerCase()))
    .map((item) => ({ value: item, label: item }));
  return [...defaults, ...custom];
}

function FieldLabelWithManage({ label, onManage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
      <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
      <button
        type="button"
        className="btn-secondary"
        style={{ padding: '2px 8px', fontSize: 11, color: 'var(--primary)', borderColor: '#fed7aa', background: '#fff7ed', fontWeight: 600 }}
        onClick={onManage}
      >
        ⚙️ إدارة
      </button>
    </div>
  );
}

export default function CaseForm({ caseData = null, onSave, onCancel, workspaceId, compact = false }) {
  const isNewCase = !caseData?.id;
  const normalizedCase = normalizeCaseNumberFields(caseData?.caseNumber || '', caseData?.caseYear || '');
  
  const [activeTab, setActiveTab] = useState('البيانات الأساسية');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [showAdvancedRoute, setShowAdvancedRoute] = useState(false);
  const [showFirstInstance, setShowFirstInstance] = useState(Boolean(caseData?.firstInstanceNumber || caseData?.firstInstanceCourt));
  const [showExtraParties, setShowExtraParties] = useState(Boolean(caseData?.defendantAddress || caseData?.chosenHeadquarters || caseData?.otherDefendants?.length > 0));

  const [optionsModalConfig, setOptionsModalConfig] = useState(null);
  const [optionsEditorItems, setOptionsEditorItems] = useState([]);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [optionsSaving, setOptionsSaving] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [workspaceOptions, setWorkspaceOptions] = useState({
    litigationStages: LITIGATION_STAGE_OPTIONS,
    fileLocations: FILE_LOCATION_OPTIONS,
    procedureTracks: [],
    fileStatuses: [],
  });
  const [workspaceDefaults, setWorkspaceDefaults] = useState({});
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  
  const [form, setForm] = useState({
    ...normalizedCase,
    caseYear: normalizedCase.caseYear || new Date().getFullYear().toString(),
    plaintiffName: caseData?.plaintiffName || '',
    defendantName: caseData?.defendantName || '',
    court: caseData?.court || workspaceDefaults.defaultCourt || '',
    circuit: caseData?.circuit || workspaceDefaults.defaultCircuit || '',
    roleCapacity: caseData?.roleCapacity || 'مدعين / طاعنين',
    procedureTrack: caseData?.procedureTrack || workspaceDefaults.defaultProcedureTrack || '',
    title: caseData?.title || '',
    filingDate: caseData?.filingDate || '',
    lastSessionDate: caseData?.lastSessionDate || '',
    sessionResult: caseData?.sessionResult || '',
    nextSessionDate: caseData?.nextSessionDate || '',
    nextSessionType: caseData?.nextSessionType || '',
    litigationStage: caseData?.litigationStage || '',
    agendaRoute: caseData?.agendaRoute || 'sessions',
    fileLocation: caseData?.fileLocation || '',
    fileStatus: caseData?.fileStatus || '',
    status: caseData?.status || 'active',
    judge: caseData?.judge || workspaceDefaults.defaultJudge || '',
    firstInstanceNumber: caseData?.firstInstanceNumber || '',
    firstInstanceCourt: caseData?.firstInstanceCourt || '',
    firstInstanceDate: caseData?.firstInstanceDate || '',
    firstInstanceJudgment: caseData?.firstInstanceJudgment || '',
    defendantAddress: caseData?.defendantAddress || '',
    joinedCases: Array.isArray(caseData?.joinedCases) ? caseData.joinedCases : [],
    otherDefendants: Array.isArray(caseData?.otherDefendants) ? caseData.otherDefendants : [],
    chosenHeadquarters: caseData?.chosenHeadquarters || '',
    notes: caseData?.notes || '',
    customFields: caseData?.customFields || {},
  });

  const mergedLitigationStageOptions = mergeWithDefaults(LITIGATION_STAGE_OPTIONS, workspaceOptions.litigationStages);
  const mergedFileLocationOptions = mergeWithDefaults(FILE_LOCATION_OPTIONS, workspaceOptions.fileLocations);
  const mergedProcedureTrackOptions = mergeOptionRecords([], workspaceOptions.procedureTracks);
  const mergedFileStatusOptions = mergeOptionRecords(FILE_STATUS_OPTIONS, workspaceOptions.fileStatuses);

  useEffect(() => {
    async function loadOptions() {
      if (!workspaceId) return;
      try {
        const [litigationStages, fileLocations, procedureTracks, fileStatuses, loadedWorkspaceDefaults] = await Promise.all([
          storage.getWorkspaceOptions(workspaceId, 'litigationStages'),
          storage.getWorkspaceOptions(workspaceId, 'fileLocations'),
          storage.getWorkspaceOptions(workspaceId, 'procedureTracks'),
          storage.getWorkspaceOptions(workspaceId, 'fileStatuses'),
          storage.getWorkspaceSettings(workspaceId),
        ]);
        setWorkspaceOptions({
          litigationStages: normalizeOptions(litigationStages),
          fileLocations: normalizeOptions(fileLocations),
          procedureTracks: normalizeOptions(procedureTracks),
          fileStatuses: normalizeOptions(fileStatuses),
        });
        const defaults = loadedWorkspaceDefaults || {};
        setWorkspaceDefaults(defaults);
        setCustomFieldDefs(Array.isArray(defaults.customFieldDefinitions) ? defaults.customFieldDefinitions : []);
      } catch (err) {
        console.error('Failed to load workspace options:', err);
      }
    }
    loadOptions();
  }, [workspaceId]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const setCustomFieldValue = (fieldId, value) => {
    setForm((prev) => ({ ...prev, customFields: { ...prev.customFields, [fieldId]: value } }));
  };

  const handleJoinedCaseChange = (index, value) => {
    const newJoined = [...form.joinedCases];
    newJoined[index] = value;
    setField('joinedCases', newJoined);
  };
  const addJoinedCase = () => setField('joinedCases', [...form.joinedCases, '']);
  const removeJoinedCase = (index) => setField('joinedCases', form.joinedCases.filter((_, i) => i !== index));

  const handleOtherDefendantChange = (index, fieldKey, value) => {
    const newOthers = [...form.otherDefendants];
    newOthers[index] = { ...newOthers[index], [fieldKey]: value };
    setField('otherDefendants', newOthers);
  };
  const addOtherDefendant = () => setField('otherDefendants', [...form.otherDefendants, { name: '', address: '' }]);
  const removeOtherDefendant = (index) => setField('otherDefendants', form.otherDefendants.filter((_, i) => i !== index));

  const openOptionsManager = (fieldName) => {
    const config = FIELD_OPTION_CONFIG[fieldName];
    if (!config) return;
    const sourceOptions = {
      litigationStages: mergedLitigationStageOptions,
      fileLocations: mergedFileLocationOptions,
      procedureTracks: mergedProcedureTrackOptions.map((opt) => opt.label),
      fileStatuses: mergedFileStatusOptions.map((opt) => opt.label),
    };
    setOptionsModalConfig({ fieldName, ...config });
    setOptionsEditorItems([...(sourceOptions[config.stateKey] || [])]);
    setNewOptionValue('');
    setOptionsError('');
  };

  const closeOptionsManager = () => {
    setOptionsModalConfig(null);
    setOptionsEditorItems([]);
  };

  const handleAddOption = () => {
    const value = String(newOptionValue || '').trim();
    if (!value) return;
    if (optionsEditorItems.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setOptionsError('هذا الخيار موجود بالفعل');
      return;
    }
    setOptionsEditorItems((prev) => [...prev, value]);
    setNewOptionValue('');
    setOptionsError('');
  };

  const handleDeleteOption = (itemToDelete) => {
    setOptionsEditorItems((prev) => prev.filter((item) => item !== itemToDelete));
  };

  const handleSaveOptions = async () => {
    if (!optionsModalConfig || !workspaceId) return closeOptionsManager();
    const items = normalizeOptions(optionsEditorItems);
    setOptionsSaving(true);
    try {
      await storage.saveWorkspaceOptions(workspaceId, optionsModalConfig.optionType, items);
      setWorkspaceOptions((prev) => ({ ...prev, [optionsModalConfig.stateKey]: items }));
      closeOptionsManager();
    } catch (saveError) {
      setOptionsError(saveError?.message || 'تعذر حفظ الخيارات');
    } finally {
      setOptionsSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!String(workspaceId || '').trim()) return setError('مساحة العمل غير محددة');
    if (!String(form.caseNumber || '').trim() || !String(form.caseYear || '').trim()) return setError('رقم القضية والسنة مطلوبان');
    
    const normalized = normalizeCaseNumberFields(form.caseNumber, form.caseYear);
    const payload = {
      ...form,
      caseNumber: normalized.caseNumber,
      caseYear: normalized.caseYear,
      plaintiffName: String(form.plaintiffName || '').trim(),
      defendantName: String(form.defendantName || '').trim(),
      court: String(form.court || '').trim(),
      circuit: String(form.circuit || '').trim(),
      roleCapacity: String(form.roleCapacity || 'مدعين / طاعنين').trim(),
      procedureTrack: String(form.procedureTrack || '').trim(),
      title: String(form.title || '').trim(),
      filingDate: normalizeStoredDate(form.filingDate),
      lastSessionDate: normalizeStoredDate(form.lastSessionDate),
      sessionResult: String(form.sessionResult || '').trim(),
      nextSessionDate: normalizeStoredDate(form.nextSessionDate),
      nextSessionType: String(form.nextSessionType || '').trim(),
      litigationStage: String(form.litigationStage || '').trim(),
      agendaRoute: String(form.agendaRoute || 'sessions').trim(),
      fileLocation: String(form.fileLocation || '').trim(),
      fileStatus: String(form.fileStatus || '').trim(),
      status: String(form.status || 'active').trim(),
      judge: String(form.judge || '').trim(),
      firstInstanceNumber: String(form.firstInstanceNumber || '').trim(),
      firstInstanceCourt: String(form.firstInstanceCourt || '').trim(),
      firstInstanceDate: normalizeStoredDate(form.firstInstanceDate),
      firstInstanceJudgment: String(form.firstInstanceJudgment || '').trim(),
      defendantAddress: String(form.defendantAddress || '').trim(),
      joinedCases: form.joinedCases.map((v) => String(v || '').trim()).filter(Boolean),
      otherDefendants: form.otherDefendants.map((item) => ({ 
        name: String(item?.name || '').trim(), 
        address: String(item?.address || '').trim() 
      })).filter((item) => item.name || item.address),
      chosenHeadquarters: String(form.chosenHeadquarters || '').trim(),
      notes: String(form.notes || '').trim(),
      flags: caseData?.flags || CASE_FLAGS_DEFAULT,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError('');
    try {
      if (isNewCase) {
        await storage.createCase(workspaceId, { ...payload, createdAt: new Date().toISOString() });
      } else {
        await storage.updateCase(workspaceId, caseData.id, payload);
      }
      if (typeof onSave === 'function') await onSave();
    } catch (submitError) {
      setError(submitError?.message || 'تعذر حفظ القضية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: '16px', padding: compact ? '16px' : '24px', position: 'relative' }}>
        
        {/* ✨ Sticky Header المنظم ✨ */}
        <div style={{
          position: 'sticky',
          top: compact ? '-16px' : '-24px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          zIndex: 20,
          margin: compact ? '-16px -16px 16px -16px' : '-24px -24px 16px -24px',
          padding: compact ? '16px 16px 0 16px' : '24px 24px 0 24px',
          borderBottom: '1px solid var(--border)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* الصف الأول: زراير الحفظ السريع */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '6px 16px', fontSize: '13px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}>
              {saving ? 'جارٍ الحفظ...' : (caseData?.id ? '💾 حفظ التعديلات' : '💾 إضافة')}
            </button>
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving} style={{ padding: '6px 12px', fontSize: '13px' }}>
              إلغاء
            </button>
          </div>

          {/* الصف الثاني: التبويبات واخدة العرض كله ومتوزعة بالتساوي */}
          <div style={{ display: 'flex', width: '100%', gap: '4px' }}>
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, // دي اللي بتخليهم يتفردوا وميتزنقوش
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Cairo',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? 800 : 500,
                  color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: البيانات الأساسية */}
        {activeTab === 'البيانات الأساسية' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">رقم الدعوى / القضية</label>
                <input className="form-input" required value={form.caseNumber} onChange={(e) => setField('caseNumber', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">لسنة</label>
                <input className="form-input" required value={form.caseYear} onChange={(e) => setField('caseYear', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">المدعي / الطاعن</label>
                <input className="form-input" value={form.plaintiffName} onChange={(e) => setField('plaintiffName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">المدعى عليه الأساسي</label>
                <input className="form-input" value={form.defendantName} onChange={(e) => setField('defendantName', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">صفتنا في الدعوى</label>
              <select className="form-input" value={form.roleCapacity} onChange={(e) => setField('roleCapacity', e.target.value)}>
                {ROLE_CAPACITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.joinedCases.length ? '12px' : '0' }}>
                <label className="form-label" style={{ margin: 0, color: 'var(--text-primary)' }}>🔗 دعاوى منضمة / مرتبطة</label>
                <button type="button" onClick={addJoinedCase} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', background: 'white' }}>
                  + إضافة دعوى
                </button>
              </div>
              {form.joinedCases.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.joinedCases.map((joinedCase, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px' }}>
                      <input className="form-input" placeholder="مثال: 123/2024" value={joinedCase} onChange={(e) => handleJoinedCaseChange(index, e.target.value)} />
                      <button type="button" onClick={() => removeJoinedCase(index)} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '8px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">موضوع الدعوى والطلبات</label>
              <textarea className="form-input" rows={2} value={form.title} onChange={(e) => setField('title', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* Tab 2: بيانات إجرائية */}
        {activeTab === 'بيانات إجرائية' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">تاريخ رفع الدعوى</label>
                <input type="date" className="form-input" value={form.filingDate} onChange={(e) => setField('filingDate', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group managed-options-field">
                <FieldLabelWithManage label="مكان الملف الفعلي" onManage={() => openOptionsManager('fileLocation')} />
                <select className="form-input" value={form.fileLocation} onChange={(e) => setField('fileLocation', e.target.value)}>
                  <option value="">-- اختر المكان --</option>
                  {mergedFileLocationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="form-group managed-options-field">
                <FieldLabelWithManage label="حالة الملف" onManage={() => openOptionsManager('fileStatus')} />
                <select className="form-input" value={form.fileStatus} onChange={(e) => setField('fileStatus', e.target.value)}>
                  <option value="">-- اختر الحالة --</option>
                  {mergedFileStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            {!showExtraParties ? (
              <button type="button" onClick={() => setShowExtraParties(true)} className="btn-secondary" style={{ borderStyle: 'dashed', color: 'var(--text-secondary)' }}>
                + إضافة عناوين أو خصوم آخرين
              </button>
            ) : (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)' }}>العناوين والخصوم</h4>
                  <button type="button" onClick={() => setShowExtraParties(false)} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>إخفاء</button>
                </div>
                
                <div className="form-group">
                  <label className="form-label">عنوان المدعى عليه الأساسي</label>
                  <textarea className="form-input" rows={1} value={form.defendantAddress} onChange={(e) => setField('defendantAddress', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">المقر المختار</label>
                  <input className="form-input" value={form.chosenHeadquarters} onChange={(e) => setField('chosenHeadquarters', e.target.value)} />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>👥 مدعى عليهم آخرون</label>
                    <button type="button" onClick={addOtherDefendant} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', background: 'white' }}>+ إضافة خصم</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {form.otherDefendants.map((defendant, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input className="form-input" placeholder="الاسم" value={defendant.name} onChange={(e) => handleOtherDefendantChange(index, 'name', e.target.value)} />
                        <input className="form-input" placeholder="العنوان" value={defendant.address} onChange={(e) => handleOtherDefendantChange(index, 'address', e.target.value)} />
                        <button type="button" onClick={() => removeOtherDefendant(index)} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '8px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!showFirstInstance ? (
              <button type="button" onClick={() => setShowFirstInstance(true)} className="btn-secondary" style={{ borderStyle: 'dashed', color: 'var(--text-secondary)' }}>
                + إضافة بيانات حكم أول درجة / طعن
              </button>
            ) : (
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#166534' }}>بيانات حكم أول درجة / طعن سابق</h4>
                  <button type="button" onClick={() => setShowFirstInstance(false)} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px', borderColor: '#bbf7d0', background: 'white' }}>إخفاء</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  <div className="form-group"><label className="form-label">رقم أول درجة</label><input className="form-input" value={form.firstInstanceNumber} onChange={(e) => setField('firstInstanceNumber', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">محكمة أول درجة</label><input className="form-input" value={form.firstInstanceCourt} onChange={(e) => setField('firstInstanceCourt', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">تاريخ الحكم</label><input type="date" className="form-input" value={form.firstInstanceDate} onChange={(e) => setField('firstInstanceDate', e.target.value)} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">منطوق الحكم السابق</label>
                  <textarea className="form-input" rows={2} value={form.firstInstanceJudgment} onChange={(e) => setField('firstInstanceJudgment', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: الجلسات والمسار */}
        {activeTab === 'الجلسات والمسار' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            
            <div className="form-group managed-options-field">
              <FieldLabelWithManage label="مرحلة التقاضي الحالية" onManage={() => openOptionsManager('litigationStage')} />
              <select className="form-input" value={form.litigationStage} onChange={(e) => setField('litigationStage', e.target.value)} style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}>
                <option value="">-- اختر مرحلة التقاضي --</option>
                {mergedLitigationStageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            {!isNewCase && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div className="form-group">
                  <label className="form-label">تاريخ آخر جلسة</label>
                  <input type="date" className="form-input" value={form.lastSessionDate} onChange={(e) => setField('lastSessionDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">القرار السابق</label>
                  <input className="form-input" value={form.sessionResult} onChange={(e) => setField('sessionResult', e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">تاريخ الجلسة القادمة</label>
                <input type="date" className="form-input" value={form.nextSessionDate} onChange={(e) => setField('nextSessionDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">نوع الجلسة / المطلوب</label>
                <input className="form-input" value={form.nextSessionType} onChange={(e) => setField('nextSessionType', e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowAdvancedRoute(!showAdvancedRoute)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', border: 'none', background: 'none', color: 'var(--text-secondary)' }}>
                ⚙️ {showAdvancedRoute ? 'إخفاء خيارات المسار المتقدمة' : 'خيارات المسار المتقدمة (تعديل الحالة يدوياً)'}
              </button>
              
              {showAdvancedRoute && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                  <div className="form-group">
                    <label className="form-label">مسار الأجندة (يُعدل تلقائياً)</label>
                    <select className="form-input" value={form.agendaRoute} onChange={(e) => setField('agendaRoute', e.target.value)}>
                      {AGENDA_ROUTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة الأساسية المخفية</label>
                    <select className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                      {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 4: بيانات إضافية */}
        {activeTab === 'بيانات إضافية' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">المحكمة (المنظور أمامها الدعوى)</label>
                <input className="form-input" value={form.court} onChange={(e) => setField('court', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">الدائرة</label>
                <input className="form-input" value={form.circuit} onChange={(e) => setField('circuit', e.target.value)} />
              </div>
            </div>

            <div className="form-group managed-options-field">
              <FieldLabelWithManage label="نوع الدعوى المخصص" onManage={() => openOptionsManager('procedureTrack')} />
              <select className="form-input" value={form.procedureTrack} onChange={(e) => setField('procedureTrack', e.target.value)}>
                <option value="">-- اختر النوع --</option>
                {mergedProcedureTrackOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">القاضي / الهيئة</label>
              <input className="form-input" value={form.judge} onChange={(e) => setField('judge', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات عامة</label>
              <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </div>

            {/* Custom Fields */}
            {customFieldDefs.length > 0 && (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--border)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-primary)' }}>حقول مخصصة (Custom Fields)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {customFieldDefs.map((fieldDef) => (
                    <div key={fieldDef.id} className="form-group">
                      <label className="form-label">
                        {fieldDef.label || 'حقل بدون اسم'}
                        {fieldDef.required && <span style={{ color: 'var(--danger)', marginRight: 4 }}>*</span>}
                      </label>
                      {fieldDef.type === CUSTOM_FIELD_TYPES.BOOLEAN ? (
                        <input type="checkbox" checked={Boolean(form.customFields?.[fieldDef.id])} onChange={(e) => setCustomFieldValue(fieldDef.id, e.target.checked)} />
                      ) : fieldDef.type === CUSTOM_FIELD_TYPES.DATE ? (
                        <input type="date" className="form-input" value={form.customFields?.[fieldDef.id] || ''} onChange={(e) => setCustomFieldValue(fieldDef.id, e.target.value)} />
                      ) : fieldDef.type === CUSTOM_FIELD_TYPES.NUMBER ? (
                        <input type="number" className="form-input" value={form.customFields?.[fieldDef.id] || ''} onChange={(e) => setCustomFieldValue(fieldDef.id, e.target.value)} />
                      ) : fieldDef.type === CUSTOM_FIELD_TYPES.DROPDOWN ? (
                        <select className="form-input" value={form.customFields?.[fieldDef.id] || ''} onChange={(e) => setCustomFieldValue(fieldDef.id, e.target.value)}>
                          <option value="">-- اختر --</option>
                          {Array.isArray(fieldDef.options) && fieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input type="text" className="form-input" value={form.customFields?.[fieldDef.id] || ''} onChange={(e) => setCustomFieldValue(fieldDef.id, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error ? <div className="empty-state" style={{ color: '#b91c1c', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</div> : null}
      </form>

      <style>{`.managed-options-field > .form-label { display: none; }`}</style>

      {/* Modal: إدارة الخيارات */}
      {optionsModalConfig ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{optionsModalConfig.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>يمكنك إضافة أو حذف خيارات {optionsModalConfig.label}</div>
              </div>
              <button type="button" className="btn-secondary" style={{ padding: '4px 10px' }} onClick={closeOptionsManager}>إغلاق</button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {optionsEditorItems.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>{optionsModalConfig.empty}</div>
              ) : optionsEditorItems.map((item) => (
                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item}</span>
                  <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12, color: '#b91c1c', borderColor: '#fecaca', background: '#fff5f5' }} onClick={() => handleDeleteOption(item)}>حذف</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
              <div>
                <label className="form-label">إضافة خيار جديد</label>
                <input className="form-input" value={newOptionValue} onChange={(e) => { setNewOptionValue(e.target.value); if (optionsError) setOptionsError(''); }} placeholder={`أدخل ${optionsModalConfig.label} جديدًا`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }} />
              </div>
              <button type="button" className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddOption}>إضافة</button>
            </div>

            {optionsError ? <div style={{ color: '#b91c1c', fontSize: 13 }}>{optionsError}</div> : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" className="btn-primary" onClick={handleSaveOptions} disabled={optionsSaving}>{optionsSaving ? 'جارٍ الحفظ...' : 'حفظ الخيارات'}</button>
              <button type="button" className="btn-secondary" onClick={closeOptionsManager} disabled={optionsSaving}>إلغاء</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}