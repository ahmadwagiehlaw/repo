/**
 * LawBase Constants & Configuration
 * ================================
 * Central location for all enums, configuration values, and system constants
 * Prevents magic strings throughout the codebase
 * 
 * @module Constants
 * @version 1.0.0
 */

// ============================================================================
// WORKSPACE ROLES & PERMISSIONS
// ============================================================================

export const WORKSPACE_ROLES = {
  SUPER_ADMIN: 'super_admin',
  WORKSPACE_ADMIN: 'workspace_admin',
  CHIEF_COUNSEL: 'chief_counsel',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  DATA_ENTRY: 'data_entry',
  VIEWER: 'viewer',
  EXTERNAL_COLLABORATOR: 'external_collaborator'
};

// Role-to-permissions mapping
export const ROLE_PERMISSIONS = {
  [WORKSPACE_ROLES.SUPER_ADMIN]: ['*'], // All operations
  
  [WORKSPACE_ROLES.WORKSPACE_ADMIN]: [
    'create_case', 'edit_case', 'delete_case', 'archive_case',
    'create_session', 'edit_session', 'delete_session',
    'create_judgment', 'edit_judgment', 'delete_judgment',
    'manage_users', 'manage_roles', 'edit_rules',
    'view_audit', 'export_data', 'manage_workspace'
  ],
  
  [WORKSPACE_ROLES.CHIEF_COUNSEL]: [
    'create_case', 'edit_case', 'view_case',
    'create_session', 'edit_session', 'view_session',
    'create_judgment', 'edit_judgment', 'view_judgment',
    'create_task', 'edit_task', 'complete_task', 'view_task',
    'view_audit', 'upload_documents', 'view_documents'
  ],
  
  [WORKSPACE_ROLES.EDITOR]: [
    'create_case', 'edit_case', 'view_case',
    'create_session', 'edit_session', 'view_session',
    'create_task', 'edit_task', 'view_task',
    'create_judgment', 'edit_judgment', 'view_judgment',
    'upload_documents', 'view_documents'
  ],
  
  [WORKSPACE_ROLES.REVIEWER]: [
    'view_case', 'edit_case_metadata',
    'view_session', 'view_judgment',
    'create_task', 'complete_task', 'view_task',
    'view_documents'
  ],
  
  [WORKSPACE_ROLES.DATA_ENTRY]: [
    'create_case', 'edit_case_data', 'view_case',
    'create_session', 'edit_session_data', 'view_session',
    'view_judgment', 'upload_documents', 'view_documents'
  ],
  
  [WORKSPACE_ROLES.VIEWER]: [
    'view_case', 'view_session', 'view_judgment',
    'view_task', 'search', 'view_documents'
  ],
  
  [WORKSPACE_ROLES.EXTERNAL_COLLABORATOR]: [
    'view_case', 'view_documents', 'comment_on_case'
  ]
};

// ============================================================================
// CASE STATUSES & LIFECYCLE
// ============================================================================

export const CASE_STATUS = {
  NEW: 'new',
  UNDER_REVIEW: 'under_review',
  ACTIVE: 'active',
  RESERVED_FOR_REPORT: 'reserved_for_report',
  RESERVED_FOR_JUDGMENT: 'reserved_for_judgment',
  JUDGED: 'judged',
  APPEAL_WINDOW_OPEN: 'appeal_window_open',
  SUSPENDED: 'suspended',
  STRUCK_OUT: 'struck_out',
  ARCHIVED: 'archived'
};

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.NEW]: 'جديدة',
  [CASE_STATUS.UNDER_REVIEW]: 'قيد المراجعة',
  [CASE_STATUS.ACTIVE]: 'نشطة',
  [CASE_STATUS.RESERVED_FOR_REPORT]: 'محجوزة للتقرير',
  [CASE_STATUS.RESERVED_FOR_JUDGMENT]: 'محجوزة للحكم',
  [CASE_STATUS.JUDGED]: 'محكوم فيها',
  [CASE_STATUS.APPEAL_WINDOW_OPEN]: 'نافذة التمييز مفتوحة',
  [CASE_STATUS.SUSPENDED]: 'موقوفة',
  [CASE_STATUS.STRUCK_OUT]: 'مشطوبة',
  [CASE_STATUS.ARCHIVED]: 'مؤرشفة'
};

// ============================================================================
// PROCEDURE TRACKS (Legal Categories)
// ============================================================================

export const PROCEDURE_TRACK = {
  CIVIL: 'civil',
  STATE_COUNCIL: 'state_council',
  COMMERCIAL: 'commercial',
  LABOR: 'labor'
};

export const PROCEDURE_TRACK_LABELS = {
  [PROCEDURE_TRACK.CIVIL]: 'مدني',
  [PROCEDURE_TRACK.STATE_COUNCIL]: 'مجلس الدولة',
  [PROCEDURE_TRACK.COMMERCIAL]: 'تجاري',
  [PROCEDURE_TRACK.LABOR]: 'عمل'
};

export const LITIGATION_STAGE_OPTIONS = [
  'متداول',
  'موقوف جزائياً',
  'موقوف تعليقياً',
  'محجوز للحكم',
  'خبراء',
];

export const FIELD_DENSITY = {
  BASIC: 'basic',
  PRO: 'pro',
};

export const BASIC_MODE_HIDDEN_FIELDS = [
  'nextSessionType',
  'circuit',
  'judge',
  'fileLocation',
  'roleCapacity',
  'joinedCases',
  'firstInstanceNumber',
  'firstInstanceCourt',
  'firstInstanceDate',
  'firstInstanceJudgment',
  'chosenHeadquarters',
];

export const WORKSPACE_CASE_DEFAULTS_KEYS = [
  'defaultCourt',
  'defaultCircuit',
  'defaultJudge',
  'defaultProcedureTrack',
];

export const CUSTOM_FIELD_TYPES = {
  STRING: 'string',
  DATE: 'date',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DROPDOWN: 'dropdown',
};

export const MAX_CUSTOM_FIELDS = 15;

// ============================================================================
// SESSION TYPES & STATUS
// ============================================================================

export const SESSION_TYPE = {
  HEARING: 'hearing',
  REVIEW: 'review',
  JUDGMENT_SESSION: 'judgment_session',
  APPEAL_SESSION: 'appeal_session'
};

export const SESSION_TYPE_LABELS = {
  [SESSION_TYPE.HEARING]: 'جلسة استماع',
  [SESSION_TYPE.REVIEW]: 'جلسة مراجعة',
  [SESSION_TYPE.JUDGMENT_SESSION]: 'جلسة النطق بالحكم',
  [SESSION_TYPE.APPEAL_SESSION]: 'جلسة التمييز'
};

export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  HELD: 'held',
  POSTPONED: 'postponed',
  CANCELED: 'canceled',
  NO_SHOW: 'no_show'
};

export const SESSION_STATUS_LABELS = {
  [SESSION_STATUS.SCHEDULED]: 'مجدولة',
  [SESSION_STATUS.HELD]: 'تمت',
  [SESSION_STATUS.POSTPONED]: 'مؤجلة',
  [SESSION_STATUS.CANCELED]: 'ملغاة',
  [SESSION_STATUS.NO_SHOW]: 'لم تتم'
};

// ============================================================================
// JUDGMENT DECISION TYPES
// ============================================================================

export const JUDGMENT_DECISION = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PARTIALLY_ACCEPTED: 'partially_accepted',
  STRUCK_OFF: 'struck_off',
  DISMISSED: 'dismissed'
};

export const JUDGMENT_DECISION_LABELS = {
  [JUDGMENT_DECISION.ACCEPTED]: 'قبول الدعوى',
  [JUDGMENT_DECISION.REJECTED]: 'رفض الدعوى',
  [JUDGMENT_DECISION.PARTIALLY_ACCEPTED]: 'قبول جزئي',
  [JUDGMENT_DECISION.STRUCK_OFF]: 'شطب',
  [JUDGMENT_DECISION.DISMISSED]: 'حفظ'
};

// ============================================================================
// TASK STATUS & PRIORITY
// ============================================================================

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: 'منخفضة',
  [TASK_PRIORITY.MEDIUM]: 'متوسطة',
  [TASK_PRIORITY.HIGH]: 'عالية',
  [TASK_PRIORITY.CRITICAL]: 'حرجة'
};

export const TASK_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELED: 'canceled'
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.OPEN]: 'مفتوحة',
  [TASK_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
  [TASK_STATUS.DONE]: 'مكتملة',
  [TASK_STATUS.CANCELED]: 'ملغاة'
};

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export const DOCUMENT_TYPE = {
  PDF: 'pdf',
  DOC: 'doc',
  IMAGE: 'image',
  SPREADSHEET: 'spreadsheet',
  OTHER: 'other'
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPE.PDF]: 'ملف PDF',
  [DOCUMENT_TYPE.DOC]: 'وثيقة نصية',
  [DOCUMENT_TYPE.IMAGE]: 'صورة',
  [DOCUMENT_TYPE.SPREADSHEET]: 'جدول',
  [DOCUMENT_TYPE.OTHER]: 'أخرى'
};

export const DOCUMENT_CATEGORY = {
  PLEADING: 'pleading',
  JUDGMENT: 'judgment',
  CONTRACT: 'contract',
  APPEAL: 'appeal',
  EVIDENCE: 'evidence'
};

export const DOCUMENT_CATEGORY_LABELS = {
  [DOCUMENT_CATEGORY.PLEADING]: 'دعوى أو مذكرة',
  [DOCUMENT_CATEGORY.JUDGMENT]: 'حكم',
  [DOCUMENT_CATEGORY.CONTRACT]: 'عقد',
  [DOCUMENT_CATEGORY.APPEAL]: 'استئناف',
  [DOCUMENT_CATEGORY.EVIDENCE]: 'دليل'
};

// ============================================================================
// AUDIT LOG ACTIONS
// ============================================================================

export const AUDIT_ACTION = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  UNARCHIVE: 'unarchive',
  EXPORT: 'export',
  IMPORT: 'import',
  SHARE: 'share',
  PERMISSION_CHANGE: 'permission_change'
};

// ============================================================================
// ENTITY TYPES
// ============================================================================

export const ENTITY_TYPE = {
  CASE: 'case',
  SESSION: 'session',
  JUDGMENT: 'judgment',
  TASK: 'task',
  DOCUMENT: 'document',
  USER: 'user',
  WORKSPACE: 'workspace'
};

// ============================================================================
// FIREBASE COLLECTIONS
// ============================================================================

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  USER_PREFERENCES: 'user_preferences',
  WORKSPACE_INVITATIONS: 'workspace_invitations',
  
  // Sub-collections (part of workspace structure)
  MEMBERS: 'members',
  CASES: 'cases',
  SESSIONS: 'sessions',
  JUDGMENTS: 'judgments',
  TASKS: 'tasks',
  DOCUMENTS: 'documents',
  SAVED_VIEWS: 'saved_views',
  COURT_PROFILES: 'court_profiles',
  RULE_PROFILES: 'rule_profiles',
  RULE_LOGS: 'rule_logs',
  AUDIT_LOGS: 'audit_logs'
};

// ============================================================================
// WORKSPACE PLANS & FEATURE GATES
// ============================================================================

export const WORKSPACE_PLAN_FEATURES = {
  free: {
    teamMembers: false,
  },
  pro: {
    teamMembers: false,
  },
  team: {
    teamMembers: true,
  },
};

export function getWorkspacePlanFeatures(plan) {
  const normalizedPlan = String(plan || 'free').trim().toLowerCase() || 'free';
  return WORKSPACE_PLAN_FEATURES[normalizedPlan] || WORKSPACE_PLAN_FEATURES.free;
}

// ============================================================================
// UI ACTIONS & PERMISSIONS
// ============================================================================

export const UI_ACTION = {
  // Case actions
  CREATE_CASE: 'create_case',
  EDIT_CASE: 'edit_case',
  DELETE_CASE: 'delete_case',
  VIEW_CASE: 'view_case',
  ARCHIVE_CASE: 'archive_case',
  
  // Session actions
  CREATE_SESSION: 'create_session',
  EDIT_SESSION: 'edit_session',
  DELETE_SESSION: 'delete_session',
  VIEW_SESSION: 'view_session',
  
  // Judgment actions
  CREATE_JUDGMENT: 'create_judgment',
  EDIT_JUDGMENT: 'edit_judgment',
  DELETE_JUDGMENT: 'delete_judgment',
  
  // Task actions
  CREATE_TASK: 'create_task',
  EDIT_TASK: 'edit_task',
  COMPLETE_TASK: 'complete_task',
  
  // Admin actions
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  EDIT_RULES: 'edit_rules',
  VIEW_AUDIT: 'view_audit',
  
  // Document actions
  UPLOAD_DOCUMENT: 'upload_document',
  DELETE_DOCUMENT: 'delete_document'
};

// ============================================================================
// RULE PROFILE FAMILIES (Legal Specialization)
// ============================================================================

export const LEGAL_BASIS_FAMILY = {
  CIVIL_PROCEDURE: 'civil_procedure',
  STATE_COUNCIL: 'state_council_procedure',
  COMMERCIAL_LAW: 'commercial_law',
  LABOR_LAW: 'labor_law'
};

// ============================================================================
// DATE & TIME CONSTANTS
// ============================================================================

export const DEADLINES = {
  // Civil procedure deadlines (Egyptian Law)
  GENERAL_DEADLINE_DAYS: 15,
  APPEAL_WINDOW_DAYS: 30,
  STRIKE_OFF_OBJECTION_DAYS: 30,
  SERVICE_EXTENSION_DAYS: 10,
  FIRST_DAY_EXCLUDED: true,
  
  // State Council deadlines
  STATE_COUNCIL_CASE_DEADLINE_DAYS: 60,
  MANDATORY_GRIEVANCE_THRESHOLD_DAYS: 30
};

// Egyptian holidays (simplified - can be expanded per court profile)
export const EGYPTIAN_HOLIDAYS = [
  { month: 1, day: 1, name: 'رأس السنة الميلادية' },      // New Year's Day
  { month: 1, day: 25, name: 'عيد الثورة' },            // Revolution Day
  { month: 5, day: 1, name: 'عيد العمال' },             // Labor Day
  { month: 6, day: 30, name: 'عيد الثورة' },            // Revolution Day
  { month: 7, day: 23, name: 'عيد الثورة' },            // Revolution Day
  { month: 10, day: 6, name: 'يوم القوات المسلحة' }      // Armed Forces Day
];

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

export const CONFIG = {
  // App metadata
  APP_NAME: 'LawBase',
  APP_VERSION: '3.0.0',
  APP_DESCRIPTION: 'Legal Operating System for Egyptian Judges & Counselors',
  
  // Firebase configuration
  FIREBASE_PROJECT: 'lawbase-prod',
  
  // UI Constants
  DEFAULT_LANGUAGE: 'ar',
  DEFAULT_THEME: 'light',
  DEFAULT_TIMEZONE: 'Africa/Cairo',
  
  // Pagination
  CASES_PER_PAGE: 50,
  SESSIONS_PER_PAGE: 25,
  TASKS_PER_PAGE: 20,
  
  // File upload
  MAX_FILE_SIZE_MB: 100,
  ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'png'],
  
  // Performance
  QUERY_TIMEOUT_MS: 5000,
  SYNC_DEBOUNCE_MS: 500,
  
  // User voice
  USER_FORM_OF_ADDRESS: 'المستشار' // The Counselor
};

// ============================================================================
// ERROR CODES & MESSAGES
// ============================================================================

export const ERROR_CODES = {
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  FORBIDDEN: 'ERR_FORBIDDEN',
  NOT_FOUND: 'ERR_NOT_FOUND',
  VALIDATION_ERROR: 'ERR_VALIDATION',
  NETWORK_ERROR: 'ERR_NETWORK',
  SYNC_CONFLICT: 'ERR_SYNC_CONFLICT',
  QUOTA_EXCEEDED: 'ERR_QUOTA_EXCEEDED'
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'يرجى تسجيل الدخول أولاً',
  [ERROR_CODES.FORBIDDEN]: 'ليس لديك صلاحية لهذا الإجراء',
  [ERROR_CODES.NOT_FOUND]: 'العنصر المطلوب غير موجود',
  [ERROR_CODES.VALIDATION_ERROR]: 'بيانات غير صحيحة',
  [ERROR_CODES.NETWORK_ERROR]: 'خطأ في الاتصال بالإنترنت',
  [ERROR_CODES.SYNC_CONFLICT]: 'تضارب في المزامنة - يرجى تحديث الصفحة',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'تم تجاوز حد الاستخدام'
};

// ============================================================================
// EXPORT VALIDATION SCHEMAS
// ============================================================================

export const VALIDATION_PATTERNS = {
  CASE_NUMBER: /^\d+\/\d{4}$/, // e.g., 123/2024
  PHONE: /^(\+?20)?[0-9]{10}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ARABIC_TEXT: /[\u0600-\u06FF]/
};

// ============================================================================
// LAWBASE EVENTS CONTRACT — كل الـ custom events في التطبيق هنا فقط
// لا تستخدم string مباشرة في window.dispatchEvent — استخدم من هنا دائماً
// ============================================================================

export const LAWBASE_EVENTS = {
  // ── البيانات ──────────────────────────────────────────────
  DATA_UPDATED:               'lawbase:data-updated',
  CASE_UPDATED:               'lawbase:case-updated',
  SESSION_UPDATED:            'lawbase:session-updated',
  JUDGMENT_UPDATED:           'lawbase:judgment-updated',
  TASK_UPDATED:               'lawbase:task-updated',

  // ── Workspace ─────────────────────────────────────────────
  WORKSPACE_CHANGED:          'lawbase:workspace-changed',
  WORKSPACE_OPTIONS_LOADED:   'lawbase:workspace-options-loaded',

  // ── Navigation ────────────────────────────────────────────
  OPEN_CASE_PANEL:            'lawbase:open-case-panel',
  NAVIGATE_TO:                'lawbase:navigate-to',

  // ── Auth ──────────────────────────────────────────────────
  ADVISOR_UPDATED:            'lawbase:advisor-updated',
  AUTH_STATE_CHANGED:         'lawbase:auth-state-changed',

  // ── Rules Engine ──────────────────────────────────────────
  RULE_EVALUATED:             'lawbase:rule-evaluated',
  FLAGS_UPDATED:              'lawbase:flags-updated',

  // ── Storage & Attachments ─────────────────────────────────
  ATTACHMENT_CACHED:          'lawbase:attachment-cached',
  BLOB_STORED:                'lawbase:blob-stored',
  STORAGE_PROVIDER_CHANGED:   'lawbase:storage-provider-changed',
};

// ============================================================================
// CASE FLAGS — للبادجات الذكية (PATCH 2)
// ============================================================================

export const CASE_FLAGS_DEFAULT = {
  isImportant:  false,   // ⭐ يدوي
  needsReview:  false,   // 🚨 يدوي
  isUrgent:     false,   // ⌛ تلقائي من Rules Engine
  isPlaintiff:  false,   // ⚖️ تلقائي من حقل الصفة
};

export const PLAINTIFF_KEYWORDS = [
  'مدعٍ', 'مدعي', 'مدعون', 'طاعن', 'مستأنف', 'ملتمس',
];

// ============================================================================
// JUDGMENT TYPES — لأجندة الأحكام (PATCH 3)
// ============================================================================

export const JUDGMENT_TYPE = {
  FOR_US:              'for_us',
  AGAINST_US:          'against_us',
  DEEMED_NON_EXISTENT: 'deemed_non_existent',
  PARTIAL:             'partial',
  OTHER:               'other',
};

export const JUDGMENT_TYPE_LABELS = {
  [JUDGMENT_TYPE.FOR_US]:              'لصالحنا',
  [JUDGMENT_TYPE.AGAINST_US]:          'ضدنا',
  [JUDGMENT_TYPE.DEEMED_NON_EXISTENT]: 'اعتبار كأن لم يكن',
  [JUDGMENT_TYPE.PARTIAL]:             'جزئي',
  [JUDGMENT_TYPE.OTHER]:               'أخرى',
};

export const EXECUTION_STATUS = {
  PENDING:        'pending',
  IN_PROGRESS:    'in_progress',
  COMPLETED:      'completed',
  APPEALED:       'appealed',
  NOT_APPLICABLE: 'not_applicable',
};

export const EXECUTION_STATUS_LABELS = {
  [EXECUTION_STATUS.PENDING]:        'قيد الانتظار',
  [EXECUTION_STATUS.IN_PROGRESS]:    'جارٍ التنفيذ',
  [EXECUTION_STATUS.COMPLETED]:      'مكتمل',
  [EXECUTION_STATUS.APPEALED]:       'تم الطعن',
  [EXECUTION_STATUS.NOT_APPLICABLE]: 'لا ينطبق',
};

// ============================================================================
// SESSION VIEW FIELDS — للـ Custom Views (PATCH 6)
// ============================================================================

export const SESSION_VIEW_FIELDS = [
  { id: 'caseNumber',   label: 'رقم القضية' },
  { id: 'court',        label: 'المحكمة' },
  { id: 'title',        label: 'الموضوع' },
  { id: 'decision',     label: 'القرار' },
  { id: 'nextDate',     label: 'الموعد القادم' },
  { id: 'parties',      label: 'الأطراف' },
  { id: 'notes',        label: 'الملاحظات' },
  { id: 'sessionType',  label: 'نوع الجلسة' },
];

// ============================================================================
// ARCHIVE SECTIONS — للأرشيف الذكي (PATCH 7)
// ============================================================================

export const ARCHIVE_SECTIONS = [
  { id: 'session_rolls',   label: 'رولات الجلسات' },
  { id: 'judgment_rolls',  label: 'رولات وحصر الأحكام' },
  { id: 'circulars',       label: 'التعليمات والمنشورات' },
  { id: 'custom',          label: 'قسم مخصص' },
];

// ============================================================================
// STORAGE PROVIDERS — لـ StorageService (P0-C)
// ============================================================================

export const STORAGE_PROVIDER = {
  DRIVE:    'drive',
  FIREBASE: 'firebase',
  LOCAL:    'local',
};

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SUBSCRIPTION_PLAN = {
  FREE:  'free',
  SOLO:  'solo',
  TEAM:  'team',
};

export const PLAN_LIMITS = {
  [SUBSCRIPTION_PLAN.FREE]: {
    maxCases:        50,
    maxMembers:      1,
    maxWorkspaces:   1,
    aiEnabled:       false,
    storageProvider: 'drive',
  },
  [SUBSCRIPTION_PLAN.SOLO]: {
    maxCases:        500,
    maxMembers:      3,
    maxWorkspaces:   1,
    aiEnabled:       false,
    storageProvider: 'drive',
  },
  [SUBSCRIPTION_PLAN.TEAM]: {
    maxCases:        -1,   // unlimited
    maxMembers:      -1,   // unlimited
    maxWorkspaces:   -1,   // unlimited
    aiEnabled:       true,
    storageProvider: 'firebase',
  },
};

// ============================================================================
// MODULE EXPORTS SUMMARY
// ============================================================================

/**
 * Constants module provides:
 * - Workspace roles & permissions
 * - Case, session, judgment, task statuses
 * - Procedure tracks (civil, state council, etc.)
 * - Document types & categories
 * - Audit actions
 * - Firebase collection names
 * - System configuration
 * - Error codes & messages
 * - Validation patterns
 * 
 * Usage:
 * import { CASE_STATUS, WORKSPACE_ROLES, CONFIG } from './Constants.js';
 * 
 * if (userRole === WORKSPACE_ROLES.EDITOR) { ... }
 * caseStatus = CASE_STATUS.ACTIVE;
 * appName = CONFIG.APP_NAME;
 */
