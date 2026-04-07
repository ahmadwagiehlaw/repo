/**
 * RulesBuilder.js
 * ===============
 * Normalizes workspace-defined JSON rules and compiles them into runtime
 * rule objects compatible with the existing RulesEngine catalog contract.
 */

import { TASK_PRIORITY, TASK_STATUS } from '../core/Constants.js';
import { storage } from '../data/Storage.js';
import {
  addBusinessDays,
  addDays,
  isBusinessDay,
  isDeadlineApproaching,
  isDeadlineOverdue,
  normalizeLegalDateInput
} from '../utils/DateUtils.js';

export const CUSTOM_RULE_TRIGGER_EVENTS = Object.freeze({
  ANY: 'any',
  CASE_EVALUATED: 'case_evaluated',
  CASE_UPDATED: 'case_updated',
  CASE_STATUS_UPDATED: 'case_status_updated',
  SESSION_RECORDED: 'session_recorded',
  JUDGMENT_RECORDED: 'judgment_recorded',
  MANUAL: 'manual'
});

export const CUSTOM_RULE_OPERATORS = Object.freeze({
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  INCLUDES: 'includes',
  NOT_INCLUDES: 'not_includes',
  IN: 'in',
  NOT_IN: 'not_in',
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists',
  GREATER_THAN: 'greater_than',
  GREATER_OR_EQUAL: 'greater_or_equal',
  LESS_THAN: 'less_than',
  LESS_OR_EQUAL: 'less_or_equal',
  IS_TRUE: 'is_true',
  IS_FALSE: 'is_false',
  CHANGED: 'changed'
});

export const CUSTOM_RULE_ACTION_KINDS = Object.freeze({
  CREATE_DEADLINE: 'create_deadline',
  CREATE_ALERT: 'create_alert',
  CREATE_TASK: 'create_task',
  UPDATE_CASE: 'update_case'
});

const STORAGE_PREFIX = 'lawbase:customRules:';
const DEFAULT_SOURCE_LAW = 'custom';
const DEFAULT_SOURCE_ARTICLE = '-';
const SUPPORTED_EVENTS = new Set(Object.values(CUSTOM_RULE_TRIGGER_EVENTS));
const SUPPORTED_OPERATORS = new Set(Object.values(CUSTOM_RULE_OPERATORS));
const SUPPORTED_ACTIONS = new Set(Object.values(CUSTOM_RULE_ACTION_KINDS));
const SUPPORTED_PRIORITIES = new Set(Object.values(TASK_PRIORITY));
const SUPPORTED_TASK_STATUSES = new Set(Object.values(TASK_STATUS));

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeRuleId(value, fallback = 'custom_rule') {
  const normalized = normalizeString(value || fallback)
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return normalized || fallback;
}

function normalizeDate(value) {
  return normalizeLegalDateInput(value);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const normalized = normalizeDate(value);
  if (normalized) {
    const [year, month, day] = normalized.split('-').map((part) => Number(part));
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getByPath(target, path) {
  const safePath = normalizeString(path);
  if (!safePath) return target;

  return safePath
    .split('.')
    .filter(Boolean)
    .reduce((accumulator, segment) => {
      if (accumulator == null) return undefined;
      return accumulator[segment];
    }, target);
}

function buildArtifactId(prefix, ...parts) {
  const seed = parts
    .map((part) => normalizeString(part))
    .filter(Boolean)
    .join(':')
    .replace(/[^\p{L}\p{N}:_-]+/gu, '_');

  return `${prefix}:${seed || 'generated'}`;
}

function normalizeReference(reference, fallbackSource = 'case') {
  if (reference && typeof reference === 'object' && !Array.isArray(reference)) {
    if (reference.source === 'literal') {
      return {
        source: 'literal',
        value: reference.value
      };
    }

    return {
      source: normalizeString(reference.source || fallbackSource) || fallbackSource,
      path: normalizeString(reference.path || reference.field || ''),
      value: reference.value
    };
  }

  const text = normalizeString(reference);
  if (!text) {
    return { source: fallbackSource, path: '' };
  }

  if (text === '$today') {
    return { source: 'context', path: 'today' };
  }

  if (text.startsWith('$literal:')) {
    return { source: 'literal', value: text.slice('$literal:'.length) };
  }

  const prefixes = ['case', 'event', 'context', 'generated', 'rule'];
  const matchedPrefix = prefixes.find((prefix) => text.startsWith(`${prefix}.`));
  if (matchedPrefix) {
    return {
      source: matchedPrefix,
      path: text.slice(matchedPrefix.length + 1)
    };
  }

  return {
    source: fallbackSource,
    path: text
  };
}

function resolveReference(reference, runtime, fallbackSource = 'case') {
  const normalized = normalizeReference(reference, fallbackSource);

  if (normalized.source === 'literal') {
    return normalized.value;
  }

  const scope = {
    case: runtime.caseData,
    event: runtime.context?.eventData || {},
    context: runtime.context || {},
    generated: runtime.generated || {},
    rule: runtime.ruleDefinition || {}
  };

  const target = scope[normalized.source];
  if (target == null) return undefined;
  return getByPath(target, normalized.path);
}

function extractChangedFields(eventData = {}) {
  const fields = new Set();

  if (Array.isArray(eventData.changedFields)) {
    eventData.changedFields.forEach((field) => {
      const normalized = normalizeString(field);
      if (normalized) fields.add(normalized);
    });
  }

  if (eventData.changes && typeof eventData.changes === 'object') {
    Object.keys(eventData.changes).forEach((field) => {
      const normalized = normalizeString(field);
      if (normalized) fields.add(normalized);
    });
  }

  if (eventData.field) {
    const normalized = normalizeString(eventData.field);
    if (normalized) fields.add(normalized);
  }

  return Array.from(fields);
}

function resolvePreviousValue(reference, runtime, fallbackSource = 'case') {
  const normalized = normalizeReference(reference, fallbackSource);
  const eventData = runtime.context?.eventData || {};

  if (normalized.source === 'event') {
    return undefined;
  }

  if (eventData.previous && typeof eventData.previous === 'object') {
    const previousScope = {
      caseData: eventData.previous,
      context: runtime.context,
      generated: runtime.generated,
      ruleDefinition: runtime.ruleDefinition
    };
    return resolveReference(
      { source: 'case', path: normalized.path, value: normalized.value },
      previousScope,
      'case'
    );
  }

  if (eventData.changes && typeof eventData.changes === 'object') {
    const directChange = eventData.changes[normalized.path];
    if (directChange && typeof directChange === 'object' && Object.prototype.hasOwnProperty.call(directChange, 'before')) {
      return directChange.before;
    }
  }

  return undefined;
}

function isOfficialHoliday(date, settings = {}) {
  const iso = normalizeDate(date);
  const official = Array.isArray(settings?.officialHolidays) ? settings.officialHolidays : [];
  return Boolean(iso && official.includes(iso));
}

function nextWorkingDay(date, settings = {}) {
  const result = new Date(date);
  while (!isBusinessDay(result) || isOfficialHoliday(result, settings)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function computeDueDate(startDate, days, options = {}, settings = {}) {
  const start = toDate(startDate);
  if (!start) return '';

  const totalDays = Math.max(0, normalizeNumber(days, 0) + normalizeNumber(options.extraDays, 0));
  const excludeStartDay = options.excludeStartDay !== false;
  const businessDaysOnly = normalizeBoolean(options.businessDaysOnly, false);

  if (totalDays === 0) {
    return normalizeDate(nextWorkingDay(start, settings));
  }

  if (businessDaysOnly) {
    if (excludeStartDay) {
      return normalizeDate(nextWorkingDay(addBusinessDays(start, totalDays), settings));
    }

    if (totalDays === 1) {
      return normalizeDate(nextWorkingDay(start, settings));
    }

    return normalizeDate(nextWorkingDay(addBusinessDays(start, totalDays - 1), settings));
  }

  const raw = excludeStartDay
    ? addDays(start, totalDays)
    : addDays(start, Math.max(0, totalDays - 1));

  return normalizeDate(nextWorkingDay(raw, settings));
}

function normalizeComparable(value) {
  if (value == null) return '';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;

  const normalizedDate = normalizeDate(value);
  if (normalizedDate) return normalizedDate;

  return normalizeString(value).toLowerCase();
}

function valueExists(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return normalizeString(value) !== '';
}

function compareNumericOrDate(left, right) {
  const leftDate = normalizeDate(left);
  const rightDate = normalizeDate(right);
  if (leftDate && rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (leftNumber === rightNumber) return 0;
    return leftNumber > rightNumber ? 1 : -1;
  }

  return String(normalizeComparable(left)).localeCompare(String(normalizeComparable(right)));
}

function materializeTemplate(template, runtime, extraScope = {}) {
  const source = String(template ?? '');
  if (!source) return '';

  const scope = {
    case: runtime.caseData,
    context: runtime.context || {},
    event: runtime.context?.eventData || {},
    generated: runtime.generated || {},
    rule: runtime.ruleDefinition || {},
    ...extraScope
  };

  return source.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawToken) => {
    const token = normalizeString(rawToken);
    if (!token) return '';

    if (Object.prototype.hasOwnProperty.call(extraScope, token)) {
      return String(extraScope[token] ?? '');
    }

    const direct = getByPath(scope, token);
    if (direct != null && direct !== '') return String(direct);

    const fallback = getByPath(scope.case, token);
    if (fallback != null && fallback !== '') return String(fallback);

    return '';
  });
}

function createRuleHit(ruleDefinition, generatedIds, explanation) {
  return {
    ruleId: ruleDefinition.id,
    title: ruleDefinition.title,
    sourceLaw: ruleDefinition.sourceLaw,
    sourceArticle: ruleDefinition.sourceArticle,
    matched: true,
    confidence: 'high',
    generated: generatedIds,
    explanation
  };
}

function normalizeTrigger(trigger = {}) {
  const eventTypes = normalizeStringList(trigger.eventTypes || trigger.events || trigger.on)
    .map((eventType) => normalizeString(eventType).toLowerCase())
    .filter((eventType) => SUPPORTED_EVENTS.has(eventType));

  const changedFields = normalizeStringList(trigger.changedFields || trigger.fields);

  return {
    eventTypes,
    changedFields
  };
}

function normalizeOperator(value) {
  const normalized = normalizeString(value).toLowerCase();
  return SUPPORTED_OPERATORS.has(normalized) ? normalized : CUSTOM_RULE_OPERATORS.EQUALS;
}

function normalizeCondition(condition = {}, index = 0) {
  return {
    id: normalizeRuleId(condition.id || `condition_${index + 1}`, `condition_${index + 1}`),
    field: normalizeReference(condition.field || condition.left || condition.reference || '', condition.source || 'case'),
    operator: normalizeOperator(condition.operator),
    value: condition.value,
    valueFrom: condition.valueFrom ? normalizeReference(condition.valueFrom, condition.valueSource || 'case') : null,
    values: Array.isArray(condition.values)
      ? condition.values
      : (Array.isArray(condition.anyOf) ? condition.anyOf : [])
  };
}

function normalizePriority(value, fallback = TASK_PRIORITY.MEDIUM) {
  const normalized = normalizeString(value).toLowerCase();
  return SUPPORTED_PRIORITIES.has(normalized) ? normalized : fallback;
}

function normalizeTaskStatus(value, fallback = TASK_STATUS.OPEN) {
  const normalized = normalizeString(value).toLowerCase();
  return SUPPORTED_TASK_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeActionKind(value) {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'deadline') return CUSTOM_RULE_ACTION_KINDS.CREATE_DEADLINE;
  if (normalized === 'alert') return CUSTOM_RULE_ACTION_KINDS.CREATE_ALERT;
  if (normalized === 'task') return CUSTOM_RULE_ACTION_KINDS.CREATE_TASK;
  if (['update', 'patch_case', 'update_case'].includes(normalized)) return CUSTOM_RULE_ACTION_KINDS.UPDATE_CASE;
  return SUPPORTED_ACTIONS.has(normalized) ? normalized : CUSTOM_RULE_ACTION_KINDS.UPDATE_CASE;
}

function normalizeAction(action = {}, index = 0) {
  const kind = normalizeActionKind(action.kind || action.type);
  const normalized = {
    id: normalizeRuleId(action.id || `${kind}_${index + 1}`, `${kind}_${index + 1}`),
    kind
  };

  if (kind === CUSTOM_RULE_ACTION_KINDS.CREATE_DEADLINE) {
    return {
      ...normalized,
      deadlineType: normalizeString(action.deadlineType || action.typeLabel || 'custom_deadline') || 'custom_deadline',
      label: normalizeString(action.label || action.title || 'ميعاد مخصص') || 'ميعاد مخصص',
      anchor: normalizeReference(action.anchor || action.anchorField || action.startDateField || '$today', action.anchorSource || 'case'),
      offsetDays: normalizeNumber(action.offsetDays ?? action.days, 0),
      extraDays: normalizeNumber(action.extraDays, 0),
      extraDaysFrom: action.extraDaysFrom ? normalizeReference(action.extraDaysFrom, 'case') : null,
      excludeStartDay: action.excludeStartDay !== false,
      businessDaysOnly: normalizeBoolean(action.businessDaysOnly, false),
      sourceLaw: normalizeString(action.sourceLaw || DEFAULT_SOURCE_LAW) || DEFAULT_SOURCE_LAW,
      sourceArticle: normalizeString(action.sourceArticle || DEFAULT_SOURCE_ARTICLE) || DEFAULT_SOURCE_ARTICLE,
      basedOnEventIdFrom: action.basedOnEventIdFrom ? normalizeReference(action.basedOnEventIdFrom, 'event') : null,
      status: normalizeString(action.status || 'active') || 'active',
      riskLevel: normalizeString(action.riskLevel).toLowerCase(),
      warningDays: action.warningDays !== undefined ? normalizeNumber(action.warningDays, 0) : null,
      criticalDays: action.criticalDays !== undefined ? normalizeNumber(action.criticalDays, 0) : null,
      reasonTemplate: String(action.reasonTemplate || action.reasonText || '').trim()
    };
  }

  if (kind === CUSTOM_RULE_ACTION_KINDS.CREATE_ALERT) {
    return {
      ...normalized,
      alertType: normalizeString(action.alertType || action.typeLabel || 'deadline') || 'deadline',
      title: normalizeString(action.title || 'تنبيه إجرائي') || 'تنبيه إجرائي',
      messageTemplate: String(action.messageTemplate || action.message || '').trim(),
      severity: normalizeString(action.severity || 'info').toLowerCase() || 'info',
      dueDateFrom: action.dueDateFrom
        ? normalizeReference(action.dueDateFrom, 'generated')
        : normalizeReference('generated.latestDeadline.dueDate', 'generated')
    };
  }

  if (kind === CUSTOM_RULE_ACTION_KINDS.CREATE_TASK) {
    return {
      ...normalized,
      title: normalizeString(action.title || 'مهمة آلية') || 'مهمة آلية',
      descriptionTemplate: String(action.descriptionTemplate || action.description || '').trim(),
      anchor: normalizeReference(action.anchor || action.anchorField || action.startDateField || '$today', action.anchorSource || 'case'),
      delayDays: normalizeNumber(action.delayDays ?? action.offsetDays ?? action.days, 0),
      dueDateFrom: action.dueDateFrom
        ? normalizeReference(action.dueDateFrom, 'generated')
        : normalizeReference('generated.latestDeadline.dueDate', 'generated'),
      priority: normalizePriority(action.priority),
      status: normalizeTaskStatus(action.status)
    };
  }

  const singleField = normalizeString(action.field);
  const updates = action.updates && typeof action.updates === 'object'
    ? { ...action.updates }
    : {};

  if (singleField) {
    updates[singleField] = action.value;
  }

  return {
    ...normalized,
    field: singleField,
    value: action.value,
    valueFrom: action.valueFrom ? normalizeReference(action.valueFrom, 'case') : null,
    updates
  };
}

function normalizeActions(actions) {
  const source = Array.isArray(actions)
    ? actions
    : (actions && typeof actions === 'object' ? [actions] : []);

  return source
    .map((action, index) => normalizeAction(action, index))
    .filter((action) => action.kind);
}

export function normalizeCustomRuleDefinition(rule = {}, index = 0) {
  const title = normalizeString(rule.title || rule.label || `قاعدة مخصصة ${index + 1}`) || `قاعدة مخصصة ${index + 1}`;

  return {
    id: normalizeRuleId(rule.id || title, `custom_rule_${index + 1}`),
    title,
    description: normalizeString(rule.description),
    enabled: rule.enabled !== false,
    sourceLaw: normalizeString(rule.sourceLaw || DEFAULT_SOURCE_LAW) || DEFAULT_SOURCE_LAW,
    sourceArticle: normalizeString(rule.sourceArticle || DEFAULT_SOURCE_ARTICLE) || DEFAULT_SOURCE_ARTICLE,
    trigger: normalizeTrigger(rule.trigger || {}),
    conditions: (Array.isArray(rule.conditions) ? rule.conditions : (Array.isArray(rule.when) ? rule.when : (rule.when ? [rule.when] : [])))
      .map((condition, conditionIndex) => normalizeCondition(condition, conditionIndex)),
    actions: normalizeActions(rule.actions || rule.then || []),
    hitExplanation: String(rule.hitExplanation || rule.explanation || '').trim(),
    tags: normalizeStringList(rule.tags || [])
  };
}

export function normalizeCustomRuleDefinitions(rules = []) {
  const source = Array.isArray(rules) ? rules : [];
  const seen = new Set();

  return source
    .map((rule, index) => normalizeCustomRuleDefinition(rule, index))
    .filter((rule) => {
      if (!rule.id || !rule.title || rule.actions.length === 0) return false;
      if (seen.has(rule.id)) return false;
      seen.add(rule.id);
      return true;
    });
}

export function getCustomRulesStorageKey(workspaceId) {
  return storage.getWorkspaceStorageKey('customRules', workspaceId);
}

export function loadCustomRuleDefinitions(workspaceId) {
  try {
    const parsed = storage.loadWorkspaceLocalState('customRules', workspaceId, [], {
      legacyKeys: [STORAGE_PREFIX]
    });
    return normalizeCustomRuleDefinitions(parsed);
  } catch (error) {
    console.warn('Failed to load custom rules:', error);
    return [];
  }
}

export function saveCustomRuleDefinitions(workspaceId, rules = []) {
  const payload = normalizeCustomRuleDefinitions(rules);
  storage.saveWorkspaceLocalState('customRules', workspaceId, payload);
  return payload;
}

export function parseCustomRulesJson(input) {
  if (Array.isArray(input)) {
    return normalizeCustomRuleDefinitions(input);
  }

  if (input && typeof input === 'object') {
    const rules = Array.isArray(input.rules) ? input.rules : [];
    return normalizeCustomRuleDefinitions(rules);
  }

  const text = normalizeString(input);
  if (!text) return [];

  const parsed = JSON.parse(text);
  return parseCustomRulesJson(parsed);
}

function matchesTrigger(ruleDefinition, runtime) {
  const eventTypes = ruleDefinition.trigger?.eventTypes || [];
  const changedFields = ruleDefinition.trigger?.changedFields || [];
  const eventType = normalizeString(runtime.context?.eventType).toLowerCase();

  if (eventTypes.length > 0 && eventType && !eventTypes.includes(CUSTOM_RULE_TRIGGER_EVENTS.ANY) && !eventTypes.includes(eventType)) {
    return false;
  }

  if (changedFields.length > 0) {
    const actualChangedFields = extractChangedFields(runtime.context?.eventData || {});
    if (actualChangedFields.length > 0) {
      const changedSet = new Set(actualChangedFields.map((field) => normalizeString(field)));
      const hasMatch = changedFields.some((field) => changedSet.has(normalizeString(field)));
      if (!hasMatch) return false;
    }
  }

  return true;
}

function evaluateCondition(condition, runtime) {
  const actualValue = resolveReference(condition.field, runtime, 'case');
  const expectedValue = condition.valueFrom
    ? resolveReference(condition.valueFrom, runtime, 'case')
    : condition.value;
  const expectedValues = condition.values || [];

  switch (condition.operator) {
    case CUSTOM_RULE_OPERATORS.EXISTS:
      return valueExists(actualValue);
    case CUSTOM_RULE_OPERATORS.NOT_EXISTS:
      return !valueExists(actualValue);
    case CUSTOM_RULE_OPERATORS.IS_TRUE:
      return normalizeBoolean(actualValue, false) === true;
    case CUSTOM_RULE_OPERATORS.IS_FALSE:
      return normalizeBoolean(actualValue, false) === false;
    case CUSTOM_RULE_OPERATORS.INCLUDES:
      if (Array.isArray(actualValue)) {
        return actualValue.map((value) => normalizeComparable(value)).includes(normalizeComparable(expectedValue));
      }
      return String(normalizeComparable(actualValue)).includes(String(normalizeComparable(expectedValue)));
    case CUSTOM_RULE_OPERATORS.NOT_INCLUDES:
      if (Array.isArray(actualValue)) {
        return !actualValue.map((value) => normalizeComparable(value)).includes(normalizeComparable(expectedValue));
      }
      return !String(normalizeComparable(actualValue)).includes(String(normalizeComparable(expectedValue)));
    case CUSTOM_RULE_OPERATORS.IN:
      return expectedValues.map((value) => normalizeComparable(value)).includes(normalizeComparable(actualValue));
    case CUSTOM_RULE_OPERATORS.NOT_IN:
      return !expectedValues.map((value) => normalizeComparable(value)).includes(normalizeComparable(actualValue));
    case CUSTOM_RULE_OPERATORS.GREATER_THAN:
      return compareNumericOrDate(actualValue, expectedValue) > 0;
    case CUSTOM_RULE_OPERATORS.GREATER_OR_EQUAL:
      return compareNumericOrDate(actualValue, expectedValue) >= 0;
    case CUSTOM_RULE_OPERATORS.LESS_THAN:
      return compareNumericOrDate(actualValue, expectedValue) < 0;
    case CUSTOM_RULE_OPERATORS.LESS_OR_EQUAL:
      return compareNumericOrDate(actualValue, expectedValue) <= 0;
    case CUSTOM_RULE_OPERATORS.NOT_EQUALS:
      return normalizeComparable(actualValue) !== normalizeComparable(expectedValue);
    case CUSTOM_RULE_OPERATORS.CHANGED: {
      const previousValue = resolvePreviousValue(condition.field, runtime, 'case');
      return normalizeComparable(previousValue) !== normalizeComparable(actualValue);
    }
    case CUSTOM_RULE_OPERATORS.EQUALS:
    default:
      return normalizeComparable(actualValue) === normalizeComparable(expectedValue);
  }
}

function buildDeadlineActionOutput(ruleDefinition, action, runtime) {
  const startDate = normalizeDate(
    resolveReference(action.anchor, runtime, 'case')
    || runtime.context?.today
    || new Date().toISOString()
  );

  if (!startDate) return null;

  const resolvedExtraDays = action.extraDaysFrom
    ? normalizeNumber(resolveReference(action.extraDaysFrom, runtime, 'case'), 0)
    : 0;

  const dueDate = computeDueDate(startDate, action.offsetDays, {
    excludeStartDay: action.excludeStartDay,
    businessDaysOnly: action.businessDaysOnly,
    extraDays: action.extraDays + resolvedExtraDays
  }, runtime.settings);

  if (!dueDate) return null;

  const dueDateValue = toDate(dueDate);
  const warningDays = action.warningDays ?? normalizeNumber(runtime.settings?.alertThresholds?.defaultWarningDays, 7);
  const criticalDays = action.criticalDays ?? normalizeNumber(runtime.settings?.alertThresholds?.defaultCriticalDays, 3);

  let riskLevel = action.riskLevel || 'normal';
  if (!action.riskLevel && dueDateValue) {
    if (isDeadlineOverdue(dueDateValue) || isDeadlineApproaching(dueDateValue, criticalDays)) {
      riskLevel = 'critical';
    } else if (isDeadlineApproaching(dueDateValue, warningDays)) {
      riskLevel = 'high';
    }
  }

  const deadline = {
    id: buildArtifactId('deadline', ruleDefinition.id, action.id, runtime.caseData?.id, dueDate),
    type: action.deadlineType,
    label: materializeTemplate(action.label, runtime, { startDate, dueDate }),
    startDate,
    dueDate,
    status: action.status,
    sourceLaw: action.sourceLaw || ruleDefinition.sourceLaw,
    sourceArticle: action.sourceArticle || ruleDefinition.sourceArticle,
    sourceRuleId: ruleDefinition.id,
    basedOnEventId: action.basedOnEventIdFrom
      ? String(resolveReference(action.basedOnEventIdFrom, runtime, 'event') || '')
      : '',
    reasonText: materializeTemplate(
      action.reasonTemplate || `تم إنشاء ${action.label} بدءًا من ${startDate} حتى ${dueDate}.`,
      runtime,
      { startDate, dueDate }
    ),
    riskLevel,
    autoGenerated: true
  };

  runtime.generated.latestDeadline = deadline;
  runtime.output.deadlines.push(deadline);
  return deadline;
}

function buildAlertActionOutput(ruleDefinition, action, runtime) {
  const dueDate = normalizeDate(
    resolveReference(action.dueDateFrom, runtime, 'generated')
    || runtime.generated.latestDeadline?.dueDate
    || runtime.context?.today
    || new Date().toISOString()
  );

  const alert = {
    id: buildArtifactId('alert', ruleDefinition.id, action.id, runtime.caseData?.id, dueDate),
    type: action.alertType,
    title: materializeTemplate(action.title, runtime, { dueDate }),
    message: materializeTemplate(
      action.messageTemplate || `تنبيه مرتبط بالقاعدة ${ruleDefinition.title}.`,
      runtime,
      { dueDate }
    ),
    severity: action.severity || 'info',
    dueDate,
    sourceRuleId: ruleDefinition.id,
    dismissed: false,
    createdAt: new Date().toISOString()
  };

  runtime.generated.latestAlert = alert;
  runtime.output.alerts.push(alert);
  return alert;
}

function buildTaskActionOutput(ruleDefinition, action, runtime) {
  const anchorDate = normalizeDate(
    resolveReference(action.anchor, runtime, 'case')
    || runtime.context?.eventData?.sessionDate
    || runtime.context?.eventData?.date
    || runtime.caseData?.lastSessionDate
    || runtime.context?.today
    || new Date().toISOString()
  );
  const dueDate = normalizeDate(
    resolveReference(action.dueDateFrom, runtime, 'generated')
    || runtime.generated.latestDeadline?.dueDate
    || computeDueDate(anchorDate, action.delayDays, { excludeStartDay: true }, runtime.settings)
    || runtime.context?.today
    || new Date().toISOString()
  );

  const task = {
    id: buildArtifactId('task', ruleDefinition.id, action.id, runtime.caseData?.id, dueDate),
    title: materializeTemplate(action.title, runtime, { dueDate }),
    description: materializeTemplate(action.descriptionTemplate || '', runtime, { dueDate }),
    dueDate,
    priority: action.priority,
    status: action.status,
    sourceRuleId: ruleDefinition.id,
    generatedFrom: {
      type: 'rule_task',
      id: action.id
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  runtime.generated.latestTask = task;
  runtime.output.tasks.push(task);
  return task;
}

function buildUpdateActionOutput(action, runtime) {
  if (action.field) {
    runtime.output.updates[action.field] = action.valueFrom
      ? resolveReference(action.valueFrom, runtime, 'case')
      : action.value;
  }

  Object.entries(action.updates || {}).forEach(([field, value]) => {
    const safeField = normalizeString(field);
    if (!safeField) return;

    if (typeof value === 'string') {
      runtime.output.updates[safeField] = materializeTemplate(value, runtime);
      return;
    }

    runtime.output.updates[safeField] = value;
  });
}

function executeRuleActions(ruleDefinition, runtime) {
  const generatedIds = {
    deadlines: [],
    alerts: [],
    tasks: []
  };

  for (const action of ruleDefinition.actions || []) {
    if (action.kind === CUSTOM_RULE_ACTION_KINDS.CREATE_DEADLINE) {
      const deadline = buildDeadlineActionOutput(ruleDefinition, action, runtime);
      if (deadline) generatedIds.deadlines.push(deadline.id);
      continue;
    }

    if (action.kind === CUSTOM_RULE_ACTION_KINDS.CREATE_ALERT) {
      const alert = buildAlertActionOutput(ruleDefinition, action, runtime);
      if (alert) generatedIds.alerts.push(alert.id);
      continue;
    }

    if (action.kind === CUSTOM_RULE_ACTION_KINDS.CREATE_TASK) {
      const task = buildTaskActionOutput(ruleDefinition, action, runtime);
      if (task) generatedIds.tasks.push(task.id);
      continue;
    }

    if (action.kind === CUSTOM_RULE_ACTION_KINDS.UPDATE_CASE) {
      buildUpdateActionOutput(action, runtime);
    }
  }

  const explanation = materializeTemplate(
    ruleDefinition.hitExplanation || 'تم تطبيق القاعدة المخصصة {{rule.title}}.',
    runtime,
    {
      deadlineCount: generatedIds.deadlines.length,
      alertCount: generatedIds.alerts.length,
      taskCount: generatedIds.tasks.length
    }
  );

  runtime.output.hits.push(createRuleHit(ruleDefinition, generatedIds, explanation));
}

function createRuntimeRule(ruleDefinition) {
  return {
    id: ruleDefinition.id,
    title: ruleDefinition.title,
    sourceLaw: ruleDefinition.sourceLaw,
    sourceArticle: ruleDefinition.sourceArticle,
    enabledByDefault: ruleDefinition.enabled !== false,
    appliesWhen({ caseData, context = {}, settings = {} }) {
      const runtime = {
        caseData,
        context,
        settings,
        generated: {},
        output: { updates: {}, deadlines: [], alerts: [], tasks: [], hits: [] },
        ruleDefinition
      };

      if (!matchesTrigger(ruleDefinition, runtime)) {
        return false;
      }

      return ruleDefinition.conditions.every((condition) => evaluateCondition(condition, runtime));
    },
    compute({ caseData, context = {}, settings = {} }) {
      const runtime = {
        caseData,
        context,
        settings,
        generated: {},
        output: { updates: {}, deadlines: [], alerts: [], tasks: [], hits: [] },
        ruleDefinition
      };

      executeRuleActions(ruleDefinition, runtime);
      return runtime.output;
    },
    __customRuleDefinition: ruleDefinition
  };
}

export function compileCustomRules(ruleDefinitions = []) {
  return normalizeCustomRuleDefinitions(ruleDefinitions).map((ruleDefinition) => createRuntimeRule(ruleDefinition));
}

export function compileCustomRulesFromJson(input) {
  return compileCustomRules(parseCustomRulesJson(input));
}

export default {
  CUSTOM_RULE_TRIGGER_EVENTS,
  CUSTOM_RULE_OPERATORS,
  CUSTOM_RULE_ACTION_KINDS,
  getCustomRulesStorageKey,
  loadCustomRuleDefinitions,
  saveCustomRuleDefinitions,
  parseCustomRulesJson,
  normalizeCustomRuleDefinition,
  normalizeCustomRuleDefinitions,
  compileCustomRules,
  compileCustomRulesFromJson
};
