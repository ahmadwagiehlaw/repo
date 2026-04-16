import { useEffect, useMemo, useState } from 'react';
import storage from '@/data/Storage.js';
import SmartImporter from '@/components/import/SmartImporter.jsx';
import DataExporter from '@/components/export/DataExporter.jsx';
import FeatureGate from '@/components/ui/FeatureGate.jsx';
import auditLogger, { ACTION_TYPES } from '@/services/AuditLogger.js';
import subscriptionManager from '@/services/SubscriptionManager.js';
import {
  LITIGATION_STAGE_OPTIONS,
  PROCEDURE_TRACK,
  PROCEDURE_TRACK_LABELS,
  CUSTOM_FIELD_TYPES,
  MAX_CUSTOM_FIELDS,
  LAWBASE_EVENTS,
} from '@/core/Constants.js';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { setDisplaySettings } from '@/utils/caseUtils.js';
import { confirmDialog, promptDialog } from '@/utils/browserFeedback.js';
import cloudSyncService from '@/services/CloudSyncService.js';

const SETTINGS_TABS = [
  { id: 'general', label: '⚙️ عام', desc: 'اسم المساحة والهوية', group: 1 },
  { id: 'cases', label: '⚖️ القضايا', desc: 'إعدادات القضايا والمحاكم', group: 1 },
  { id: 'display', label: '📐 التنسيق', desc: 'تنسيق التواريخ والأرقام', group: 1 },
  { id: 'automation', label: '🤖 الأتمتة', desc: 'القواعد والتذكيرات التلقائية', group: 2 },
  { id: 'options', label: '📋 الخيارات', desc: 'قوائم الاختيار', group: 2 },
  { id: 'appearance', label: '🎨 المظهر', desc: 'الألوان والعرض', group: 2 },
  { id: 'sync', label: '☁️ المزامنة', desc: 'إعدادات المزامنة السحابية', group: 2 },
  { id: 'import', label: '📥 البيانات', desc: 'استيراد وتصدير البيانات', group: 3 },
  { id: 'members', label: '👥 الأعضاء', desc: 'إدارة الفريق', group: 3 },
  { id: 'subscription', label: '⭐ اشتراكي', desc: 'خطتك والاستخدام الحالي', group: 3 },
  { id: 'audit', label: '🔍 التدقيق', desc: 'سجل العمليات', group: 3 },
  { id: 'admin', label: '👑 الأدمن', desc: 'إدارة الاشتراكات', group: 3 },
].filter((tab) => tab.id !== 'admin');

const DISPLAY_FORMAT_OPTIONS = [
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM',
  'D MMMM',
  'D MMMM YYYY',
];

const MEMBER_ROLE_OPTIONS = [
  { value: 'admin', label: 'مدير' },
  { value: 'lawyer', label: 'محامي' },
  { value: 'secretary', label: 'سكرتير' },
  { value: 'readonly', label: 'للاطلاع فقط' },
];

const MEMBER_ROLE_LABELS = {
  admin: 'مدير',
  lawyer: 'محامي',
  secretary: 'سكرتير',
  readonly: 'للاطلاع فقط',
};

function getDateFormatOptionLabel(format) {
  return ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM'].includes(format)
    ? `\u200E${format}`
    : format;
}

function normalizeDisplaySettings(settings = {}) {
  const useArabicNumerals = Boolean(settings.useArabicNumerals ?? settings.arabicNumerals ?? false);
  const caseNumberDisplayFormat = settings.caseNumberDisplayFormat
    || (settings.caseNumberDisplayOrder === 'number-first' ? 'number-sanah-year' : 'year-slash-number');
  const dateDisplayFormat = settings.dateDisplayFormat || settings.dateFormat || 'DD/MM/YYYY';

  return {
    ...settings,
    useArabicNumerals,
    arabicNumerals: useArabicNumerals,
    caseNumberDisplayFormat,
    dateDisplayFormat,
    dateFormat: dateDisplayFormat,
  };
}

function normalizeWorkspaceConfirmationName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ar-EG');
}

function splitKeywords(value) {
  return String(value || '')
    .split(/[,\u060C]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

const OPTION_TYPES = [
  {
    key: 'courts',
    label: 'المحاكم',
    icon: '🏛️',
    defaults: [
      'محكمة جنوب القاهرة الابتدائية',
      'محكمة شمال القاهرة الابتدائية',
      'محكمة استئناف القاهرة',
      'محكمة القضاء الإداري',
      'المحكمة التأديبية',
      'المحكمة الإدارية العليا',
      'محكمة الجنايات',
      'محكمة الأسرة',
      'محكمة النقض',
      'محكمة الجنايات',
    ],
  },
  {
    key: 'roles',
    label: 'الصفات والمراكز',
    icon: '⚖️',
    defaults: [
      'مدعٍ',
      'مدعى عليه',
      'طاعن',
      'مطعون ضده',
      'مستأنف',
      'مستأنف ضده',
      'ملتمس',
      'ملتمس ضده',
      'محكوم عليه',
      'مدعٍ بالحق المدني',
    ],
  },
  {
    key: 'sessionDecisions',
    label: 'قرارات الجلسات',
    icon: '📋',
    defaults: [
      'للإعلان',
      'للاطلاع',
      'للحكم',
      'حجز للحكم',
      'تأجيل للمرافعة',
      'شطب',
      'إحالة للتحقيق',
      'تقرير مفوضين',
      'وقف جزائي',
      'إعادة إعلان',
    ],
  },
  {
    key: 'sessionTypes',
    label: 'أنواع الجلسات',
    icon: '📅',
    defaults: ['فحص', 'موضوع', 'مفوضين', 'تقرير', 'حكم', 'جديد', 'متداول', 'إعادة مرافعة'],
  },
  {
    key: 'fileLocations',
    label: 'مواقع الملف',
    icon: '📁',
    defaults: ['في المكتب', 'لدى المحكمة', 'مصور', 'غير موجود', 'لا شأن', 'Available'],
  },
  {
    key: 'litigationStages',
    label: 'مراحل التقاضي',
    icon: '📊',
    defaults: LITIGATION_STAGE_OPTIONS,
  },
];

const SETTINGS_OPTION_TYPES = OPTION_TYPES.map((optionType) => (
  optionType.key === 'litigationStages'
    ? { ...optionType, defaults: LITIGATION_STAGE_OPTIONS }
    : optionType
));

const WORKSPACE_DEFAULT_PROCEDURE_TRACK_OPTIONS = [
  { value: '', label: '-- متعدد التخصصات --' },
  { value: PROCEDURE_TRACK.CIVIL, label: PROCEDURE_TRACK_LABELS[PROCEDURE_TRACK.CIVIL] },
  { value: PROCEDURE_TRACK.STATE_COUNCIL, label: PROCEDURE_TRACK_LABELS[PROCEDURE_TRACK.STATE_COUNCIL] },
  { value: PROCEDURE_TRACK.COMMERCIAL, label: PROCEDURE_TRACK_LABELS[PROCEDURE_TRACK.COMMERCIAL] },
  { value: PROCEDURE_TRACK.LABOR, label: PROCEDURE_TRACK_LABELS[PROCEDURE_TRACK.LABOR] },
];

const REMINDER_TARGET_FIELD_OPTIONS = [
  { value: 'caseNumber', label: 'رقم القضية' },
  { value: 'caseYear', label: 'سنة القضية' },
  { value: 'plaintiffName', label: 'اسم المدعي' },
  { value: 'defendantName', label: 'اسم المدعى عليه' },
  { value: 'court', label: 'المحكمة' },
  { value: 'circuit', label: 'الدائرة' },
  { value: 'roleCapacity', label: 'الصفة' },
  { value: 'procedureTrack', label: 'نوع الدعوى' },
  { value: 'title', label: 'موضوع الدعوى' },
  { value: 'filingDate', label: 'تاريخ رفع الدعوى' },
  { value: 'lastSessionDate', label: 'تاريخ آخر جلسة' },
  { value: 'sessionResult', label: 'قرار الجلسة' },
  { value: 'nextSessionDate', label: 'تاريخ الجلسة القادمة' },
  { value: 'nextSessionType', label: 'نوع الجلسة القادمة' },
  { value: 'litigationStage', label: 'مرحلة التقاضي' },
  { value: 'agendaRoute', label: 'مسار الأجندة' },
  { value: 'fileLocation', label: 'مكان الملف' },
  { value: 'fileStatus', label: 'حالة الملف' },
  { value: 'status', label: 'حالة القضية' },
  { value: 'judge', label: 'القاضي / الهيئة' },
  { value: 'defendantAddress', label: 'عنوان المدعى عليه' },
  { value: 'chosenHeadquarters', label: 'المقر المختار' },
  { value: 'firstInstanceNumber', label: 'رقم أول درجة' },
  { value: 'firstInstanceCourt', label: 'محكمة أول درجة' },
  { value: 'firstInstanceDate', label: 'تاريخ حكم أول درجة' },
  { value: 'firstInstanceJudgment', label: 'منطوق حكم أول درجة' },
  { value: 'summaryDecision', label: 'الحكم' },
  { value: 'judgmentCategory', label: 'تصنيف الحكم' },
  { value: 'judgmentPronouncement', label: 'منطوق الحكم' },
  { value: 'notes', label: 'الملاحظات' },
  { value: 'claimAmount', label: 'قيمة المطالبة' },
  { value: 'operationalStatus', label: 'الحالة التشغيلية' },
  { value: 'nextAction', label: 'الإجراء التالي' },
  { value: 'workflowStage', label: 'مرحلة سير العمل' },
];

const CUSTOM_RULE_ROUTE_OPTIONS = [
  { value: 'sessions', label: 'Sessions / الجلسات' },
  { value: 'judgments', label: 'Judgments / الأحكام' },
  { value: 'chamber', label: 'Chamber / الدائرة' },
  { value: 'referred', label: 'Referred / الإحالة' },
  { value: 'archive', label: 'Archive / الأرشيف' },
];

function getCustomFieldReminderOptions(customFieldDefs = []) {
  return (Array.isArray(customFieldDefs) ? customFieldDefs : [])
    .map((field) => {
      const id = String(field?.id || '').trim();
      if (!id) return null;
      return {
        value: `customFields.${id}`,
        label: `حقل مخصص: ${field.label || id}`,
      };
    })
    .filter(Boolean);
}

function createEmptyCustomRule() {
  return {
    id: `crr_${Date.now()}`,
    condition1: {
      field: 'plaintiffName',
      keywords: [],
    },
    condition2: {
      field: 'roleCapacity',
      keywords: [],
      enabled: false,
    },
    actions: {
      createTask: true,
      taskMessage: '',
      updateField: false,
      targetField: 'status',
      newValue: '',
      doRollover: false,
      targetRoute: 'sessions',
    },
  };
}

function normalizeCustomRule(rule, allowedFields, fallbackId = '') {
  const legacyTargetField = String(rule?.targetField || '').trim();
  const condition1Field = String(rule?.condition1?.field || legacyTargetField || 'plaintiffName').trim();
  const condition2Field = String(rule?.condition2?.field || 'roleCapacity').trim();
  const actionTargetField = String(rule?.actions?.targetField || 'status').trim();

  const condition1Keywords = (Array.isArray(rule?.condition1?.keywords)
    ? rule.condition1.keywords
    : Array.isArray(rule?.triggerKeywords)
      ? rule.triggerKeywords
      : splitKeywords(rule?.condition1?.keywords || rule?.triggerKeywords)
  )
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);

  const condition2Keywords = (Array.isArray(rule?.condition2?.keywords)
    ? rule.condition2.keywords
    : splitKeywords(rule?.condition2?.keywords)
  )
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);

  const actions = rule?.actions || {};
  const createTask = Boolean(actions.createTask ?? rule?.reminderMessage);
  const updateField = Boolean(actions.updateField);
  const doRollover = Boolean(actions.doRollover);
  const taskMessage = String(actions.taskMessage ?? rule?.reminderMessage ?? '').trim();
  const newValue = String(actions.newValue ?? '').trim();
  const targetRoute = CUSTOM_RULE_ROUTE_OPTIONS.some((option) => option.value === actions.targetRoute)
    ? actions.targetRoute
    : 'sessions';

  if (!condition1Keywords.length) return null;
  if (createTask && !taskMessage) return null;
  if (updateField && (!allowedFields.has(actionTargetField) || !newValue)) return null;
  if (!createTask && !updateField && !doRollover) return null;

  return {
    id: String(rule?.id || fallbackId || `crr_${Date.now()}`).trim(),
    condition1: {
      field: allowedFields.has(condition1Field) ? condition1Field : 'plaintiffName',
      keywords: condition1Keywords,
    },
    condition2: {
      field: allowedFields.has(condition2Field) ? condition2Field : 'roleCapacity',
      keywords: condition2Keywords,
      enabled: Boolean(rule?.condition2?.enabled) && condition2Keywords.length > 0,
    },
    actions: {
      createTask,
      taskMessage,
      updateField,
      targetField: allowedFields.has(actionTargetField) ? actionTargetField : 'status',
      newValue,
      doRollover,
      targetRoute,
    },
  };
}

function normalizeAutomationSettings(settings = {}, customFieldDefs = []) {
  const identityKeywords = (Array.isArray(settings.identityKeywords)
    ? settings.identityKeywords
    : splitKeywords(settings.identityKeywords)
  )
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);

  const customReminderTargetFields = (Array.isArray(settings.customReminderTargetFields) ? settings.customReminderTargetFields : [])
    .map((field) => {
      const value = String(field?.value || field || '').trim();
      if (!/^[a-zA-Z0-9_.]+$/.test(value)) return null;
      if (['__proto__', 'prototype', 'constructor'].includes(value)) return null;
      return {
        value,
        label: String(field?.label || value).trim() || value,
      };
    })
    .filter(Boolean);
  const customFieldReminderOptions = getCustomFieldReminderOptions(customFieldDefs);

  const allowedFields = new Set([
    ...REMINDER_TARGET_FIELD_OPTIONS.map((option) => option.value),
    ...customFieldReminderOptions.map((option) => option.value),
    ...customReminderTargetFields.map((option) => option.value),
  ]);
  const customReminderRules = (Array.isArray(settings.customReminderRules) ? settings.customReminderRules : [])
    .map((rule, index) => normalizeCustomRule(rule, allowedFields, `crr_${index}_${Date.now()}`))
    .filter(Boolean);

  return {
    ...settings,
    identityKeywords,
    customReminderTargetFields: [...customReminderTargetFields, ...customFieldReminderOptions].filter((field, index, list) => (
      field.value && list.findIndex((item) => item.value === field.value) === index
    )),
    customReminderRules,
  };
}

function normalizeArray(values) {
  return Array.isArray(values) ? values : [];
}

function normalizeTrimmedStringArray(values) {
  return normalizeArray(values)
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function areTrimmedStringArraysEqual(previousValues, nextValues) {
  const previous = normalizeTrimmedStringArray(previousValues);
  const next = normalizeTrimmedStringArray(nextValues);
  if (previous.length !== next.length) return false;
  return previous.every((value, index) => value === next[index]);
}

function normalizeCustomFieldDefinitionsForComparison(definitions) {
  return normalizeArray(definitions).map((field) => ({
    id: String(field?.id || '').trim(),
    label: String(field?.label || '').trim(),
    type: String(field?.type || '').trim(),
    required: Boolean(field?.required),
    options: normalizeTrimmedStringArray(field?.options),
  }));
}

function normalizeCustomReminderRulesForComparison(rules) {
  return normalizeArray(rules).map((rule) => ({
    condition1Field: String(rule?.condition1?.field || '').trim(),
    condition1Keywords: normalizeTrimmedStringArray(rule?.condition1?.keywords),
    condition2Field: String(rule?.condition2?.field || '').trim(),
    condition2Enabled: Boolean(rule?.condition2?.enabled),
    condition2Keywords: normalizeTrimmedStringArray(rule?.condition2?.keywords),
    createTask: Boolean(rule?.actions?.createTask),
    taskMessage: String(rule?.actions?.taskMessage || '').trim(),
    updateField: Boolean(rule?.actions?.updateField),
    targetField: String(rule?.actions?.targetField || '').trim(),
    newValue: String(rule?.actions?.newValue || '').trim(),
    doRollover: Boolean(rule?.actions?.doRollover),
    targetRoute: String(rule?.actions?.targetRoute || '').trim(),
  }));
}

function toStableSignatures(items) {
  return normalizeArray(items).map((item) => JSON.stringify(item));
}

function areStableSignatureArraysEqual(previousSignatures, nextSignatures) {
  if (previousSignatures.length !== nextSignatures.length) return false;
  return previousSignatures.every((value, index) => value === nextSignatures[index]);
}

function getAddedRemovedCounts(previousSignatures, nextSignatures) {
  const previousSet = new Set(previousSignatures);
  const nextSet = new Set(nextSignatures);
  const addedCount = [...nextSet].filter((item) => !previousSet.has(item)).length;
  const removedCount = [...previousSet].filter((item) => !nextSet.has(item)).length;
  return { addedCount, removedCount };
}

function Toggle({ value, onChange, label, disabled = false }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-light)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <div
        onClick={() => {
          if (disabled) return;
          onChange(!value);
        }}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? 'var(--primary)' : '#e2e8f0',
          position: 'relative',
          transition: 'background 0.2s',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: value ? 2 : 20,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'white',
            transition: 'right 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </label>
  );
}

function getWorkspaceOptionChangeType(previousItems = [], nextItems = []) {
  const previousCount = Array.isArray(previousItems) ? previousItems.length : 0;
  const nextCount = Array.isArray(nextItems) ? nextItems.length : 0;
  const previousActiveCount = (Array.isArray(previousItems) ? previousItems : []).filter((item) => item?.isActive !== false).length;
  const nextActiveCount = (Array.isArray(nextItems) ? nextItems : []).filter((item) => item?.isActive !== false).length;

  if (nextCount > previousCount && nextActiveCount >= previousActiveCount) return 'add';
  if (nextCount < previousCount) return 'remove';
  if (nextCount === previousCount && nextActiveCount !== previousActiveCount) return 'toggle';
  return 'mixed';
}

function OptionEditor({ optionType, workspaceId, userId, readOnly = false }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    if (!workspaceId) {
      setItems([]);
      setLoaded(true);
      return () => {
        active = false;
      };
    }

    storage.getWorkspaceOptions(workspaceId, optionType.key)
      .then((opts) => {
        if (!active) return;

        if (Array.isArray(opts) && opts.length > 0) {
          setItems(opts);
        } else {
          const defaults = optionType.defaults.map((label, i) => ({
            id: `${optionType.key}_${i}`,
            label,
            isActive: true,
            sortOrder: i,
          }));
          setItems(defaults);
          storage.saveWorkspaceOptions(workspaceId, optionType.key, defaults).catch(() => {});
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, optionType]);

  const save = async (newItems) => {
    if (readOnly) return;
    const previousItems = Array.isArray(items) ? items : [];
    setItems(newItems);
    await storage.saveWorkspaceOptions(workspaceId, optionType.key, newItems);
    try {
      auditLogger.log(
        workspaceId,
        userId,
        ACTION_TYPES.SETTINGS_CHANGE,
        {
          section: 'workspaceOptions',
          action: 'workspaceOptionListUpdated',
          optionType: optionType.key,
          previousCount: previousItems.length,
          nextCount: Array.isArray(newItems) ? newItems.length : 0,
          changeType: getWorkspaceOptionChangeType(previousItems, newItems),
        }
      );
    } catch {}
  };

  if (!loaded) {
    return <div style={{ padding: 12, color: 'var(--text-muted)' }}>جاري التحميل...</div>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          className="form-input"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`أضف ${optionType.label}...`}
          style={{ flex: 1, fontSize: 13 }}
          disabled={readOnly}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key !== 'Enter' || !newItem.trim()) return;
            const next = [
              ...items,
              {
                id: `${optionType.key}_${Date.now()}`,
                label: newItem.trim(),
                isActive: true,
                sortOrder: items.length,
              },
            ];
            save(next).catch(() => {});
            setNewItem('');
          }}
        />
        <button
          className="btn-primary"
          style={{ fontSize: 13, padding: '8px 12px' }}
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return;
            if (!newItem.trim()) return;
            const next = [
              ...items,
              {
                id: `${optionType.key}_${Date.now()}`,
                label: newItem.trim(),
                isActive: true,
                sortOrder: items.length,
              },
            ];
            save(next).catch(() => {});
            setNewItem('');
          }}
        >
          + إضافة
        </button>
      </div>

      {readOnly ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          يمكن فقط لمدير مساحة العمل تعديل هذه القوائم.
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => (
          <div
            key={item.id || i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 20,
              background: item.isActive ? 'var(--primary-light)' : '#f1f5f9',
              border: '1px solid',
              borderColor: item.isActive ? 'var(--primary)' : 'var(--border)',
              opacity: item.isActive ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 13, color: item.isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
              {item.label}
            </span>
            <button
              onClick={() => {
                if (readOnly) return;
                const next = items.map((it, idx) => (idx === i ? { ...it, isActive: !it.isActive } : it));
                save(next).catch(() => {});
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                color: 'var(--text-muted)',
                padding: '0 2px',
              }}
              disabled={readOnly}
              title={item.isActive ? 'تعطيل' : 'تفعيل'}
            >
              {item.isActive ? '●' : '○'}
            </button>
            <button
              onClick={() => {
                if (readOnly) return;
                const next = items.filter((_, idx) => idx !== i);
                save(next).catch(() => {});
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: '#dc2626',
                padding: '0 2px',
              }}
              disabled={readOnly}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const {
    currentWorkspace,
    membershipLoading,
    workspacePlan,
    hasTeamFeatures,
    canManageWorkspaceMembers,
    canManageWorkspaceSettings,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [openOption, setOpenOption] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSavingId, setMemberSavingId] = useState('');
  const [memberFeedback, setMemberFeedback] = useState({ type: '', text: '' });
  const [resettingWorkspace, setResettingWorkspace] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [customFieldsDirty, setCustomFieldsDirty] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandSub, setBrandSub] = useState('');
  const [syncProgress, setSyncProgress] = useState({});
  const [syncStats, setSyncStats] = useState({ queued: 0, uploading: 0, done: 0, error: 0 });
  const isPro = subscriptionManager.hasFeature('cloudSync');

  const workspaceId = String(currentWorkspace?.id || '').trim();
  // TODO: replace ownerId fallback with authenticated user uid when AuthContext path is confirmed
  const userId = String(currentWorkspace?.ownerId || '').trim();
  const selectedColor = localStorage.getItem('lb_primary_color') || '';
  const canManageAdvancedTeamFeatures = hasTeamFeatures && canManageWorkspaceMembers;

  useEffect(() => {
    if (!workspaceId) return;
    storage.getWorkspaceSettings(workspaceId)
      .then((s) => {
        const next = normalizeDisplaySettings(s || {});
        setSettings(next);
        setDisplaySettings(next);
        const loadedDefs = Array.isArray(next.customFieldDefinitions)
          ? next.customFieldDefinitions
          : [];
        setCustomFieldDefs(loadedDefs);
        if (s?.brandName) setBrandName(s.brandName);
        if (s?.brandSub) setBrandSub(s.brandSub);
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || activeTab !== 'members') return;

    setMembersLoading(true);
    const loader = storage.listWorkspaceMembers
      ? storage.listWorkspaceMembers(workspaceId)
      : Promise.resolve([]);

    loader.then((list) => {
      setMembers(Array.isArray(list) ? list : []);
    }).catch(() => {
      setMembers([]);
    }).finally(() => {
      setMembersLoading(false);
    });
  }, [workspaceId, activeTab]);

  useEffect(() => {
    const unsub = cloudSyncService.onProgress((progress) => {
      setSyncProgress({ ...progress });
      const values = Object.values(progress);
      setSyncStats({
        queued: values.filter((p) => p.status === 'queued').length,
        uploading: values.filter((p) => p.status === 'uploading').length,
        done: values.filter((p) => p.status === 'done').length,
        error: values.filter((p) => p.status === 'error').length,
      });
    });
    return unsub;
  }, []);

  const handleMemberRoleChange = async (member, nextRole) => {
    const memberId = String(member?.uid || member?.id || '').trim();
    const previousRole = String(member?.role || '').trim();
    const ownerId = String(currentWorkspace?.ownerId || '').trim();
    if (!workspaceId || !memberId || memberId === ownerId) return;

    setMemberSavingId(memberId);
    setMemberFeedback({ type: '', text: '' });
    try {
      await storage.updateWorkspaceMemberRole(workspaceId, memberId, nextRole);
      try {
        auditLogger.log(
          workspaceId,
          userId,
          ACTION_TYPES.SETTINGS_CHANGE,
          {
            section: 'members',
            action: 'memberRoleUpdated',
            memberId,
            previousRole,
            nextRole,
          }
        );
      } catch {}
      setMembers((current) => current.map((item) => (
        String(item?.uid || item?.id || '') === memberId
          ? { ...item, role: nextRole }
          : item
      )));
      setMemberFeedback({ type: 'success', text: 'تم تحديث دور العضو بنجاح.' });
    } catch {
      setMemberFeedback({ type: 'error', text: 'تعذر تحديث دور العضو.' });
    } finally {
      setMemberSavingId('');
    }
  };

  const handleMemberActiveToggle = async (member) => {
    const memberId = String(member?.uid || member?.id || '').trim();
    const ownerId = String(currentWorkspace?.ownerId || '').trim();
    if (!workspaceId || !memberId || memberId === ownerId) return;

    const previousActive = member?.isActive !== false;
    const nextActive = member?.isActive === false;
    setMemberSavingId(memberId);
    setMemberFeedback({ type: '', text: '' });
    try {
      await storage.setWorkspaceMemberActive(workspaceId, memberId, nextActive);
      try {
        auditLogger.log(
          workspaceId,
          userId,
          ACTION_TYPES.SETTINGS_CHANGE,
          {
            section: 'members',
            action: 'memberActiveUpdated',
            memberId,
            previousActive,
            nextActive,
          }
        );
      } catch {}
      setMembers((current) => current.map((item) => (
        String(item?.uid || item?.id || '') === memberId
          ? { ...item, isActive: nextActive }
          : item
      )));
      setMemberFeedback({
        type: 'success',
        text: nextActive ? 'تم تفعيل العضو بنجاح.' : 'تم تعطيل العضو بنجاح.',
      });
    } catch {
      setMemberFeedback({ type: 'error', text: 'تعذر تحديث حالة العضو.' });
    } finally {
      setMemberSavingId('');
    }
  };

  const saveSettings = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) return;
    setSaving(true);
    try {
      const previousIdentityKeywords = normalizeTrimmedStringArray(
        Array.isArray(settings.identityKeywords)
          ? settings.identityKeywords
          : splitKeywords(settings.identityKeywords)
      );
      const previousCustomReminderRules = normalizeCustomReminderRulesForComparison(settings.customReminderRules);
      const previousCustomReminderRuleSignatures = toStableSignatures(previousCustomReminderRules);
      const previousCustomFieldDefinitions = normalizeCustomFieldDefinitionsForComparison(settings.customFieldDefinitions);
      const previousCustomFieldSignatures = toStableSignatures(previousCustomFieldDefinitions);

      const next = normalizeAutomationSettings(normalizeDisplaySettings({
        ...settings,
        customFieldDefinitions: customFieldDefs,
      }), customFieldDefs);
      await storage.updateWorkspaceSettings(workspaceId, next);

      const nextIdentityKeywords = normalizeTrimmedStringArray(next.identityKeywords);
      const nextCustomReminderRules = normalizeCustomReminderRulesForComparison(next.customReminderRules);
      const nextCustomReminderRuleSignatures = toStableSignatures(nextCustomReminderRules);
      const nextCustomFieldDefinitions = normalizeCustomFieldDefinitionsForComparison(next.customFieldDefinitions);
      const nextCustomFieldSignatures = toStableSignatures(nextCustomFieldDefinitions);

      const customReminderRulesChanged = !areStableSignatureArraysEqual(
        previousCustomReminderRuleSignatures,
        nextCustomReminderRuleSignatures
      );
      const identityKeywordsChanged = !areTrimmedStringArraysEqual(
        previousIdentityKeywords,
        nextIdentityKeywords
      );
      const customFieldDefinitionsChanged = !areStableSignatureArraysEqual(
        previousCustomFieldSignatures,
        nextCustomFieldSignatures
      );

      try {
        let hasFineGrainedAudit = false;

        if (customReminderRulesChanged) {
          const { addedCount, removedCount } = getAddedRemovedCounts(
            previousCustomReminderRuleSignatures,
            nextCustomReminderRuleSignatures
          );
          auditLogger.log(
            workspaceId,
            userId,
            ACTION_TYPES.SETTINGS_CHANGE,
            {
              section: 'customRules',
              source: 'automation_center',
              action: 'customReminderRulesUpdated',
              previousCount: previousCustomReminderRules.length,
              nextCount: nextCustomReminderRules.length,
              addedCount,
              removedCount,
            }
          );
          hasFineGrainedAudit = true;
        }

        if (identityKeywordsChanged) {
          auditLogger.log(
            workspaceId,
            userId,
            ACTION_TYPES.SETTINGS_CHANGE,
            {
              section: 'customRules',
              source: 'automation_center',
              action: 'identityKeywordsUpdated',
              previousCount: previousIdentityKeywords.length,
              nextCount: nextIdentityKeywords.length,
            }
          );
          hasFineGrainedAudit = true;
        }

        if (customFieldDefinitionsChanged) {
          auditLogger.log(
            workspaceId,
            userId,
            ACTION_TYPES.SETTINGS_CHANGE,
            {
              section: 'customFields',
              source: 'automation_center',
              action: 'customFieldDefinitionsUpdated',
              previousCount: previousCustomFieldDefinitions.length,
              nextCount: nextCustomFieldDefinitions.length,
            }
          );
          hasFineGrainedAudit = true;
        }

        if (!hasFineGrainedAudit) {
          auditLogger.log(
            workspaceId,
            userId,
            ACTION_TYPES.SETTINGS_CHANGE,
            {
              section: 'settings',
              source: 'automation_center',
            }
          );
        }
      } catch {}
      setCustomFieldsDirty(false);
      setSettings(next);
      setDisplaySettings(next);
      window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.WORKSPACE_OPTIONS_LOADED, {
        detail: {
          workspaceId,
          settings: next,
          source: 'settings_automation_center',
        },
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleResetWorkspaceData = async () => {
    if (!workspaceId || !canManageWorkspaceSettings || resettingWorkspace) return;

    const workspaceName = String(currentWorkspace?.name || settings.workspaceName || 'مساحة العمل').trim() || 'مساحة العمل';
    const typedName = await promptDialog(
      `سيتم حذف جميع بيانات "${workspaceName}" داخل هذه المساحة فقط.\nلن يتم حذف مساحة العمل نفسها أو الأعضاء.\n\nاكتب اسم مساحة العمل للتأكيد:`,
      '',
      {
        title: 'تأكيد إعادة التهيئة',
        confirmLabel: 'متابعة',
        cancelLabel: 'إلغاء',
        placeholder: 'اكتب اسم مساحة العمل',
      }
    );

    if (typedName === null) return;
    const normalizedTypedName = normalizeWorkspaceConfirmationName(typedName);
    const acceptedWorkspaceNames = new Set(
      [
        currentWorkspace?.name,
        settings.workspaceName,
        workspaceName,
      ]
        .map(normalizeWorkspaceConfirmationName)
        .filter(Boolean)
    );

    if (!acceptedWorkspaceNames.has(normalizedTypedName)) {
      alert('اسم مساحة العمل غير مطابق. تم إلغاء العملية.');
      return;
    }

    const confirmed = await confirmDialog('تأكيد نهائي: سيتم حذف القضايا والجلسات والأحكام والمهام والأرشيف والنماذج والإعدادات الخاصة بهذه المساحة الحالية فقط.', {
      title: 'تأكيد نهائي',
      confirmLabel: 'نعم، إعادة التهيئة',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!confirmed) return;

    setResettingWorkspace(true);
    try {
      await storage.clearWorkspaceData(workspaceId);
      try {
        auditLogger.log(
          workspaceId,
          userId,
          ACTION_TYPES.SETTINGS_CHANGE,
          {
            section: 'admin',
            action: 'resetWorkspace',
            workspaceName: String(currentWorkspace?.name || settings.workspaceName || '').trim(),
          }
        );
      } catch {}
      alert('تمت إعادة تهيئة مساحة العمل الحالية بنجاح.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear workspace data:', error);
      alert('تعذر إعادة تهيئة مساحة العمل حاليًا.');
    } finally {
      setResettingWorkspace(false);
    }
  };

  function addCustomField() {
    if (customFieldDefs.length >= MAX_CUSTOM_FIELDS) return;
    setCustomFieldDefs((prev) => [
      ...prev,
      {
        id: `cf_${Date.now()}`,
        label: '',
        type: CUSTOM_FIELD_TYPES.STRING,
        options: [],
        required: false,
      },
    ]);
    setCustomFieldsDirty(true);
  }

  function updateCustomField(index, patch) {
    setCustomFieldDefs((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...patch } : field))
    );
    setCustomFieldsDirty(true);
  }

  function removeCustomField(index) {
    setCustomFieldDefs((prev) => prev.filter((_, idx) => idx !== index));
    setCustomFieldsDirty(true);
  }

  function updateIdentityKeywords(value) {
    const identityKeywords = splitKeywords(value);
    setSettings((prev) => ({ ...prev, identityKeywords }));
  }

  function addCustomReminderRule() {
    setSettings((prev) => ({
      ...prev,
      customReminderRules: [
        ...(Array.isArray(prev.customReminderRules) ? prev.customReminderRules : []),
        createEmptyCustomRule(),
      ],
    }));
  }

  function updateCustomReminderRule(index, patch) {
    setSettings((prev) => ({
      ...prev,
      customReminderRules: (Array.isArray(prev.customReminderRules) ? prev.customReminderRules : []).map((rule, ruleIndex) => (
        ruleIndex === index ? { ...rule, ...patch } : rule
      )),
    }));
  }

  function removeCustomReminderRule(index) {
    setSettings((prev) => ({
      ...prev,
      customReminderRules: (Array.isArray(prev.customReminderRules) ? prev.customReminderRules : []).filter((_, ruleIndex) => ruleIndex !== index),
    }));
  }

  const generalCards = useMemo(() => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
      {!canManageWorkspaceSettings ? (
        <div className="card" style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
          يمكن فقط لمدير مساحة العمل تعديل هذه الإعدادات. المحتوى ظاهر هنا للقراءة فقط.
        </div>
      ) : null}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🏢 مساحة العمل</h3>
          <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
            {saving ? '...' : '💾 حفظ سريع'}
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">اسم مساحة العمل (إعداد عرض حاليًا)</label>
          <input
            className="form-input"
            value={settings.workspaceName || currentWorkspace?.name || ''}
            onChange={(e) => setSettings((s) => ({ ...s, workspaceName: e.target.value }))}
            disabled={!canManageWorkspaceSettings}
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            هذا الحقل يخص اسم العرض داخل الإعدادات حاليًا، وليس إعادة تسمية مباشرة لمساحة العمل.
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">نوع مساحة العمل</label>
          <select
            className="form-input"
            value={settings.workspaceType || ''}
            onChange={(e) => setSettings((s) => ({ ...s, workspaceType: e.target.value }))}
            disabled={!canManageWorkspaceSettings}
          >
            <option value="">اختر النوع</option>
            <option value="law_firm">مكتب محاماة</option>
            <option value="judicial_circuit">دائرة قضائية</option>
            <option value="government_entity">جهة حكومية</option>
            <option value="legal_team">فريق قانوني</option>
          </select>
        </div>

        {/* Brand customization */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: 12 }}>
            🎨 تخصيص هوية التطبيق
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                اسم التطبيق (يظهر في الشريط الجانبي)
              </label>
              <input
                type="text"
                value={brandName ?? 'LawBase'}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  setSettings((s) => ({ ...s, brandName: e.target.value }));
                }}
                placeholder="LawBase"
                maxLength={30}
                disabled={!canManageWorkspaceSettings}
                style={{ width: '100%', padding: '8px 12px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontFamily: 'Cairo', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                النص الفرعي (يظهر تحت الاسم)
              </label>
              <input
                type="text"
                value={brandSub ?? 'نظام إدارة القضايا'}
                onChange={(e) => {
                  setBrandSub(e.target.value);
                  setSettings((s) => ({ ...s, brandSub: e.target.value }));
                }}
                placeholder="نظام إدارة القضايا"
                maxLength={40}
                disabled={!canManageWorkspaceSettings}
                style={{ width: '100%', padding: '8px 12px',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontFamily: 'Cairo', fontSize: 13 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          border: '1px solid #fecaca',
          background: '#fff7f7',
          maxWidth: 900,
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#b91c1c' }}>منطقة خطرة</h3>
          <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.8 }}>
            هذا الإجراء يحذف جميع بيانات مساحة العمل الحالية فقط ويُبقي مساحة العمل نفسها والأعضاء كما هم.
          </div>
          {!canManageWorkspaceSettings ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              يمكن فقط لمدير مساحة العمل تنفيذ إعادة التهيئة.
            </div>
          ) : (
            <button
              className="btn-secondary"
              onClick={handleResetWorkspaceData}
              disabled={resettingWorkspace}
              style={{
                width: 'fit-content',
                background: '#fff',
                borderColor: '#fca5a5',
                color: '#b91c1c',
              }}
            >
              {resettingWorkspace ? 'جاري إعادة التهيئة...' : 'حذف بيانات المساحة والبدء من جديد'}
            </button>
          )}
        </div>
      </div>

      <button className="btn-primary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ width: 'fit-content' }}>
        {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
      </button>
    </div>
  ), [settings, currentWorkspace?.name, saving, canManageWorkspaceSettings, resettingWorkspace]);

  if (!workspaceId) {
    return <div className="empty-state">لا توجد مساحة عمل محددة</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="page-header" style={{ marginBottom: 4 }}>
        <h1 className="page-title">الإعدادات</h1>
      </div>

      <div style={{
        background: 'white',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {[
          { num: 1, label: 'مساحة العمل' },
          { num: 2, label: 'الأتمتة والمظهر' },
          { num: 3, label: 'الإدارة' },
        ].map(({ num, label }) => {
          const groupTabs = SETTINGS_TABS.filter((tab) => tab.group === num);
          return (
            <div key={num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingBottom: num < 3 ? 6 : 0,
              borderBottom: num < 3 ? '1px solid var(--border-light)' : 'none',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontWeight: 600,
                minWidth: 72,
                whiteSpace: 'nowrap',
                paddingLeft: 4,
                borderLeft: '2px solid var(--border)',
              }}>
                {label}
              </span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                {groupTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.desc}
                      style={{
                        fontSize: 12,
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: '1px solid',
                        cursor: 'pointer',
                        fontFamily: 'Cairo, sans-serif',
                        fontWeight: isActive ? 700 : 500,
                        transition: 'all 0.15s ease',
                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                        background: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {activeTab === 'general' && generalCards}

            {activeTab === 'options' && (
        <div style={{ maxWidth: 920 }}>
          {SETTINGS_OPTION_TYPES.map((optType) => (
            <div key={optType.key} className="card" style={{ marginBottom: 8 }}>
              <div
                onClick={() => setOpenOption(openOption === optType.key ? null : optType.key)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {optType.icon} {optType.label}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {openOption === optType.key ? '▲ إغلاق' : '▼ تعديل'}
                </span>
              </div>

              {openOption === optType.key && (
                <OptionEditor optionType={optType} workspaceId={workspaceId} userId={userId} readOnly={!canManageWorkspaceSettings} />
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="card" style={{ maxWidth: 920 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>🎨 تخصيص المظهر</h3>

          {!canManageWorkspaceSettings ? (
            <div
              style={{
                marginBottom: 12,
                padding: '12px',
                background: 'var(--bg-page)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              يمكن فقط لمدير مساحة العمل تعديل المظهر. يمكنك مراجعة القيم هنا للقراءة فقط.
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">اللون الرئيسي للتطبيق</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                '#FF8C00', '#2563eb', '#7c3aed', '#16a34a',
                '#dc2626', '#0284c7', '#d97706', '#0f172a',
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={!canManageWorkspaceSettings}
                  onClick={() => {
                    if (!canManageWorkspaceSettings) return;
                    document.documentElement.style.setProperty('--primary', color);
                    localStorage.setItem('lb_primary_color', color);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: color,
                    border: '3px solid white',
                    cursor: !canManageWorkspaceSettings ? 'not-allowed' : 'pointer',
                    opacity: !canManageWorkspaceSettings ? 0.65 : 1,
                    boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <Toggle
            label="الوضع المضغوط (عرض أكثر بيانات)"
            value={settings.compactMode || false}
            onChange={(v) => setSettings((s) => ({ ...s, compactMode: v }))}
            disabled={!canManageWorkspaceSettings}
          />
        </div>
      )}

            {activeTab === 'cases' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>⚖️ بيانات المحكمة الافتراضية</h3>
              <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                {saving ? '...' : '💾 حفظ سريع'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المحكمة الافتراضية</label>
                <input className="form-input" value={settings.defaultCourt || ''} onChange={(e) => setSettings((s) => ({ ...s, defaultCourt: e.target.value }))} placeholder="مثال: محكمة القضاء الإداري" disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الدائرة الافتراضية</label>
                <input className="form-input" value={settings.defaultCircuit || ''} onChange={(e) => setSettings((s) => ({ ...s, defaultCircuit: e.target.value }))} placeholder="مثال: الدائرة الثالثة" disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المستشار الافتراضي</label>
                <input className="form-input" value={settings.defaultJudge || ''} onChange={(e) => setSettings((s) => ({ ...s, defaultJudge: e.target.value }))} placeholder="مثال: المستشار / محمد أحمد" disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">نوع الدعوى الافتراضي</label>
                <select className="form-input" value={settings.defaultProcedureTrack || ''} onChange={(e) => setSettings((s) => ({ ...s, defaultProcedureTrack: e.target.value }))} disabled={!canManageWorkspaceSettings}>
                  {WORKSPACE_DEFAULT_PROCEDURE_TRACK_OPTIONS.map((option) => (
                    <option key={option.value || '__empty__'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.7 }}>
                  لو اخترت نوعًا واحدًا، حقل نوع الدعوى هيختفي من نموذج القضية تلقائيًا ويتملى وحده.
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>⏱️ مواعيد الطعن</h3>
              <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                {saving ? '...' : '💾 حفظ سريع'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ميعاد الطعن الافتراضي (يوم)</label>
                <input type="number" className="form-input" value={settings.appealDeadlineDefault ?? 40} onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineDefault: Number(e.target.value || 40) }))} disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المحكمة الإدارية العليا (يوم)</label>
                <input type="number" className="form-input" value={settings.appealDeadlineSupremeAdmin ?? 60} onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineSupremeAdmin: Number(e.target.value || 60) }))} disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الوقف الجزائي (يوم)</label>
                <input type="number" className="form-input" value={settings.appealDeadlineSuspension ?? 45} onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineSuspension: Number(e.target.value || 45) }))} disabled={!canManageWorkspaceSettings} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">تنبيه الوقف الجزائي قبل (يوم)</label>
                <input type="number" className="form-input" value={settings.suspensionWarningDays ?? 30} onChange={(e) => setSettings((s) => ({ ...s, suspensionWarningDays: Number(e.target.value || 30) }))} disabled={!canManageWorkspaceSettings} />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>🧩 حقول مخصصة</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {customFieldDefs.length}/{MAX_CUSTOM_FIELDS}
                </span>
                <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                  {saving ? '...' : '💾 حفظ سريع'}
                </button>
                {customFieldsDirty && (
                  <span style={{ fontSize: 12, color: '#dc2626', marginRight: 4, whiteSpace: 'nowrap' }}>لم يتم حفظ التغييرات بعد</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              حقول إضافية تظهر في تفاصيل القضية والنماذج. لا تظهر في الكارت الرئيسي.
            </div>
            {customFieldDefs.map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                <input className="form-input" placeholder="اسم الحقل" value={field.label} disabled={!canManageWorkspaceSettings} onChange={(e) => updateCustomField(index, { label: e.target.value })} />
                <select className="form-input" value={field.type} disabled={!canManageWorkspaceSettings} onChange={(e) => updateCustomField(index, { type: e.target.value })}>
                  <option value={CUSTOM_FIELD_TYPES.STRING}>نص</option>
                  <option value={CUSTOM_FIELD_TYPES.DATE}>تاريخ</option>
                  <option value={CUSTOM_FIELD_TYPES.NUMBER}>رقم</option>
                  <option value={CUSTOM_FIELD_TYPES.BOOLEAN}>نعم/لا</option>
                  <option value={CUSTOM_FIELD_TYPES.DROPDOWN}>قائمة</option>
                </select>
                {field.type === CUSTOM_FIELD_TYPES.DROPDOWN ? (
                  <input className="form-input" placeholder="الخيارات مفصولة بفاصلة: خيار1, خيار2" value={Array.isArray(field.options) ? field.options.join(', ') : ''} disabled={!canManageWorkspaceSettings} onChange={(e) => updateCustomField(index, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                ) : (<div />)}
                <button onClick={() => removeCustomField(index)} disabled={!canManageWorkspaceSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '4px 8px' }} title="حذف الحقل">🗑️</button>
              </div>
            ))}
            {customFieldDefs.length < MAX_CUSTOM_FIELDS && canManageWorkspaceSettings && (
              <button className="btn-secondary" onClick={addCustomField} style={{ marginTop: 8, fontSize: 13 }}>+ إضافة حقل مخصص</button>
            )}
          </div>

          <button className="btn-primary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ width: 'fit-content' }}>
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      )}

      {activeTab === 'display' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>🧭 العرض والتنسيق</h3>
              <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                {saving ? '...' : '💾 حفظ سريع'}
              </button>
            </div>
            <Toggle label="عرض الأرقام بالعربية (١٢٣)" value={settings.useArabicNumerals ?? settings.arabicNumerals ?? false} onChange={(v) => setSettings((s) => normalizeDisplaySettings({ ...s, useArabicNumerals: v, arabicNumerals: v }))} disabled={!canManageWorkspaceSettings} />
            <div className="form-group" style={{ margin: '12px 0 0' }}>
              <label className="form-label">طريقة عرض رقم الدعوى</label>
              <select className="form-input" value={settings.caseNumberDisplayFormat || 'year-slash-number'} onChange={(e) => setSettings((s) => normalizeDisplaySettings({ ...s, caseNumberDisplayFormat: e.target.value }))} disabled={!canManageWorkspaceSettings}>
                <option value="year-slash-number">year-slash-number (72/802)</option>
                <option value="number-sanah-year">number-sanah-year (802 لسنة 72)</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: '12px 0 0' }}>
              <label className="form-label">تنسيق التاريخ</label>
              <select className="form-input" value={settings.dateDisplayFormat || settings.dateFormat || 'DD/MM/YYYY'} onChange={(e) => setSettings((s) => normalizeDisplaySettings({ ...s, dateDisplayFormat: e.target.value, dateFormat: e.target.value }))} dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }} disabled={!canManageWorkspaceSettings}>
                {DISPLAY_FORMAT_OPTIONS.map((format) => (
                  <option key={format} value={format}>{getDateFormatOptionLabel(format)}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">تعريف العاجل (أيام)</label>
              <input type="number" className="form-input" value={settings.urgentDays ?? 10} onChange={(e) => setSettings((s) => ({ ...s, urgentDays: Number(e.target.value || 10) }))} disabled={!canManageWorkspaceSettings} />
            </div>
          </div>
          <button className="btn-primary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ width: 'fit-content' }}>
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      )}

      {activeTab === 'automation' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
          {/* كارت القواعد التلقائية */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>🤖 القواعد التلقائية</h3>
              <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                {saving ? '...' : '💾 حفظ سريع'}
              </button>
            </div>
            <Toggle label="تفعيل القواعد التلقائية" value={settings.autoRulesEnabled ?? true} onChange={(v) => setSettings((s) => ({ ...s, autoRulesEnabled: v }))} disabled={!canManageWorkspaceSettings} />
            <Toggle label="إنشاء مهمة ميعاد الطعن تلقائياً" value={settings.autoCreateAppealTask ?? true} onChange={(v) => setSettings((s) => ({ ...s, autoCreateAppealTask: v }))} disabled={!canManageWorkspaceSettings} />
            <Toggle label="تمييز القضايا العاجلة تلقائياً" value={settings.autoMarkUrgent ?? true} onChange={(v) => setSettings((s) => ({ ...s, autoMarkUrgent: v }))} disabled={!canManageWorkspaceSettings} />
          </div>

          {/* كارت محرك الأتمتة (المنقول من options tab) */}
          {(() => {
            const reminderTargetFieldOptions = [
              ...REMINDER_TARGET_FIELD_OPTIONS,
              ...getCustomFieldReminderOptions(customFieldDefs),
              ...(Array.isArray(settings.customReminderTargetFields) ? settings.customReminderTargetFields : []).map((field) => ({
                value: String(field?.value || field || '').trim(),
                label: String(field?.label || field?.value || field || '').trim(),
              })).filter((field) => field.value),
            ].filter((field, index, list) => (
              field.value && list.findIndex((item) => item.value === field.value) === index
            ));

            return (
              <div className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>🧠 التصنيف الذكي والتذكيرات الديناميكية</h3>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>كلمات مفتاحية وقواعد تذكير مخصصة للقضايا.</div>
                  </div>
                  <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
                    {saving ? '...' : 'حفظ سريع'}
                  </button>
                </div>
                {!canManageWorkspaceSettings ? (
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 13 }}>
                    يمكن فقط لمدير مساحة العمل تعديل قواعد الأتمتة المتقدمة.
                  </div>
                ) : null}
                <div className="form-group">
                  <label className="form-label">كلمات دلالة الصفة (مدعين)</label>
                  <input className="form-input" value={Array.isArray(settings.identityKeywords) ? settings.identityKeywords.join(', ') : ''} onChange={(e) => updateIdentityKeywords(e.target.value)} placeholder="مثال: وزارة، محافظة، شركة" disabled={!canManageWorkspaceSettings} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>الكلمات التي إذا وجدت في اسم المدعي تعتبر القضية (مدعين/هام) تلقائياً.</div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14 }}>قواعد التذكير المخصصة</h4>
                    <button type="button" className="btn-secondary" onClick={addCustomReminderRule} disabled={!canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>+ إضافة قاعدة</button>
                  </div>
                  {(Array.isArray(settings.customReminderRules) ? settings.customReminderRules : []).length === 0 ? (
                    <div style={{ padding: '12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 13 }}>لا توجد قواعد تذكير ديناميكية بعد.</div>
                  ) : (
                    (Array.isArray(settings.customReminderRules) ? settings.customReminderRules : []).map((rule, index) => (
                      <div key={rule.id || index} style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900 }}>قاعدة #{index + 1}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>نفّذ الأفعال عند تحقق كل الشروط.</div>
                          </div>
                          <button type="button" onClick={() => removeCustomReminderRule(index)} disabled={!canManageWorkspaceSettings} style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 999, cursor: canManageWorkspaceSettings ? 'pointer' : 'not-allowed', color: '#b91c1c', fontSize: 12, fontWeight: 800, padding: '4px 10px' }}>حذف</button>
                        </div>
                        <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 'var(--radius-sm)', background: 'var(--bg-page)' }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-secondary)' }}>الشروط</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">الحقل الأساسي</label>
                              <select className="form-input" value={rule.condition1?.field || rule.targetField || 'plaintiffName'} onChange={(e) => updateCustomReminderRule(index, { condition1: { ...(rule.condition1 || {}), field: e.target.value } })} disabled={!canManageWorkspaceSettings}>
                                {reminderTargetFieldOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">كلمات الشرط الأساسي</label>
                              <input className="form-input" value={Array.isArray(rule.condition1?.keywords) ? rule.condition1.keywords.join(', ') : (Array.isArray(rule.triggerKeywords) ? rule.triggerKeywords.join(', ') : (rule.triggerKeywords || ''))} onChange={(e) => updateCustomReminderRule(index, { condition1: { ...(rule.condition1 || {}), keywords: splitKeywords(e.target.value) } })} placeholder="مثال: خبراء, إعلان, تنفيذ" disabled={!canManageWorkspaceSettings} />
                            </div>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>
                            <input type="checkbox" checked={Boolean(rule.condition2?.enabled)} onChange={(e) => updateCustomReminderRule(index, { condition2: { ...(rule.condition2 || {}), enabled: e.target.checked } })} disabled={!canManageWorkspaceSettings} />
                            و أيضاً: لا تنفذ إلا إذا تحقق شرط ثانٍ
                          </label>
                          {rule.condition2?.enabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8 }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">حقل الشرط الثاني</label>
                                <select className="form-input" value={rule.condition2?.field || 'roleCapacity'} onChange={(e) => updateCustomReminderRule(index, { condition2: { ...(rule.condition2 || {}), field: e.target.value } })} disabled={!canManageWorkspaceSettings}>
                                  {reminderTargetFieldOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                                </select>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">كلمات الشرط الثاني</label>
                                <input className="form-input" value={Array.isArray(rule.condition2?.keywords) ? rule.condition2.keywords.join(', ') : ''} onChange={(e) => updateCustomReminderRule(index, { condition2: { ...(rule.condition2 || {}), keywords: splitKeywords(e.target.value) } })} placeholder="مثال: مدعين / طاعنين" disabled={!canManageWorkspaceSettings} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'grid', gap: 8, padding: 10, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-secondary)' }}>الأفعال</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
                            <input type="checkbox" checked={Boolean(rule.actions?.createTask ?? rule.reminderMessage)} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), createTask: e.target.checked } })} disabled={!canManageWorkspaceSettings} />
                            إنشاء مهمة
                          </label>
                          {(rule.actions?.createTask ?? rule.reminderMessage) && (
                            <input className="form-input" value={rule.actions?.taskMessage ?? rule.reminderMessage ?? ''} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), taskMessage: e.target.value } })} placeholder="نص المهمة" disabled={!canManageWorkspaceSettings} />
                          )}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
                            <input type="checkbox" checked={Boolean(rule.actions?.updateField)} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), updateField: e.target.checked } })} disabled={!canManageWorkspaceSettings} />
                            تحديث حقل
                          </label>
                          {rule.actions?.updateField && (
                            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8 }}>
                              <select className="form-input" value={rule.actions?.targetField || 'status'} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), targetField: e.target.value } })} disabled={!canManageWorkspaceSettings}>
                                {reminderTargetFieldOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                              </select>
                              <input className="form-input" value={rule.actions?.newValue || ''} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), newValue: e.target.value } })} placeholder="القيمة الجديدة" disabled={!canManageWorkspaceSettings} />
                            </div>
                          )}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
                            <input type="checkbox" checked={Boolean(rule.actions?.doRollover)} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), doRollover: e.target.checked } })} disabled={!canManageWorkspaceSettings} />
                            Route Rollover / ترحيل المسار
                          </label>
                          {rule.actions?.doRollover && (
                            <select className="form-input" value={rule.actions?.targetRoute || 'sessions'} onChange={(e) => updateCustomReminderRule(index, { actions: { ...(rule.actions || {}), targetRoute: e.target.value } })} disabled={!canManageWorkspaceSettings}>
                              {CUSTOM_RULE_ROUTE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          <button className="btn-primary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ width: 'fit-content' }}>
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      )}

      {activeTab === 'sync' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
          {/* ── بطاقة الحالة العامة ── */}
          <div className="card" style={{
            background: isPro
              ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
              : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            border: isPro ? '1px solid #86efac' : '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: isPro ? '#16a34a' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {isPro ? '☁️' : '🔒'}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {isPro ? 'المزامنة السحابية مفعّلة' : 'المزامنة السحابية'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isPro ? 'ملفاتك تُزامن تلقائياً مع Firebase Storage' : 'متاحة في خطة Pro وما فوق'}
                  </div>
                </div>
              </div>
              {!isPro && (
                <a href="/activate" style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: '#f59e0b', color: 'white',
                  fontFamily: 'Cairo', fontSize: 12, fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  🚀 ترقية للـ Pro
                </a>
              )}
            </div>

            {isPro && (syncStats.queued > 0 || syncStats.uploading > 0 || syncStats.done > 0 || syncStats.error > 0) && (
              <div style={{
                marginTop: 14,
                display: 'flex', gap: 16, flexWrap: 'wrap',
              }}>
                {[
                  { key: 'uploading', label: 'جاري الرفع', color: '#2563eb', icon: '⏳' },
                  { key: 'queued', label: 'في الانتظار', color: '#d97706', icon: '🕐' },
                  { key: 'done', label: 'تم الرفع', color: '#16a34a', icon: '✅' },
                  { key: 'error', label: 'فشل', color: '#dc2626', icon: '⚠️' },
                ].filter(({ key }) => syncStats[key] > 0).map(({ key, label, color, icon }) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color,
                  }}>
                    <span>{icon}</span>
                    <span style={{ fontWeight: 700 }}>{syncStats[key]}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── إعدادات المزامنة (Pro فقط) ── */}
          {isPro ? (
            <>
              <div className="card">
                <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>⚙️ إعدادات المزامنة</h3>

                <div className="form-group">
                  <label className="form-label">وضع المزامنة</label>
                  <select
                    className="form-input"
                    value={settings.syncMode || 'auto'}
                    onChange={(e) => setSettings((s) => ({ ...s, syncMode: e.target.value }))}
                    disabled={!canManageWorkspaceSettings}
                  >
                    <option value="auto">تلقائي — رفع فور الحفظ المحلي</option>
                    <option value="manual">يدوي — أرفع عند الضغط على الزر</option>
                    <option value="off">إيقاف المزامنة مؤقتاً</option>
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    في الوضع التلقائي تبدأ المزامنة فور حفظ أي مرفق محلياً. في الوضع اليدوي يمكنك التحكم الكامل في توقيت الرفع.
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">الحد الأقصى لحجم الملف المُزامن (MB)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 120 }}
                      min={1}
                      max={100}
                      value={settings.syncMaxFileSizeMB ?? 25}
                      onChange={(e) => setSettings((s) => ({ ...s, syncMaxFileSizeMB: Math.max(1, Math.min(100, Number(e.target.value || 25))) }))}
                      disabled={!canManageWorkspaceSettings}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      الملفات الأكبر من هذا الحد لن تُرفع تلقائياً
                    </span>
                  </div>
                </div>

                <Toggle
                  label="ضغط الصور قبل الرفع (يُقلل الاستهلاك)"
                  value={settings.syncCompressImages ?? true}
                  onChange={(v) => setSettings((s) => ({ ...s, syncCompressImages: v }))}
                  disabled={!canManageWorkspaceSettings}
                />

                <Toggle
                  label="إعادة المحاولة تلقائياً عند الفشل"
                  value={settings.syncAutoRetry ?? true}
                  onChange={(v) => setSettings((s) => ({ ...s, syncAutoRetry: v }))}
                  disabled={!canManageWorkspaceSettings}
                />

                <Toggle
                  label="مزامنة على الشبكات المحدودة (بيانات موبايل)"
                  value={settings.syncOnMobile ?? false}
                  onChange={(v) => setSettings((s) => ({ ...s, syncOnMobile: v }))}
                  disabled={!canManageWorkspaceSettings}
                />
              </div>

              {/* ── تفاصيل التقدم ── */}
              {Object.keys(syncProgress).length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>📊 تفاصيل المزامنة الحالية</h3>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {Object.keys(syncProgress).length} ملف
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {Object.entries(syncProgress).map(([attachmentId, prog]) => (
                      <div key={attachmentId} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        background: prog.status === 'error' ? '#fef2f2'
                          : prog.status === 'done' ? '#f0fdf4'
                          : 'var(--bg-page)',
                        border: '1px solid',
                        borderColor: prog.status === 'error' ? '#fecaca'
                          : prog.status === 'done' ? '#bbf7d0'
                          : 'var(--border-light)',
                      }}>
                        <span style={{ fontSize: 16 }}>
                          {prog.status === 'done' ? '✅'
                            : prog.status === 'error' ? '⚠️'
                              : prog.status === 'uploading' ? '⏳'
                                : '🕐'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {attachmentId}
                          </div>
                          {prog.status === 'uploading' && (
                            <div style={{ marginTop: 4, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 2,
                                background: 'var(--primary)',
                                width: `${prog.pct || 0}%`,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                          )}
                          {prog.status === 'error' && (
                            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                              {prog.error || 'خطأ في الرفع'}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {prog.status === 'uploading' ? `${prog.pct}%`
                            : prog.status === 'done' ? 'تم'
                              : prog.status === 'error' ? 'فشل'
                                : 'انتظار'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={saveSettings}
                disabled={saving || !canManageWorkspaceSettings}
                style={{ width: 'fit-content' }}
              >
                {saving ? 'جاري الحفظ...' : '💾 حفظ إعدادات المزامنة'}
              </button>
            </>
          ) : (
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>☁️ ما الذي تحصل عليه في Pro؟</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { icon: '🔄', title: 'مزامنة تلقائية فورية', desc: 'كل مرفق يُرفع لحظة حفظه محلياً' },
                  { icon: '📡', title: 'Offline-First', desc: 'التطبيق يعمل بدون إنترنت — المزامنة تحصل لما يرجع الاتصال' },
                  { icon: '🔒', title: 'نسخ احتياطية آمنة', desc: 'ملفاتك في Firebase Storage بأمان' },
                  { icon: '⚙️', title: 'تحكم كامل', desc: 'اختر تلقائي أو يدوي، وحدد حجم الملف وضغط الصور' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--bg-page)', border: '1px solid var(--border-light)',
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/activate" style={{
                display: 'inline-block', marginTop: 16,
                padding: '10px 20px', borderRadius: 10,
                background: '#f59e0b', color: 'white',
                fontFamily: 'Cairo', fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
              }}>
                🚀 ترقية إلى Pro الآن
              </a>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="card" style={{ maxWidth: 920 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>👥 أعضاء الفريق</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{members.length} عضو</span>
          </div>

          {membershipLoading || membersLoading ? (
            <div style={{ padding: '12px 0', color: 'var(--text-muted)' }}>
              جاري تحميل بيانات الأعضاء...
            </div>
          ) : null}

          {memberFeedback.text ? (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: memberFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                color: memberFeedback.type === 'error' ? '#b91c1c' : '#166534',
                fontSize: 13,
              }}
            >
              {memberFeedback.text}
            </div>
          ) : null}

          {!hasTeamFeatures ? (
            <div
              style={{
                marginBottom: 12,
                padding: '12px',
                background: 'var(--bg-page)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              إدارة الفريق الكاملة متاحة في خطة الفريق فقط. يمكنك الآن عرض الأعضاء الحاليين، بينما ستظهر ميزات الإدارة المتقدمة عند تفعيل خطة الفريق.
            </div>
          ) : !canManageWorkspaceMembers ? (
            <div
              style={{
                marginBottom: 12,
                padding: '12px',
                background: 'var(--bg-page)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              يمكنك الاطلاع على أعضاء مساحة العمل الحالية، لكن إدارة الأدوار والتفعيل متاحة فقط لمدير مساحة العمل.
            </div>
          ) : null}

          {members.map((member) => (
            <div
              key={member.uid || member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--border-light)',
                opacity: member.isActive === false ? 0.65 : 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {String(member.displayName || member.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{member.displayName || member.email}</div>
                  {String(member.uid || member.id || '') === String(currentWorkspace?.ownerId || '') ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#fff7ed',
                        color: '#c2410c',
                        fontWeight: 700,
                      }}
                    >
                      المالك
                    </span>
                  ) : null}
                  {member.isActive === false ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#f1f5f9',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      غير نشط
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
              </div>
              {canManageAdvancedTeamFeatures && String(member.uid || member.id || '') !== String(currentWorkspace?.ownerId || '') ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    className="form-input"
                    value={member.role || 'readonly'}
                    disabled={memberSavingId === String(member.uid || member.id || '')}
                    onChange={(e) => handleMemberRoleChange(member, e.target.value)}
                    style={{ minWidth: 120, fontSize: 12, padding: '6px 8px' }}
                  >
                    {MEMBER_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={memberSavingId === String(member.uid || member.id || '')}
                    onClick={() => handleMemberActiveToggle(member)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  >
                    {member.isActive === false ? 'تفعيل' : 'تعطيل'}
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 10px',
                    borderRadius: 12,
                    background: member.role === 'admin' ? 'var(--primary-light)' : '#f1f5f9',
                    color: member.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {MEMBER_ROLE_LABELS[member.role] || 'للاطلاع فقط'}
                </span>
              )}
            </div>
          ))}

          <div
            style={{
              marginTop: 12,
              padding: '12px',
              background: 'var(--bg-page)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
            }}
          >
            {!hasTeamFeatures ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  الخطة الحالية هي <strong>{workspacePlan}</strong>، وميزات الفريق الموسعة غير متاحة فيها حاليًا.
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  تظل قائمة الأعضاء مرئية، لكن الدعوات والإدارة الموسعة للأعضاء ترتبط بخطة الفريق.
                </div>
                <button className="btn-secondary" style={{ fontSize: 13 }} disabled title="ميزات الفريق الموسعة متاحة في خطة الفريق فقط">
                  ميزات الفريق تتطلب خطة الفريق
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  الدعوات وإدارة الأعضاء المتقدمة ونقل الملكية ليست مفعلة بعد، وسيتم إضافتها في تحديث لاحق.
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  المتاح الآن هو عرض الأعضاء، وتعديل الدور، وتفعيل أو تعطيل الأعضاء العاديين فقط من داخل مساحة العمل الحالية.
                </div>
                <button className="btn-secondary" style={{ fontSize: 13 }} disabled title="الدعوات غير متاحة بعد">
                  + دعوة عضو
                </button>
              </>
            )}
          </div>
        </div>
      )}


      {activeTab === 'subscription' && (
        <UsageStatsPanel
          workspaceId={workspaceId}
          currentWorkspace={currentWorkspace}
        />
      )}

      {activeTab === 'audit' && (
        <AuditLogViewer workspaceId={workspaceId} />
      )}

      {activeTab === 'import' && (
        canManageWorkspaceSettings ? (
          <div style={{ width: '100%', maxWidth: 920 }}>
            <DataExporter
              workspaceId={workspaceId}
              workspaceName={currentWorkspace?.name}
            />
            <SmartImporter
              workspaceId={workspaceId}
              onClose={() => setActiveTab('general')}
            />
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 920 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>الاستيراد والتصدير</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              يمكن فقط لمدير مساحة العمل استيراد البيانات أو تصديرها من هذا القسم.
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── AuditLogViewer Component ─────────────────────────────────
function AuditLogViewer({ workspaceId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    auditLogger.getRecentLogs(workspaceId, 50)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <FeatureGate feature="auditLog" fallback={
      <div style={{ padding: 24, textAlign: 'center', direction: 'rtl' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          سجل التدقيق
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {subscriptionManager.getUpgradeMessage('auditLog')}
        </div>
      </div>
    }>
      <div style={{ direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            🔍 سجل التدقيق
          </h3>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="form-input"
            style={{ width: 200, fontSize: 13 }}
          >
            <option value="">كل العمليات</option>
          </select>
        </div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div>لا توجد عمليات مسجلة بعد</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>العملية</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>المستخدم</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>التوقيت</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{log.action}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{log.userId?.substring(0, 12)}...</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// Remove duplicate/old code after AuditLogViewer
// ...existing code...
// Removed duplicate/old code block after AuditLogViewer

// ── UsageStatsPanel Component ────────────────────────────
function UsageStatsPanel({ workspaceId, currentWorkspace }) {
  const [usage, setUsage] = useState({ cases: 0, loading: true });
  const planInfo = subscriptionManager.getPlanInfo();
  const isPro = ['pro', 'team'].includes(planInfo.plan);

  useEffect(() => {
    if (!workspaceId) return;
    storage.listCases(workspaceId, { limit: 1000 })
      .then((cases) => setUsage({ cases: Array.isArray(cases) ? cases.length : 0, loading: false }))
      .catch(() => setUsage({ cases: 0, loading: false }));
  }, [workspaceId]);

  const maxCases = planInfo.plan === 'free' ? 100 : -1;
  const usagePct = maxCases === -1 ? 0 : Math.min(100, Math.round((usage.cases / maxCases) * 100));
  const isOverLimit = maxCases !== -1 && usage.cases > maxCases;
  const isNearLimit = !isOverLimit && maxCases !== -1 && usagePct >= 80;

  const PLAN_COLORS = { free: '#64748b', pro: '#f59e0b', team: '#8b5cf6' };
  const planColor = PLAN_COLORS[planInfo.plan] || '#64748b';

  return (
    <div style={{ direction: 'rtl', maxWidth: 600 }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800 }}>⭐ اشتراكي</h3>

      {/* Plan badge */}
      <div style={{
        padding: '20px 24px', borderRadius: 14,
        background: `linear-gradient(135deg, ${planColor}15, ${planColor}08)`,
        border: `1px solid ${planColor}30`,
        marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>خطتك الحالية</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: planColor }}>
            {planInfo.plan === 'free' ? '🆓 مجاني'
              : planInfo.plan === 'pro' ? '⭐ Pro'
              : '👥 Team'}
          </div>
          {planInfo.expiresAt && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              ⏰ تنتهي: {planInfo.expiresAt.substring(0, 10)}
            </div>
          )}
        </div>
        {!isPro && (
          <a href="/activate" style={{
            padding: '10px 20px', borderRadius: 10,
            background: '#f59e0b', color: 'white',
            fontFamily: 'Cairo', fontSize: 13, fontWeight: 700,
            textDecoration: 'none', display: 'inline-block',
          }}>
            🚀 ترقية إلى Pro
          </a>
        )}
      </div>

      {/* Usage stats */}
      <div style={{ display: 'grid', gap: 14 }}>

        {/* Cases usage */}
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          background: 'white', border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>📁 القضايا</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {usage.loading ? '...' : `${usage.cases} ${maxCases === -1 ? '/ ∞' : `/ ${maxCases}`}`}
            </span>
          </div>
          {maxCases !== -1 && !usage.loading && (
            <>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: isOverLimit ? '#7c3aed' : usagePct > 80 ? '#dc2626' : usagePct > 60 ? '#f59e0b' : '#10b981',
                  width: `${usagePct}%`, transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {usagePct}% من الحد المتاح
                {isOverLimit && (
                  <span style={{ color: '#7c3aed', marginRight: 8, fontWeight: 700 }}>
                    📦 بياناتك محفوظة — الخطة المجانية تسمح بـ {maxCases} قضية جديدة فقط
                  </span>
                )}
                {isNearLimit && !isOverLimit && (
                  <span style={{ color: '#dc2626', marginRight: 8, fontWeight: 700 }}>
                    ⚠️ اقتربت من الحد الأقصى
                  </span>
                )}
              </div>
            </>
          )}
          {maxCases === -1 && (
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
              ✅ غير محدود
            </div>
          )}
        </div>

        {/* Features list */}
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          background: 'white', border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎯 الميزات المتاحة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { feature: 'cases',            label: 'إدارة القضايا' },
              { feature: 'sessions',         label: 'الجلسات' },
              { feature: 'aiAssistant',      label: 'المساعد الذكي' },
              { feature: 'localAttachments', label: 'مرفقات محلية' },
              { feature: 'cloudSync',        label: 'مزامنة سحابية' },
              { feature: 'auditLog',         label: 'سجل التدقيق' },
              { feature: 'exportExcel',      label: 'تصدير Excel' },
              { feature: 'multiUser',        label: 'تعدد المستخدمين' },
            ].map(({ feature, label }) => {
              const has = subscriptionManager.hasFeature(feature);
              return (
                <div key={feature} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: has ? '#1e293b' : '#94a3b8',
                }}>
                  <span style={{ color: has ? '#10b981' : '#cbd5e1', fontSize: 14 }}>
                    {has ? '✓' : '○'}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
