import { useEffect, useMemo, useState } from 'react';
import storage from '@/data/Storage.js';
import SmartImporter from '@/components/import/SmartImporter.jsx';
import DataExporter from '@/components/export/DataExporter.jsx';
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

const SETTINGS_TABS = [
  { id: 'general', label: '⚙️ عام', desc: 'إعدادات مساحة العمل' },
  { id: 'options', label: '📋 الخيارات', desc: 'قوائم الاختيار' },
  { id: 'appearance', label: '🎨 المظهر', desc: 'التخصيص البصري' },
  { id: 'members', label: '👥 الأعضاء', desc: 'إدارة الفريق' },
  { id: 'import', label: '📥 الاستيراد والتصدير', desc: 'استيراد وتصدير البيانات' },
];

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
    .map((rule) => {
      const targetField = allowedFields.has(String(rule?.targetField || '').trim())
        ? String(rule.targetField).trim()
        : 'plaintiffName';
      const triggerKeywords = (Array.isArray(rule?.triggerKeywords)
        ? rule.triggerKeywords
        : splitKeywords(rule?.triggerKeywords)
      )
        .map((keyword) => String(keyword || '').trim())
        .filter(Boolean);
      const reminderMessage = String(rule?.reminderMessage || '').trim();

      if (!triggerKeywords.length || !reminderMessage) return null;

      return {
        id: String(rule?.id || `crr_${Date.now()}`).trim(),
        targetField,
        triggerKeywords,
        reminderMessage,
      };
    })
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

function OptionEditor({ optionType, workspaceId, readOnly = false }) {
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
    setItems(newItems);
    await storage.saveWorkspaceOptions(workspaceId, optionType.key, newItems);
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

  const workspaceId = String(currentWorkspace?.id || '').trim();
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

  const handleMemberRoleChange = async (member, nextRole) => {
    const memberId = String(member?.uid || member?.id || '').trim();
    const ownerId = String(currentWorkspace?.ownerId || '').trim();
    if (!workspaceId || !memberId || memberId === ownerId) return;

    setMemberSavingId(memberId);
    setMemberFeedback({ type: '', text: '' });
    try {
      await storage.updateWorkspaceMemberRole(workspaceId, memberId, nextRole);
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

    const nextActive = member?.isActive === false;
    setMemberSavingId(memberId);
    setMemberFeedback({ type: '', text: '' });
    try {
      await storage.setWorkspaceMemberActive(workspaceId, memberId, nextActive);
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
      const next = normalizeAutomationSettings(normalizeDisplaySettings({
        ...settings,
        customFieldDefinitions: customFieldDefs,
      }), customFieldDefs);
      await storage.updateWorkspaceSettings(workspaceId, next);
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
  }

  function updateCustomField(index, patch) {
    setCustomFieldDefs((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...patch } : field))
    );
  }

  function removeCustomField(index) {
    setCustomFieldDefs((prev) => prev.filter((_, idx) => idx !== index));
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
        {
          id: `crr_${Date.now()}`,
          targetField: 'plaintiffName',
          triggerKeywords: '',
          reminderMessage: '',
        },
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
      </div>

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
            <input
              className="form-input"
              value={settings.defaultCourt || ''}
              onChange={(e) => setSettings((s) => ({ ...s, defaultCourt: e.target.value }))}
              placeholder="مثال: محكمة القضاء الإداري"
              disabled={!canManageWorkspaceSettings}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الدائرة الافتراضية</label>
            <input
              className="form-input"
              value={settings.defaultCircuit || ''}
              onChange={(e) => setSettings((s) => ({ ...s, defaultCircuit: e.target.value }))}
              placeholder="مثال: الدائرة الثالثة"
              disabled={!canManageWorkspaceSettings}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">المستشار الافتراضي</label>
            <input
              className="form-input"
              value={settings.defaultJudge || ''}
              onChange={(e) => setSettings((s) => ({ ...s, defaultJudge: e.target.value }))}
              placeholder="مثال: المستشار / محمد أحمد"
              disabled={!canManageWorkspaceSettings}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">نوع الدعوى الافتراضي</label>
            <select
              className="form-input"
              value={settings.defaultProcedureTrack || ''}
              onChange={(e) => setSettings((s) => ({ ...s, defaultProcedureTrack: e.target.value }))}
              disabled={!canManageWorkspaceSettings}
            >
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
          <h3 style={{ margin: 0, fontSize: 15 }}>🧩 حقول مخصصة</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {customFieldDefs.length}/{MAX_CUSTOM_FIELDS}
            </span>
            <button
              className="btn-secondary"
              onClick={saveSettings}
              disabled={saving || !canManageWorkspaceSettings}
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              {saving ? '...' : '💾 حفظ سريع'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          حقول إضافية تظهر في تفاصيل القضية والنماذج.
          لا تظهر في الكارت الرئيسي.
        </div>

        {customFieldDefs.map((field, index) => (
          <div
            key={field.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 1fr auto',
              gap: 8,
              marginBottom: 8,
              alignItems: 'start',
            }}
          >
            <input
              className="form-input"
              placeholder="اسم الحقل"
              value={field.label}
              disabled={!canManageWorkspaceSettings}
              onChange={(e) => updateCustomField(index, { label: e.target.value })}
            />

            <select
              className="form-input"
              value={field.type}
              disabled={!canManageWorkspaceSettings}
              onChange={(e) => updateCustomField(index, { type: e.target.value })}
            >
              <option value={CUSTOM_FIELD_TYPES.STRING}>نص</option>
              <option value={CUSTOM_FIELD_TYPES.DATE}>تاريخ</option>
              <option value={CUSTOM_FIELD_TYPES.NUMBER}>رقم</option>
              <option value={CUSTOM_FIELD_TYPES.BOOLEAN}>نعم/لا</option>
              <option value={CUSTOM_FIELD_TYPES.DROPDOWN}>قائمة</option>
            </select>

            {field.type === CUSTOM_FIELD_TYPES.DROPDOWN ? (
              <input
                className="form-input"
                placeholder="الخيارات مفصولة بفاصلة: خيار1, خيار2"
                value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                disabled={!canManageWorkspaceSettings}
                onChange={(e) =>
                  updateCustomField(index, {
                    options: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            ) : (
              <div />
            )}

            <button
              onClick={() => removeCustomField(index)}
              disabled={!canManageWorkspaceSettings}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--danger)',
                fontSize: 16,
                padding: '4px 8px',
              }}
              title="حذف الحقل"
            >
              🗑️
            </button>
          </div>
        ))}

        {customFieldDefs.length < MAX_CUSTOM_FIELDS && canManageWorkspaceSettings && (
          <button
            className="btn-secondary"
            onClick={addCustomField}
            style={{ marginTop: 8, fontSize: 13 }}
          >
            + إضافة حقل مخصص
          </button>
        )}
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
            <input
              type="number"
              className="form-input"
              value={settings.appealDeadlineDefault ?? 40}
              onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineDefault: Number(e.target.value || 40) }))}
              disabled={!canManageWorkspaceSettings}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">المحكمة الإدارية العليا (يوم)</label>
            <input
              type="number"
              className="form-input"
              value={settings.appealDeadlineSupremeAdmin ?? 60}
              onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineSupremeAdmin: Number(e.target.value || 60) }))}
              disabled={!canManageWorkspaceSettings}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الوقف الجزائي (يوم)</label>
            <input
              type="number"
              className="form-input"
              value={settings.appealDeadlineSuspension ?? 45}
              onChange={(e) => setSettings((s) => ({ ...s, appealDeadlineSuspension: Number(e.target.value || 45) }))}
              disabled={!canManageWorkspaceSettings}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">تنبيه الوقف الجزائي قبل (يوم)</label>
            <input
              type="number"
              className="form-input"
              value={settings.suspensionWarningDays ?? 30}
              onChange={(e) => setSettings((s) => ({ ...s, suspensionWarningDays: Number(e.target.value || 30) }))}
              disabled={!canManageWorkspaceSettings}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🧭 العرض والتنسيق</h3>
          <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
            {saving ? '...' : '💾 حفظ سريع'}
          </button>
        </div>
        <Toggle
          label="عرض الأرقام بالعربية (١٢٣)"
          value={settings.useArabicNumerals ?? settings.arabicNumerals ?? false}
          onChange={(v) => setSettings((s) => normalizeDisplaySettings({ ...s, useArabicNumerals: v, arabicNumerals: v }))}
          disabled={!canManageWorkspaceSettings}
        />

        <div className="form-group" style={{ margin: '12px 0 0' }}>
          <label className="form-label">طريقة عرض رقم الدعوى</label>
          <select
            className="form-input"
            value={settings.caseNumberDisplayFormat || 'year-slash-number'}
            onChange={(e) => setSettings((s) => normalizeDisplaySettings({ ...s, caseNumberDisplayFormat: e.target.value }))}
            disabled={!canManageWorkspaceSettings}
          >
            <option value="year-slash-number">year-slash-number (72/802)</option>
            <option value="number-sanah-year">number-sanah-year (802 لسنة 72)</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: '12px 0 0' }}>
          <label className="form-label">تنسيق التاريخ</label>
          <select
            className="form-input"
            value={settings.dateDisplayFormat || settings.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => setSettings((s) => normalizeDisplaySettings({ ...s, dateDisplayFormat: e.target.value, dateFormat: e.target.value }))}
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
            disabled={!canManageWorkspaceSettings}
          >
            {DISPLAY_FORMAT_OPTIONS.map((format) => (
              <option key={format} value={format}>
                {getDateFormatOptionLabel(format)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">تعريف العاجل (أيام)</label>
          <input
            type="number"
            className="form-input"
            value={settings.urgentDays ?? 10}
            onChange={(e) => setSettings((s) => ({ ...s, urgentDays: Number(e.target.value || 10) }))}
            disabled={!canManageWorkspaceSettings}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>🤖 القواعد التلقائية</h3>
          <button className="btn-secondary" onClick={saveSettings} disabled={saving || !canManageWorkspaceSettings} style={{ padding: '6px 10px', fontSize: 12 }}>
            {saving ? '...' : '💾 حفظ سريع'}
          </button>
        </div>
        <Toggle
          label="تفعيل القواعد التلقائية"
          value={settings.autoRulesEnabled ?? true}
          onChange={(v) => setSettings((s) => ({ ...s, autoRulesEnabled: v }))}
          disabled={!canManageWorkspaceSettings}
        />
        <Toggle
          label="إنشاء مهمة ميعاد الطعن تلقائياً"
          value={settings.autoCreateAppealTask ?? true}
          onChange={(v) => setSettings((s) => ({ ...s, autoCreateAppealTask: v }))}
          disabled={!canManageWorkspaceSettings}
        />
        <Toggle
          label="تمييز القضايا العاجلة تلقائياً"
          value={settings.autoMarkUrgent ?? true}
          onChange={(v) => setSettings((s) => ({ ...s, autoMarkUrgent: v }))}
          disabled={!canManageWorkspaceSettings}
        />
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
              title={tab.desc}
              style={{ fontSize: 13, padding: '7px 12px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'general' && generalCards}

      {activeTab === 'options' && (
        <div style={{ maxWidth: 920 }}>
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
                <h3 style={{ margin: 0, fontSize: 15 }}>🤖 محرك الأتمتة والذكاء الإجرائي</h3>
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  إعدادات التصنيف الذكي والتذكيرات الديناميكية للقضايا.
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={saveSettings}
                disabled={saving || !canManageWorkspaceSettings}
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
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
              <input
                className="form-input"
                value={Array.isArray(settings.identityKeywords) ? settings.identityKeywords.join(', ') : ''}
                onChange={(e) => updateIdentityKeywords(e.target.value)}
                placeholder="مثال: وزارة، محافظة، شركة"
                disabled={!canManageWorkspaceSettings}
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                الكلمات التي إذا وجدت في اسم المدعي تعتبر القضية (مدعين/هام) تلقائياً. اكتب الكلمات مفصولة بفاصلة عربية (،) أو إنجليزية (,)، وليس Enter أو شرطة.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>قواعد التذكير المخصصة</h4>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addCustomReminderRule}
                  disabled={!canManageWorkspaceSettings}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  + إضافة قاعدة
                </button>
              </div>

              {(Array.isArray(settings.customReminderRules) ? settings.customReminderRules : []).length === 0 ? (
                <div style={{ padding: '12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 13 }}>
                  لا توجد قواعد تذكير ديناميكية بعد.
                </div>
              ) : (
                (Array.isArray(settings.customReminderRules) ? settings.customReminderRules : []).map((rule, index) => (
                  <div
                    key={rule.id || index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '170px 1fr 1fr auto',
                      gap: 8,
                      alignItems: 'start',
                      padding: 10,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: '#fff',
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">الحقل المستهدف</label>
                      <select
                        className="form-input"
                        value={rule.targetField || 'plaintiffName'}
                        onChange={(e) => updateCustomReminderRule(index, { targetField: e.target.value })}
                        disabled={!canManageWorkspaceSettings}
                      >
                        {rule.targetField && !reminderTargetFieldOptions.some((option) => option.value === rule.targetField) ? (
                          <option value={rule.targetField}>{rule.targetField}</option>
                        ) : null}
                        {reminderTargetFieldOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">الكلمات المفتاحية</label>
                      <input
                        className="form-input"
                        value={Array.isArray(rule.triggerKeywords) ? rule.triggerKeywords.join(', ') : (rule.triggerKeywords || '')}
                        onChange={(e) => updateCustomReminderRule(index, { triggerKeywords: e.target.value })}
                        placeholder="مثال: خبراء, إعلان, تنفيذ"
                        disabled={!canManageWorkspaceSettings}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">نص التذكير</label>
                      <input
                        className="form-input"
                        value={rule.reminderMessage || ''}
                        onChange={(e) => updateCustomReminderRule(index, { reminderMessage: e.target.value })}
                        placeholder="نص المهمة أو التنبيه"
                        disabled={!canManageWorkspaceSettings}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCustomReminderRule(index)}
                      disabled={!canManageWorkspaceSettings}
                      style={{
                        alignSelf: 'end',
                        background: 'none',
                        border: 'none',
                        cursor: canManageWorkspaceSettings ? 'pointer' : 'not-allowed',
                        color: 'var(--danger)',
                        fontSize: 16,
                        padding: '8px 10px',
                      }}
                      title="حذف القاعدة"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
            );
          })()}

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
                <OptionEditor optionType={optType} workspaceId={workspaceId} readOnly={!canManageWorkspaceSettings} />
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
