/**
 * RulesEngine.js
 * ==============
 * Deterministic litigation rules evaluator for LawBase.
 *
 * This engine is a workflow assistant and deadline intelligence layer.
 * It does not replace legal judgment and all outputs remain reviewable.
 */

import {
  addDays,
  isBusinessDay,
  isDeadlineApproaching,
  isDeadlineOverdue,
  normalizeLegalDateInput
} from '../utils/DateUtils.js';
import { compileCustomRules } from './RulesBuilder.js';
import { storage } from '../data/Storage.js';

const DEFAULT_SETTINGS = {
  enabled: true,
  autoGenerateTasks: true,
  autoGenerateAlerts: true,
  autoSuggestStatus: true,
  allowManualOverride: true,
  customRules: {
    enabled: true,
    lazyLoad: true
  },
  officialHolidays: [],
  alertThresholds: {
    defaultWarningDays: 7,
    defaultCriticalDays: 3,
    strikeOffWarningDays: 15,
    strikeOffCriticalDays: 5,
    grievanceWarningDays: 7,
    grievanceCriticalDays: 3,
    appealWarningDays: 7,
    appealCriticalDays: 3
  },
  distanceRules: {
    enabled: true,
    localExtraDays: 0,
    abroadExtraDays: 60
  },
  phraseMappings: {
    struckOut: ['شطب'],
    referral: ['إحالة', 'احالة'],
    reservedForJudgment: ['للحكم', 'حجز للحكم'],
    judgmentIssued: ['حكم', 'قضت المحكمة'],
    disciplinarySuspension: ['وقف جزائي']
  },
  appealProfiles: {
    defaultDays: 40,
    supremeAdministrativeDays: 60
  }
};

function normalizeDate(value) {
  return normalizeLegalDateInput(value);
}

function makeId(prefix, seed) {
  const normalized = String(seed || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}:${normalized}:${Date.now()}`;
}

function makeStableId(prefix, seed) {
  const normalized = String(seed || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}:${normalized}`;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const normalizedLegal = normalizeLegalDateInput(value);
  const rawText = typeof value === 'string' ? String(value).trim() : '';
  const isDateOnlyValue = (
    typeof value === 'number'
    || (rawText !== '' && !rawText.includes('T') && !rawText.includes(':'))
  );
  if (normalizedLegal && isDateOnlyValue) {
    const [year, month, day] = normalizedLegal.split('-').map((part) => Number(part));
    if (year && month && day) {
      const safeDate = new Date(year, month - 1, day);
      return Number.isNaN(safeDate.getTime()) ? null : safeDate;
    }
  }
  return null;
}

function isOfficialHoliday(date, settings = {}) {
  const iso = normalizeDate(date);
  const official = settings?.officialHolidays || [];
  return official.includes(iso);
}

function nextWorkingDay(date, settings = {}) {
  const result = new Date(date);
  while (!isBusinessDay(result) || isOfficialHoliday(result, settings)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function computeDueDate(startDate, days, { excludeStartDay = true, extraDays = 0 } = {}, settings = {}) {
  const start = toDate(startDate);
  if (!start) return '';
  const totalDays = Number(days || 0) + Number(extraDays || 0);
  if (totalDays < 0) {
    return normalizeDate(addDays(start, totalDays));
  }
  if (totalDays === 0) return normalizeDate(start);
  const base = new Date(start);
  if (excludeStartDay) {
    base.setDate(base.getDate() + 1);
  }
  const raw = addDays(base, totalDays - 1);
  return normalizeDate(nextWorkingDay(raw, settings));
}

function getCaseProceduralAnchor(caseData) {
  return normalizeDate(
    caseData?.proceduralStartDate
    || caseData?.decisionKnowledgeDate
    || caseData?.serviceCompletedDate
    || caseData?.lastSessionDate
    || caseData?.createdAt
  );
}

function normalizeJudicialYear(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return /^\d{2,}$/.test(normalized) ? normalized : '';
}

function includesAny(text, phrases = []) {
  const source = String(text || '').toLowerCase();
  return phrases.some((phrase) => source.includes(String(phrase || '').toLowerCase()));
}

function readCasePath(caseData, path) {
  const parts = String(path || '').split('.').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return '';
  if (parts.some((part) => ['__proto__', 'prototype', 'constructor'].includes(part))) return '';
  let value = caseData;
  for (const part of parts) {
    if (!value || typeof value !== 'object') return '';
    value = value[part];
  }
  return value ?? '';
}

function getCustomReminderRuleId(rule, index) {
  const explicitId = String(rule?.id || '').trim();
  if (explicitId) return explicitId;

  const condition1 = getCustomReminderCondition(rule, 'condition1');

  return [
    index,
    condition1.field,
    condition1.keywords.map((keyword) => String(keyword || '').trim().toLowerCase()).filter(Boolean).sort().join(','),
    getCustomReminderActions(rule).taskMessage
  ].join('|');
}

function getCustomReminderTaskId(caseId, rule, index) {
  return makeStableId('task', `dynamic-reminder-${caseId}-${getCustomReminderRuleId(rule, index)}`);
}

function getCustomReminderKeywords(value) {
  return (Array.isArray(value) ? value : String(value || '').split(/[,\u060C]/))
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);
}

function getCustomReminderCondition(rule, key) {
  const source = rule?.[key] || {};
  const legacyField = key === 'condition1' ? rule?.targetField : '';
  const legacyKeywords = key === 'condition1' ? rule?.triggerKeywords : [];

  return {
    field: String(source.field || legacyField || (key === 'condition2' ? 'roleCapacity' : 'plaintiffName')).trim(),
    keywords: getCustomReminderKeywords(source.keywords ?? legacyKeywords),
    enabled: key === 'condition1' ? true : Boolean(source.enabled),
  };
}

function getCustomReminderActions(rule) {
  const actions = rule?.actions || {};
  const taskMessage = String(actions.taskMessage ?? rule?.reminderMessage ?? '').trim();

  return {
    createTask: Boolean(actions.createTask ?? taskMessage),
    taskMessage,
    updateField: Boolean(actions.updateField),
    targetField: String(actions.targetField || '').trim(),
    newValue: String(actions.newValue || '').trim(),
    doRollover: Boolean(actions.doRollover),
    targetRoute: String(actions.targetRoute || '').trim(),
  };
}

function matchesCustomReminderCondition(caseData, condition) {
  const normalizedKeywords = getCustomReminderKeywords(condition.keywords)
    .map((keyword) => keyword.toLowerCase())
    .filter(Boolean);
  if (!condition.field || !normalizedKeywords.length) return false;
  const targetText = String(readCasePath(caseData, condition.field) || '').toLowerCase();
  return normalizedKeywords.some((keyword) => targetText.includes(keyword));
}

function applyCustomReminderFieldUpdate(updates, caseData, field, value) {
  if (!field) return;
  if (field.startsWith('customFields.')) {
    const customFieldKey = field.split('.').slice(1).join('.').trim();
    if (!customFieldKey || ['__proto__', 'prototype', 'constructor'].includes(customFieldKey)) return;
    updates.customFields = {
      ...(caseData?.customFields || {}),
      ...(updates.customFields || {}),
      [customFieldKey]: value,
    };
    return;
  }
  updates[field] = value;
}

function getCustomReminderRoutePatch(targetRoute) {
  switch (targetRoute) {
    case 'judgments':
      return { agendaRoute: 'judgments', status: 'reserved_for_judgment' };
    case 'chamber':
      return { agendaRoute: 'chamber', status: 'under_review' };
    case 'referred':
      return { agendaRoute: 'referred', status: 'under_review' };
    case 'archive':
      return { agendaRoute: 'archive', status: 'archived' };
    case 'sessions':
    default:
      return { agendaRoute: 'sessions', status: 'active' };
  }
}

function isStruckOutStatus(caseData, settings) {
  const statusText = String(
    caseData?.operationalStatus
    || caseData?.status
    || caseData?.baseStatus
    || ''
  ).toLowerCase();

  return statusText.includes('struck_out') || includesAny(statusText, settings?.phraseMappings?.struckOut || []);
}

function getAppealWindowDays(caseData, judgment, settings) {
  if (Number(judgment?.appealWindowDays) > 0) {
    return Number(judgment.appealWindowDays);
  }

  const courtText = `${caseData?.court || ''} ${caseData?.circuit || ''} ${caseData?.circuitType || ''}`.toLowerCase();
  const family = String(caseData?.caseFamily || '').toLowerCase();
  const legalFamily = String(caseData?.legalBasisFamily || '').toLowerCase();
  const isAdministrative = family.includes('administrative') || family.includes('state_council') || legalFamily.includes('state_council') || /مجلس\s*الدولة|إدار/i.test(courtText);
  const isSupremeAdmin = /supreme\s*administrative|المحكمة\s*الإدارية\s*العليا/i.test(courtText);

  if (isSupremeAdmin || isAdministrative) {
    return Number(settings.appealProfiles?.supremeAdministrativeDays || 60);
  }

  return Number(settings.appealProfiles?.defaultDays || 40);
}

function hasOverride(manualRuleOverrides = [], ruleId) {
  return (manualRuleOverrides || []).some((item) => item.ruleId === ruleId && item.mode === 'disable');
}

function createRuleHit(rule, generatedIds, explanation) {
  return {
    ruleId: rule.id,
    title: rule.title,
    sourceLaw: rule.sourceLaw,
    sourceArticle: rule.sourceArticle,
    matched: true,
    confidence: 'high',
    generated: generatedIds,
    explanation
  };
}

function getRuleConditionValue(ruleDefinition, fieldName = 'status') {
  const conditions = Array.isArray(ruleDefinition?.conditions) ? ruleDefinition.conditions : [];
  const target = conditions.find((condition) => String(condition?.field || '').trim() === fieldName);
  return target ? String(target.value || '').trim() : '';
}

function getRuleTaskAction(ruleDefinition) {
  const actions = Array.isArray(ruleDefinition?.actions) ? ruleDefinition.actions : [];
  return actions.find((action) => String(action?.kind || '').trim() === 'create_task') || null;
}

function isVisualStatusTaskRuleDefinition(ruleDefinition) {
  if (!ruleDefinition || typeof ruleDefinition !== 'object') return false;

  const triggerEvents = Array.isArray(ruleDefinition.trigger?.eventTypes) ? ruleDefinition.trigger.eventTypes : [];
  const hasStatusTrigger = triggerEvents.includes('case_status_updated');
  const statusValue = getRuleConditionValue(ruleDefinition, 'status');
  const taskAction = getRuleTaskAction(ruleDefinition);

  return Boolean(hasStatusTrigger && statusValue && taskAction);
}

function findExistingRuleTask(existingTasks = [], caseId, ruleId) {
  return (Array.isArray(existingTasks) ? existingTasks : []).find((task) => {
    if (String(task?.caseId || '') !== String(caseId || '')) return false;
    return String(task?.originRuleId || task?.sourceRuleId || '') === String(ruleId || '');
  }) || null;
}

export class RulesEngine {
  constructor(settings = {}) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      alertThresholds: {
        ...DEFAULT_SETTINGS.alertThresholds,
        ...(settings.alertThresholds || {})
      },
      distanceRules: {
        ...DEFAULT_SETTINGS.distanceRules,
        ...(settings.distanceRules || {})
      },
      phraseMappings: {
        ...DEFAULT_SETTINGS.phraseMappings,
        ...(settings.phraseMappings || {})
      },
      customRules: {
        ...DEFAULT_SETTINGS.customRules,
        ...(settings.customRules || {})
      },
      appealProfiles: {
        ...DEFAULT_SETTINGS.appealProfiles,
        ...(settings.appealProfiles || {})
      }
    };

    this._processedEventKeys = new Set();
    this._builtInRuleCatalog = buildRuleCatalog(this.settings);
    this._customRuleCache = {
      workspaceId: '',
      signature: '',
      rules: []
    };
  }

  getBuiltInRuleCatalog() {
    return this._builtInRuleCatalog;
  }

  getCustomRuleCatalog(caseData, context = {}) {
    if (this.settings.customRules?.enabled === false) {
      return [];
    }

    const workspaceId = String(
      context.workspaceId
      || caseData?.workspaceId
      || this.settings.workspaceId
      || ''
    ).trim();

    if (!workspaceId) {
      return [];
    }

    let raw = '';
    try {
      raw = String(storage.loadWorkspaceLocalStateRaw('customRules', workspaceId, {
        legacyKeys: ['lawbase:customRules']
      }) || '').trim();
    } catch (error) {
      console.warn('Failed to read custom rules storage:', error);
      return [];
    }

    if (!raw || raw === '[]') {
      this._customRuleCache = {
        workspaceId,
        signature: raw,
        rules: []
      };
      return [];
    }

    if (
      this._customRuleCache.workspaceId === workspaceId
      && this._customRuleCache.signature === raw
    ) {
      return this._customRuleCache.rules;
    }

    try {
      const parsed = JSON.parse(raw);
      const advancedDefinitions = (Array.isArray(parsed) ? parsed : []).filter((ruleDefinition) => !isVisualStatusTaskRuleDefinition(ruleDefinition));
      const compiled = compileCustomRules(advancedDefinitions);
      this._customRuleCache = {
        workspaceId,
        signature: raw,
        rules: compiled
      };
      return compiled;
    } catch (error) {
      console.warn('Failed to compile custom rules:', error);
      return [];
    }
  }

  getRuleCatalog(caseData, context = {}) {
    const baseCatalog = this.getBuiltInRuleCatalog();
    const customCatalog = this.getCustomRuleCatalog(caseData, context);
    return customCatalog.length > 0 ? [...baseCatalog, ...customCatalog] : baseCatalog;
  }

  processEvent(eventType, eventData, caseData, context = {}) {
    const occurredAt = normalizeDate(eventData?.occurredAt || context.today || new Date().toISOString());
    const idempotencyKey = `event:${eventType}:${eventData?.entityId || caseData?.id || 'unknown'}:${occurredAt}`;

    if (this._processedEventKeys.has(idempotencyKey)) {
      return {
        updates: {},
        deadlines: [],
        alerts: [],
        tasks: [],
        hits: [],
        meta: { skipped: true, reason: 'idempotent_duplicate' }
      };
    }

    this._processedEventKeys.add(idempotencyKey);

    const mergedContext = {
      ...context,
      eventType,
      eventData,
      today: context.today || normalizeDate(new Date().toISOString())
    };

    const result = this.evaluateCase(caseData, mergedContext);
    result.meta = {
      ...(result.meta || {}),
      idempotencyKey,
      eventType
    };
    return result;
  }

  evaluateCustomRules(caseData, context = {}) {
    const workspaceId = String(
      context.workspaceId
      || caseData?.workspaceId
      || this.settings.workspaceId
      || ''
    ).trim();

    const empty = {
      updates: {},
      deadlines: [],
      alerts: [],
      tasks: [],
      hits: [],
      meta: {
        evaluatedCustomRules: 0,
        generatedCustomTasks: 0
      }
    };

    if (!workspaceId || this.settings.customRules?.enabled === false) {
      return empty;
    }

    const savedRules = storage.getCustomRules(workspaceId);
    const definitions = Array.isArray(savedRules) ? savedRules : [];
    const existingTasks = Array.isArray(context.existingTasks) ? context.existingTasks : [];
    const caseStatus = String(caseData?.status || caseData?.operationalStatus || '').trim();
    if (!caseStatus) return empty;

    const visualRules = definitions.filter((ruleDefinition) => isVisualStatusTaskRuleDefinition(ruleDefinition));
    if (!visualRules.length) return empty;

    const generatedFingerprints = new Set();
    const today = normalizeDate(context.today || new Date().toISOString());

    visualRules.forEach((ruleDefinition) => {
      const triggerStatus = getRuleConditionValue(ruleDefinition, 'status');
      if (String(triggerStatus || '').trim() !== caseStatus) {
        return;
      }

      const taskAction = getRuleTaskAction(ruleDefinition);
      if (!taskAction) return;

      const existingTask = findExistingRuleTask(existingTasks, caseData?.id, ruleDefinition.id);
      const anchorDate = normalizeDate(
        caseData?.lastSessionDate
        || context.eventData?.sessionDate
        || context.eventData?.date
        || today
      );
      const computedDueDate = computeDueDate(anchorDate || today, taskAction.delayDays ?? taskAction.offsetDays ?? 0, { excludeStartDay: true }, this.settings) || today;
      const dueDate = normalizeDate(existingTask?.dueDate || computedDueDate || today) || today;
      const title = String(taskAction.title || '').trim() || ruleDefinition.title || 'مهمة آلية';
      const fingerprint = `${title}|${dueDate}|${ruleDefinition.id}|${caseData?.id || ''}`;
      if (generatedFingerprints.has(fingerprint)) {
        return;
      }
      generatedFingerprints.add(fingerprint);

      const task = {
        id: existingTask?.id || makeId('custom_task', `${ruleDefinition.id}-${caseData?.id || 'case'}-${dueDate}`),
        caseId: caseData?.id || '',
        entityType: 'case',
        entityId: caseData?.id || '',
        title,
        description: String(taskAction.descriptionTemplate || `مهمة آلية مرتبطة بحالة القضية ${triggerStatus}.`).trim(),
        dueDate,
        priority: taskAction.priority || 'medium',
        status: taskAction.status || 'open',
        sourceRuleId: ruleDefinition.id,
        originRuleId: ruleDefinition.id,
        generatedFrom: {
          type: 'custom_rule_task',
          id: taskAction.id || ''
        },
        autoGenerated: true,
        createdAt: existingTask?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      empty.tasks.push(task);
      empty.hits.push(createRuleHit(
        {
          id: ruleDefinition.id,
          title: ruleDefinition.title,
          sourceLaw: ruleDefinition.sourceLaw || 'custom',
          sourceArticle: ruleDefinition.sourceArticle || '-'
        },
        { deadlines: [], alerts: [], tasks: [task.id] },
        `تمت مطابقة القاعدة المخصصة عند انتقال الحالة إلى ${triggerStatus}.`
      ));
    });

    empty.meta.evaluatedCustomRules = visualRules.length;
    empty.meta.generatedCustomTasks = empty.tasks.length;
    return empty;
  }

  evaluateCase(caseData, context = {}) {
    if (!this.settings.enabled) {
      return {
        updates: {},
        deadlines: [],
        alerts: [],
        tasks: [],
        hits: [],
        meta: { skipped: true, reason: 'rules_engine_disabled' }
      };
    }

      const safeContext = {
        today: normalizeDate(context.today || new Date().toISOString()),
        sessions: context.sessions || caseData?.sessions || [],
        judgments: context.judgments || caseData?.judgments || [],
        workspaceId: context.workspaceId || caseData?.workspaceId || this.settings.workspaceId || '',
        settings: context.settings || {},
        ...context
      };

      const effects = [];
      const catalog = this.getRuleCatalog(caseData, safeContext);

    for (const rule of catalog) {
      if (hasOverride(caseData?.manualRuleOverrides, rule.id)) {
        continue;
      }

      if (!rule.enabledByDefault) {
        continue;
      }

      if (!rule.appliesWhen({ caseData, context: safeContext, settings: this.settings })) {
        continue;
      }

      const result = rule.compute({ caseData, context: safeContext, settings: this.settings });
      effects.push(result);
    }

      const customEffects = this.evaluateCustomRules(caseData, safeContext);
      const merged = this.mergeEffects([...effects, customEffects]);
      merged.meta.catalogRuleCount = catalog.length;
      merged.meta.customRuleCount = Math.max(0, catalog.length - this.getBuiltInRuleCatalog().length);
      merged.meta.visualCustomRuleCount = customEffects?.meta?.evaluatedCustomRules || 0;
      merged.updates.lastRuleEvaluationAt = new Date().toISOString();
    const judicialYear = normalizeJudicialYear(caseData?.caseYear);
    if (judicialYear) {
      merged.updates.caseYear = judicialYear;
    }

    // Fill convenience critical deadline fields for existing screens.
    const critical = merged.deadlines
      .filter((d) => d.status === 'active')
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];

    if (critical) {
      merged.updates.criticalDeadlineDate = critical.dueDate;
      merged.updates.criticalDeadlineLabel = critical.label;
      merged.updates.criticalDeadlineSource = critical.sourceRuleId;
      merged.updates.criticalDeadline = {
        date: critical.dueDate,
        label: critical.label,
        source: critical.sourceRuleId
      };
    }

    // Priority rule: when resumption window after strike-off exists,
    // keep operational focus on struck-out flow over appeal-stage labels.
    const hasActiveResumption = merged.deadlines.some(
      (d) => d.sourceRuleId === 'MOR-82-STRIKE-OFF-RESUMPTION' && d.status === 'active'
    );
    if (hasActiveResumption) {
      merged.updates.operationalStatus = 'struck_out';
      merged.updates.nextAction = 'تجديد السير في الدعوى';
      if (merged.updates.workflowStage === 'appeal_window_open') {
        merged.updates.workflowStage = 'under_review';
      }
    }

    return merged;
  }

  mergeEffects(effects = []) {
    const merged = {
      updates: {},
      deadlines: [],
      alerts: [],
      tasks: [],
      hits: [],
      meta: { evaluatedRules: effects.length }
    };

    const deadlineIds = new Set();
    const alertIds = new Set();
    const taskFingerprints = new Set();

    for (const effect of effects) {
      if (!effect) continue;

      Object.assign(merged.updates, effect.updates || {});

      for (const deadline of effect.deadlines || []) {
        if (!deadlineIds.has(deadline.id)) {
          deadlineIds.add(deadline.id);
          merged.deadlines.push(deadline);
        }
      }

      for (const alert of effect.alerts || []) {
        if (!alertIds.has(alert.id)) {
          alertIds.add(alert.id);
          merged.alerts.push(alert);
        }
      }

      for (const task of effect.tasks || []) {
        const fp = `${task.title}|${task.dueDate}|${task.sourceRuleId || task.originRuleId || ''}`;
        if (!taskFingerprints.has(fp)) {
          taskFingerprints.add(fp);
          merged.tasks.push(task);
        }
      }

      for (const hit of effect.hits || []) {
        merged.hits.push(hit);
      }
    }

    return merged;
  }
}

function buildRuleCatalog(settings) {
  return [
    {
      id: 'MOR-15-EXCLUDE-START-DAY',
      title: 'استبعاد يوم البداية من الحساب',
      sourceLaw: 'mrafaat',
      sourceArticle: '15',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => {
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        return Boolean(anchor) && days > 0;
      },
      compute: ({ caseData, settings }) => {
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        const dueDate = computeDueDate(anchor, days, { excludeStartDay: true }, settings);
        const dueDateValue = toDate(dueDate);
        const deadlineId = makeId('deadline', `mor15-${caseData.id}`);

        return {
          updates: {},
          deadlines: [
            {
              id: deadlineId,
              type: 'service_deadline',
              label: 'ميعاد إجرائي أساسي',
              startDate: anchor,
              dueDate,
              status: 'active',
              sourceLaw: 'mrafaat',
              sourceArticle: '15',
              sourceRuleId: 'MOR-15-EXCLUDE-START-DAY',
              basedOnEventId: '',
              reasonText: 'تم الحساب مع استبعاد يوم البداية.',
              riskLevel: dueDateValue && isDeadlineApproaching(dueDateValue, settings.alertThresholds.defaultCriticalDays) ? 'critical' : 'normal',
              autoGenerated: true
            }
          ],
          alerts: [],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-15-EXCLUDE-START-DAY', title: 'استبعاد يوم البداية من الحساب', sourceLaw: 'mrafaat', sourceArticle: '15' },
              { deadlines: [deadlineId], alerts: [], tasks: [] },
              'تم تطبيق قاعدة استبعاد يوم البداية من الميعاد.'
            )
          ]
        };
      }
    },
    {
      id: 'MOR-18-HOLIDAY-EXTENSION',
      title: 'امتداد الميعاد للعطلة الرسمية',
      sourceLaw: 'mrafaat',
      sourceArticle: '18',
      enabledByDefault: true,
      appliesWhen: ({ caseData, settings }) => {
        const rawDue = normalizeDate(caseData?.criticalDeadlineDate || caseData?.criticalDeadline?.date);
        if (!rawDue) return false;
        const parsed = toDate(rawDue);
        return Boolean(parsed) && (!isBusinessDay(parsed) || isOfficialHoliday(parsed, settings));
      },
      compute: ({ caseData, settings }) => {
        const rawDue = normalizeDate(caseData?.criticalDeadlineDate || caseData?.criticalDeadline?.date);
        const dueDateValue = toDate(rawDue);
        if (!dueDateValue) {
          return {
            updates: {},
            deadlines: [],
            alerts: [],
            tasks: [],
            hits: []
          };
        }
        const extended = normalizeDate(nextWorkingDay(dueDateValue, settings));
        if (!extended) {
          return {
            updates: {},
            deadlines: [],
            alerts: [],
            tasks: [],
            hits: []
          };
        }
        const alertId = makeId('alert', `mor18-${caseData.id}`);

        return {
          updates: {
            criticalDeadlineDate: extended,
            criticalDeadlineLabel: caseData?.criticalDeadlineLabel || 'ميعاد إجرائي ممتد',
            criticalDeadlineSource: 'MOR-18-HOLIDAY-EXTENSION',
            criticalDeadline: {
              date: extended,
              label: caseData?.criticalDeadlineLabel || 'ميعاد إجرائي ممتد',
              source: 'MOR-18-HOLIDAY-EXTENSION'
            }
          },
          deadlines: [],
          alerts: [
            {
              id: alertId,
              type: 'deadline',
              title: 'تم امتداد الميعاد تلقائيًا',
              message: `آخر يوم وافق عطلة وتم الامتداد إلى ${extended}`,
              severity: 'info',
              dueDate: extended,
              sourceRuleId: 'MOR-18-HOLIDAY-EXTENSION',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-18-HOLIDAY-EXTENSION', title: 'امتداد الميعاد للعطلة الرسمية', sourceLaw: 'mrafaat', sourceArticle: '18' },
              { deadlines: [], alerts: [alertId], tasks: [] },
              'تم تمديد الميعاد إلى يوم عمل تالٍ بسبب عطلة رسمية/أسبوعية.'
            )
          ]
        };
      }
    },
    {
      id: 'MOR-16-DISTANCE-DEADLINE',
      title: 'إضافة ميعاد المسافة',
      sourceLaw: 'mrafaat',
      sourceArticle: '16',
      enabledByDefault: true,
      appliesWhen: ({ caseData, settings }) => {
        if (!settings.distanceRules?.enabled) return false;
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        const extra = Number(caseData?.distanceExtraDays ?? settings.distanceRules?.localExtraDays ?? 0);
        const isAbroad = String(caseData?.serviceScope || 'local') === 'abroad';
        return Boolean(anchor) && days > 0 && extra > 0 && !isAbroad;
      },
      compute: ({ caseData, settings }) => {
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        const extra = Number(caseData?.distanceExtraDays ?? settings.distanceRules?.localExtraDays ?? 0);
        const dueDate = computeDueDate(anchor, days, { excludeStartDay: true, extraDays: extra }, settings);
        const deadlineId = makeId('deadline', `mor16-${caseData.id}`);

        return {
          updates: {},
          deadlines: [
            {
              id: deadlineId,
              type: 'service_deadline',
              label: 'ميعاد إجرائي بعد إضافة ميعاد المسافة',
              startDate: anchor,
              dueDate,
              status: 'active',
              sourceLaw: 'mrafaat',
              sourceArticle: '16',
              sourceRuleId: 'MOR-16-DISTANCE-DEADLINE',
              basedOnEventId: '',
              reasonText: `تمت إضافة ${extra} يوم ميعاد مسافة حسب الإعدادات.`,
              riskLevel: 'high',
              autoGenerated: true
            }
          ],
          alerts: [],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-16-DISTANCE-DEADLINE', title: 'إضافة ميعاد المسافة', sourceLaw: 'mrafaat', sourceArticle: '16' },
              { deadlines: [deadlineId], alerts: [], tasks: [] },
              'تم تطبيق ميعاد المسافة وفق إعدادات المحكمة/المستخدم.'
            )
          ]
        };
      }
    },
    {
      id: 'MOR-17-ABROAD-DEADLINE',
      title: 'ميعاد الخصم المقيم بالخارج',
      sourceLaw: 'mrafaat',
      sourceArticle: '17',
      enabledByDefault: true,
      appliesWhen: ({ caseData, settings }) => {
        if (!settings.distanceRules?.enabled) return false;
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        return Boolean(anchor) && days > 0 && String(caseData?.serviceScope || 'local') === 'abroad';
      },
      compute: ({ caseData, settings }) => {
        const anchor = getCaseProceduralAnchor(caseData);
        const days = Number(caseData?.baseDeadlineDays || 0);
        const extra = Number(settings.distanceRules?.abroadExtraDays || 60);
        const dueDate = computeDueDate(anchor, days, { excludeStartDay: true, extraDays: extra }, settings);
        const deadlineId = makeId('deadline', `mor17-${caseData.id}`);
        const alertId = makeId('alert', `mor17-${caseData.id}`);

        return {
          updates: {
            proceduralFlags: Array.from(new Set([...(caseData.proceduralFlags || []), 'abroad_deadline_applied']))
          },
          deadlines: [
            {
              id: deadlineId,
              type: 'service_deadline',
              label: 'ميعاد إجرائي مع إضافة ميعاد الخارج',
              startDate: anchor,
              dueDate,
              status: 'active',
              sourceLaw: 'mrafaat',
              sourceArticle: '17',
              sourceRuleId: 'MOR-17-ABROAD-DEADLINE',
              basedOnEventId: '',
              reasonText: `تمت إضافة ${extra} يومًا لكون الخصم مقيمًا بالخارج.`,
              riskLevel: 'high',
              autoGenerated: true
            }
          ],
          alerts: [
            {
              id: alertId,
              type: 'procedural_risk',
              title: 'تطبيق ميعاد الخارج',
              message: `تم احتساب ميعاد الخارج وإضافة ${extra} يومًا على الميعاد الأصلي.`,
              severity: 'warning',
              dueDate,
              sourceRuleId: 'MOR-17-ABROAD-DEADLINE',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-17-ABROAD-DEADLINE', title: 'ميعاد الخصم المقيم بالخارج', sourceLaw: 'mrafaat', sourceArticle: '17' },
              { deadlines: [deadlineId], alerts: [alertId], tasks: [] },
              'تم تطبيق قاعدة الميعاد الإضافي للخصوم المقيمين بالخارج.'
            )
          ]
        };
      }
    },
    {
      id: 'SC-24-CANCEL-CLAIM-ORIGINAL',
      title: 'ميعاد دعوى الإلغاء',
      sourceLaw: 'state_council',
      sourceArticle: '24',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => caseData?.caseFamily === 'administrative_cancellation' && !!caseData?.decisionKnowledgeDate,
      compute: ({ caseData, settings }) => {
        const startDate = normalizeDate(caseData.decisionKnowledgeDate);
        const dueDate = computeDueDate(startDate, 60, { excludeStartDay: true }, settings);
        const dueDateValue = toDate(dueDate);
        const deadlineId = makeId('deadline', `sc24-${caseData.id}`);
        const alertId = makeId('alert', `sc24-${caseData.id}`);

        return {
          updates: {},
          deadlines: [
            {
              id: deadlineId,
              type: 'grievance_deadline',
              label: 'ميعاد رفع دعوى الإلغاء',
              startDate,
              dueDate,
              status: 'active',
              sourceLaw: 'state_council',
              sourceArticle: '24',
              sourceRuleId: 'SC-24-CANCEL-CLAIM-ORIGINAL',
              basedOnEventId: '',
              reasonText: 'تم احتساب ميعاد الستين يومًا من تاريخ العلم بالقرار.',
              riskLevel: dueDateValue && isDeadlineApproaching(dueDateValue, 3) ? 'critical' : 'high',
              autoGenerated: true
            }
          ],
          alerts: [
            {
              id: alertId,
              type: 'grievance',
              title: 'متابعة ميعاد دعوى الإلغاء',
              message: `تم إنشاء ميعاد دعوى الإلغاء حتى ${dueDate}`,
              severity: dueDateValue && isDeadlineApproaching(dueDateValue, settings.alertThresholds.grievanceCriticalDays) ? 'critical' : 'warning',
              dueDate,
              sourceRuleId: 'SC-24-CANCEL-CLAIM-ORIGINAL',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'SC-24-CANCEL-CLAIM-ORIGINAL', title: 'ميعاد دعوى الإلغاء', sourceLaw: 'state_council', sourceArticle: '24' },
              { deadlines: [deadlineId], alerts: [alertId], tasks: [] },
              'تم حساب ميعاد دعوى الإلغاء وفق المادة 24 من قانون مجلس الدولة.'
            )
          ]
        };
      }
    },
    {
      id: 'SC-12-MANDATORY-GRIEVANCE-CHECK',
      title: 'فحص التظلم الوجوبي',
      sourceLaw: 'state_council',
      sourceArticle: '12',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => caseData?.grievanceRequired === true && !caseData?.grievanceSubmittedDate,
      compute: ({ caseData }) => {
        const alertId = makeId('alert', `grievance-required-${caseData.id}`);
        const taskId = makeStableId('task', `grievance-required-${caseData.id}`);

        return {
          updates: {
            proceduralFlags: Array.from(new Set([...(caseData.proceduralFlags || []), 'mandatory_grievance_missing']))
          },
          deadlines: [],
          alerts: [
            {
              id: alertId,
              type: 'procedural_risk',
              title: 'التظلم الوجوبي غير مسجل',
              message: 'الدعوى تتطلب تظلمًا وجوبيًا ولم يتم تسجيل بيانات التظلم بعد.',
              severity: 'critical',
              dueDate: '',
              sourceRuleId: 'SC-12-MANDATORY-GRIEVANCE-CHECK',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [
            {
              id: taskId,
              title: 'استكمال بيانات التظلم الوجوبي',
              description: 'يرجى إدخال تاريخ وبيانات التظلم قبل المتابعة.',
              dueDate: normalizeDate(new Date().toISOString()),
              priority: 'high',
              status: 'open',
              source: 'rule',
              sourceRuleId: 'SC-12-MANDATORY-GRIEVANCE-CHECK'
            }
          ],
          hits: [
            createRuleHit(
              { id: 'SC-12-MANDATORY-GRIEVANCE-CHECK', title: 'فحص التظلم الوجوبي', sourceLaw: 'state_council', sourceArticle: '12' },
              { deadlines: [], alerts: [alertId], tasks: [taskId] },
              'تم إنشاء تنبيه إجرائي لغياب بيانات التظلم الوجوبي.'
            )
          ]
        };
      }
    },
    {
      id: 'SC-24-IMPLIED-REJECTION',
      title: 'الرفض الضمني بعد التظلم',
      sourceLaw: 'state_council',
      sourceArticle: '24',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => {
        return !!caseData?.grievanceSubmittedDate && !caseData?.grievanceDecisionDate && !caseData?.grievanceDecisionType;
      },
      compute: ({ caseData, settings }) => {
        const submitted = normalizeDate(caseData.grievanceSubmittedDate);
        const impliedDate = computeDueDate(submitted, 60, { excludeStartDay: true }, settings);
        const deadlineId = makeId('deadline', `implied-rejection-${caseData.id}`);

        return {
          updates: {},
          deadlines: [
            {
              id: deadlineId,
              type: 'grievance_deadline',
              label: 'تاريخ الرفض الضمني للتظلم',
              startDate: submitted,
              dueDate: impliedDate,
              status: 'active',
              sourceLaw: 'state_council',
              sourceArticle: '24',
              sourceRuleId: 'SC-24-IMPLIED-REJECTION',
              basedOnEventId: '',
              reasonText: 'يُعتبر التظلم مرفوضًا ضمنيًا بعد 60 يومًا من تقديمه.',
              riskLevel: 'high',
              autoGenerated: true
            }
          ],
          alerts: [],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'SC-24-IMPLIED-REJECTION', title: 'الرفض الضمني بعد التظلم', sourceLaw: 'state_council', sourceArticle: '24' },
              { deadlines: [deadlineId], alerts: [], tasks: [] },
              'تم إنشاء ميعاد الرفض الضمني للتظلم بعد 60 يومًا.'
            )
          ]
        };
      }
    },
    {
      id: 'SC-24-POST-GRIEVANCE-LAWSUIT-WINDOW',
      title: 'ميعاد الدعوى بعد رفض التظلم',
      sourceLaw: 'state_council',
      sourceArticle: '24',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => {
        const explicitRejection = caseData?.grievanceDecisionType === 'rejected' && !!caseData?.grievanceDecisionDate;
        const impliedRejection = caseData?.grievanceDecisionType === 'implied_rejection' && !!caseData?.grievanceDecisionDate;
        return explicitRejection || impliedRejection;
      },
      compute: ({ caseData, settings }) => {
        const startDate = normalizeDate(caseData.grievanceDecisionDate);
        const dueDate = computeDueDate(startDate, 60, { excludeStartDay: true }, settings);
        const deadlineId = makeId('deadline', `post-grievance-${caseData.id}`);

        return {
          updates: {
            workflowStage: 'under_review'
          },
          deadlines: [
            {
              id: deadlineId,
              type: 'grievance_deadline',
              label: 'ميعاد دعوى الإلغاء بعد رفض التظلم',
              startDate,
              dueDate,
              status: 'active',
              sourceLaw: 'state_council',
              sourceArticle: '24',
              sourceRuleId: 'SC-24-POST-GRIEVANCE-LAWSUIT-WINDOW',
              basedOnEventId: '',
              reasonText: 'تم احتساب ميعاد دعوى جديد بعد رفض التظلم.',
              riskLevel: 'critical',
              autoGenerated: true
            }
          ],
          alerts: [],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'SC-24-POST-GRIEVANCE-LAWSUIT-WINDOW', title: 'ميعاد الدعوى بعد رفض التظلم', sourceLaw: 'state_council', sourceArticle: '24' },
              { deadlines: [deadlineId], alerts: [], tasks: [] },
              'تم احتساب ميعاد دعوى جديد لمدة 60 يومًا بعد رفض التظلم.'
            )
          ]
        };
      }
    },
    {
      id: 'MOR-82-STRIKE-OFF-RESUMPTION',
      title: 'ميعاد تجديد السير بعد الشطب',
      sourceLaw: 'mrafaat',
      sourceArticle: '82',
      enabledByDefault: true,
      appliesWhen: ({ caseData, context, settings }) => {
        if (isStruckOutStatus(caseData, settings)) {
          return true;
        }
        const sessions = context.sessions || [];
        return sessions.some((s) => includesAny(s?.decision || s?.decisions || s?.result, settings.phraseMappings.struckOut));
      },
      compute: ({ caseData, context, settings }) => {
        const sessions = context.sessions || [];
        const strikeSession = [...sessions].reverse().find((s) => includesAny(s?.decision || s?.decisions || s?.result, settings.phraseMappings.struckOut));
        const strikeStatusDetected = isStruckOutStatus(caseData, settings);
        const startDate = normalizeDate(
          strikeSession?.date
          || caseData?.lastSessionDate
          || caseData?.previousSessionDate
          || caseData?.updatedAt
          || context.today
        );
        const dueDate = computeDueDate(startDate, 60, { excludeStartDay: true }, settings);
        const deadlineId = makeId('deadline', `strikeoff-${caseData.id}`);
        const alertId = makeId('alert', `strikeoff-${caseData.id}`);
        const due = toDate(dueDate);
        const isCritical = due ? isDeadlineApproaching(due, settings.alertThresholds.strikeOffCriticalDays) : false;
        const isWarning = due ? isDeadlineApproaching(due, settings.alertThresholds.strikeOffWarningDays) : false;
        const alerts = [];

        if (isWarning || isCritical) {
          alerts.push({
            id: alertId,
            type: 'deadline',
            title: 'تنبيه ميعاد تجديد السير بعد الشطب',
            message: isCritical
              ? 'الميعاد يقترب بشكل حرج. يرجى اتخاذ إجراء فوري لتجديد السير.'
              : 'ميعاد تجديد السير يقترب. يرجى تجهيز إجراءات التجديد.',
            severity: isCritical ? 'critical' : 'warning',
            dueDate,
            sourceRuleId: 'MOR-82-STRIKE-OFF-RESUMPTION',
            dismissed: false,
            createdAt: new Date().toISOString()
          });
        }

        return {
          updates: {
            operationalStatus: 'struck_out',
            nextAction: 'تجديد السير في الدعوى'
          },
          deadlines: [
            {
              id: deadlineId,
              type: 'resumption_deadline',
              label: 'ميعاد تجديد السير بعد الشطب',
              startDate,
              dueDate,
              status: 'active',
              sourceLaw: 'mrafaat',
              sourceArticle: '82',
              sourceRuleId: 'MOR-82-STRIKE-OFF-RESUMPTION',
              basedOnEventId: strikeSession?.id || '',
              reasonText: 'تم إنشاء ميعاد تجديد السير خلال 60 يومًا من تاريخ الشطب.',
              riskLevel: 'high',
              autoGenerated: true
            }
          ],
          alerts,
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-82-STRIKE-OFF-RESUMPTION', title: 'ميعاد تجديد السير بعد الشطب', sourceLaw: 'mrafaat', sourceArticle: '82' },
              { deadlines: [deadlineId], alerts: alerts.map((a) => a.id), tasks: [] },
              strikeStatusDetected
                ? 'تم رصد حالة شطب من حالة القضية وإنشاء ميعاد تجديد السير 60 يومًا.'
                : 'تم رصد واقعة شطب من الجلسات وإنشاء ميعاد تجديد السير 60 يومًا.'
            )
          ]
        };
      }
    },
    {
      id: 'MOR-82-DEEMED-NONEXISTENT',
      title: 'خطر اعتبار الدعوى كأن لم تكن',
      sourceLaw: 'mrafaat',
      sourceArticle: '82',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => {
        const deadlines = caseData?.derivedDeadlines || [];
        const strikeDeadline = deadlines.find((d) => d.sourceRuleId === 'MOR-82-STRIKE-OFF-RESUMPTION' && d.status === 'active');
        return !!strikeDeadline && !caseData?.resumptionDate;
      },
      compute: ({ caseData }) => {
        const deadlines = caseData?.derivedDeadlines || [];
        const strikeDeadline = deadlines.find((d) => d.sourceRuleId === 'MOR-82-STRIKE-OFF-RESUMPTION' && d.status === 'active');
        const strikeDeadlineDate = toDate(strikeDeadline?.dueDate);
        const overdue = strikeDeadlineDate ? isDeadlineOverdue(strikeDeadlineDate) : false;
        if (!overdue) {
          return { updates: {}, deadlines: [], alerts: [], tasks: [], hits: [] };
        }

        const alertId = makeId('alert', `deemed-nonexistent-${caseData.id}`);
        return {
          updates: {
            proceduralFlags: Array.from(new Set([...(caseData.proceduralFlags || []), 'deemed_not_existent_risk']))
          },
          deadlines: [],
          alerts: [
            {
              id: alertId,
              type: 'procedural_risk',
              title: 'خطر اعتبار الدعوى كأن لم تكن',
              message: 'انتهى ميعاد تجديد السير بعد الشطب دون تسجيل تجديد صالح.',
              severity: 'critical',
              dueDate: strikeDeadline.dueDate,
              sourceRuleId: 'MOR-82-DEEMED-NONEXISTENT',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'MOR-82-DEEMED-NONEXISTENT', title: 'خطر اعتبار الدعوى كأن لم تكن', sourceLaw: 'mrafaat', sourceArticle: '82' },
              { deadlines: [], alerts: [alertId], tasks: [] },
              'تم توليد تنبيه حرج لانتهاء ميعاد تجديد السير بعد الشطب.'
            )
          ]
        };
      }
    },
    {
      id: 'LB-SESSION-TOMORROW',
      title: 'تذكير جلسة الغد',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ context }) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const target = normalizeDate(tomorrow.toISOString());
        const sessions = context.sessions || [];
        return sessions.some((s) => normalizeDate(s?.date) === target);
      },
      compute: ({ caseData, context }) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const target = normalizeDate(tomorrow.toISOString());
        const taskId = makeStableId('task', `session-tomorrow-${caseData.id}`);

        return {
          updates: {},
          deadlines: [],
          alerts: [],
          tasks: [
            {
              id: taskId,
              title: 'تحضير جلسة الغد',
              description: 'مراجعة الملف والمذكرات قبل جلسة الغد.',
              dueDate: target,
              priority: 'high',
              status: 'open',
              source: 'rule',
              sourceRuleId: 'LB-SESSION-TOMORROW'
            }
          ],
          hits: [
            createRuleHit(
              { id: 'LB-SESSION-TOMORROW', title: 'تذكير جلسة الغد', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [], tasks: [taskId] },
              'تم إنشاء مهمة تحضير لوجود جلسة في اليوم التالي.'
            )
          ]
        };
      }
    },
    {
      id: 'LB-JUDGMENT-CLASSIFICATION-REQUIRED',
      title: 'الحكم يحتاج تصنيف',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ context }) => {
        const judgments = context.judgments || [];
        return judgments.some((j) => !j?.classification);
      },
      compute: ({ caseData }) => {
        const taskId = makeStableId('task', `judgment-classification-${caseData.id}`);

        return {
          updates: {},
          deadlines: [],
          alerts: [],
          tasks: [
            {
              id: taskId,
              title: 'الحكم يحتاج مراجعة وتصنيف',
              description: 'يرجى تصنيف الحكم لضمان دقة التتبع الإجرائي.',
              dueDate: normalizeDate(new Date().toISOString()),
              priority: 'medium',
              status: 'open',
              source: 'rule',
              sourceRuleId: 'LB-JUDGMENT-CLASSIFICATION-REQUIRED'
            }
          ],
          hits: [
            createRuleHit(
              { id: 'LB-JUDGMENT-CLASSIFICATION-REQUIRED', title: 'الحكم يحتاج تصنيف', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [], tasks: [taskId] },
              'تم توليد مهمة لأن الحكم مسجل بدون تصنيف.'
            )
          ]
        };
      }
    },
    {
      id: 'LB-APPEAL-WINDOW-GENERIC',
      title: 'ميعاد الطعن على الحكم',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ context }) => {
        const judgments = context.judgments || [];
        return judgments.some((j) => j?.opensAppealWindow !== false && !!j?.date);
      },
      compute: ({ caseData, context, settings }) => {
        const judgments = context.judgments || [];
        const latest = [...judgments].reverse().find((j) => j?.opensAppealWindow !== false && !!j?.date);
        if (!latest) return { updates: {}, deadlines: [], alerts: [], tasks: [], hits: [] };

        const appealDays = getAppealWindowDays(caseData, latest, settings);
        const startDate = normalizeDate(latest.date);
        const dueDate = computeDueDate(startDate, appealDays, { excludeStartDay: true }, settings);
        const deadlineId = makeId('deadline', `appeal-${caseData.id}`);
        const alertId = makeId('alert', `appeal-${caseData.id}`);
        const due = toDate(dueDate);
        const isCritical = due ? isDeadlineApproaching(due, settings.alertThresholds.appealCriticalDays) : false;
        const isWarning = due ? isDeadlineApproaching(due, settings.alertThresholds.appealWarningDays) : false;
        const isExpired = due ? isDeadlineOverdue(due) : false;
        const alerts = [
          {
            id: alertId,
            type: 'appeal',
            title: 'تنبيه ميعاد الطعن',
            message: isExpired
              ? `انتهى ميعاد الطعن (${appealDays} يومًا) في ${dueDate}.`
              : isCritical
                ? `ميعاد الطعن (${appealDays} يومًا) يوشك على الانتهاء في ${dueDate}.`
                : isWarning
                  ? `متبقي فترة قصيرة على انتهاء ميعاد الطعن (${appealDays} يومًا) في ${dueDate}.`
                  : `تم فتح نافذة الطعن لمدة ${appealDays} يومًا وتنتهي في ${dueDate}.`,
            severity: isExpired || isCritical ? 'critical' : (isWarning ? 'warning' : 'info'),
            dueDate,
            sourceRuleId: 'LB-APPEAL-WINDOW-GENERIC',
            dismissed: false,
            createdAt: new Date().toISOString()
          }
        ];

        return {
          updates: {
            workflowStage: 'appeal_window_open',
            operationalStatus: 'محكوم فيه'
          },
          deadlines: [
            {
              id: deadlineId,
              type: 'appeal_deadline',
              label: 'ميعاد الطعن',
              startDate,
              dueDate,
              status: 'active',
              sourceLaw: 'custom',
              sourceArticle: '-',
              sourceRuleId: 'LB-APPEAL-WINDOW-GENERIC',
              basedOnEventId: latest.id || '',
              reasonText: `تم احتساب ميعاد الطعن لمدة ${appealDays} يومًا من تاريخ الحكم.`,
              riskLevel: isExpired || isCritical ? 'critical' : 'high',
              autoGenerated: true
            }
          ],
          alerts,
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'LB-APPEAL-WINDOW-GENERIC', title: 'ميعاد الطعن على الحكم', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [deadlineId], alerts: alerts.map((a) => a.id), tasks: [] },
              `تم إنشاء ميعاد طعن وتنبيهاته وفق مدة ${appealDays} يومًا (40/60).`
            )
          ]
        };
      }
    },
    {
      id: 'LB-MISSING-ESSENTIAL-DATA',
      title: 'بيانات أساسية ناقصة',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: () => true,
      compute: ({ caseData }) => {
        const missing = [];
        if (!caseData?.caseNumber) missing.push('رقم القضية');
        if (!caseData?.court) missing.push('المحكمة');
        if (!caseData?.circuit) missing.push('الدائرة');

        if (missing.length === 0) {
          return { updates: {}, deadlines: [], alerts: [], tasks: [], hits: [] };
        }

        const alertId = makeId('alert', `missing-data-${caseData.id}`);
        return {
          updates: {},
          deadlines: [],
          alerts: [
            {
              id: alertId,
              type: 'missing_data',
              title: 'بيانات القضية غير مكتملة',
              message: `الحقول الناقصة: ${missing.join('، ')}`,
              severity: 'warning',
              dueDate: '',
              sourceRuleId: 'LB-MISSING-ESSENTIAL-DATA',
              dismissed: false,
              createdAt: new Date().toISOString()
            }
          ],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'LB-MISSING-ESSENTIAL-DATA', title: 'بيانات أساسية ناقصة', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [alertId], tasks: [] },
              'تم إنشاء تنبيه لأن بعض البيانات الأساسية غير متوفرة.'
            )
          ]
        };
      }
    },
    {
      id: 'LB-AUTO-IDENTITY-CLASSIFIER',
      title: 'المصنف الآلي للصفة والمهمة',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ context, settings }) => {
        const keywords = settings.identityKeywords || context?.settings?.identityKeywords || [];
        return Array.isArray(keywords) && keywords.length > 0;
      },
      compute: ({ caseData, context, settings }) => {
        const keywords = settings.identityKeywords || context?.settings?.identityKeywords || [];
        const plaintiff = String(caseData?.plaintiffName || '').toLowerCase();
        const defendant = String(caseData?.defendantName || '').toLowerCase();

        let detectedRole = 'مدعى علينا / مطعون ضدنا';
        let isImportant = false;

        const matches = (text) => keywords.some((keyword) => (
          text.includes(String(keyword || '').toLowerCase())
        ));

        if (matches(plaintiff)) {
          detectedRole = 'مدعين / طاعنين';
          isImportant = true;
        } else if (!matches(plaintiff) && !matches(defendant)) {
          detectedRole = 'لا شأن';
        }

        return {
          updates: {
            roleCapacity: detectedRole,
            flags: {
              ...(caseData?.flags || {}),
              isImportant: isImportant || !!caseData?.flags?.isImportant
            }
          },
          deadlines: [],
          alerts: [],
          tasks: [],
          hits: [
            createRuleHit(
              { id: 'LB-AUTO-IDENTITY-CLASSIFIER', title: 'التصنيف الآلي', sourceLaw: 'custom', sourceArticle: '-' },
              {},
              'تم تحديد الصفة بناءً على كلمات الدلالة.'
            )
          ]
        };
      }
    },
    {
      id: 'LB-SCHEDULED-SESSION-REMINDERS',
      title: 'التنبيهات المجدولة للجلسات',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ caseData }) => !!caseData?.nextSessionDate && caseData?.notificationsEnabled !== false,
      compute: ({ caseData, settings }) => {
        const nextDate = caseData.nextSessionDate;
        const tasks = [];
        const intervals = [
          { days: 14, label: 'قبل أسبوعين' },
          { days: 7, label: 'قبل أسبوع' },
          { days: 1, label: 'غداً' }
        ];
        const today = normalizeDate(new Date().toISOString());

        intervals.forEach((interval) => {
          const dueDate = computeDueDate(nextDate, -interval.days, { excludeStartDay: false }, settings);
          if (dueDate && String(dueDate) >= String(today)) {
            tasks.push({
              id: makeStableId('task', `remind-${interval.days}-${caseData.id}`),
              title: `تذكير: جلسة ${interval.label}`,
              description: `تذكير بموعد الجلسة القادمة بتاريخ ${nextDate}`,
              dueDate,
              priority: interval.days === 1 ? 'high' : 'medium',
              status: 'open',
              sourceRuleId: 'LB-SCHEDULED-SESSION-REMINDERS',
              autoGenerated: true
            });
          }
        });

        if (caseData.roleCapacity === 'مدعين / طاعنين' && caseData.sessionResult) {
          tasks.push({
            id: makeStableId('task', `review-res-${caseData.id}`),
            title: 'مراجعة تنفيذ القرار',
            description: `القرار: ${caseData.sessionResult}`,
            dueDate: today,
            priority: 'high',
            status: 'open',
            sourceRuleId: 'LB-SCHEDULED-SESSION-REMINDERS',
            autoGenerated: true
          });
        }

        return { updates: {}, deadlines: [], alerts: [], tasks, hits: [] };
      }
    },
    {
      id: 'LB-DYNAMIC-CUSTOM-REMINDERS',
      title: 'التذكيرات الديناميكية المخصصة',
      sourceLaw: 'custom',
      sourceArticle: '-',
      enabledByDefault: true,
      appliesWhen: ({ context, settings }) => {
        const rules = settings.customReminderRules || context?.settings?.customReminderRules || [];
        return Array.isArray(rules) && rules.length > 0;
      },
      compute: ({ caseData, context, settings }) => {
        const allowedFields = new Set([
          'caseNumber',
          'caseYear',
          'plaintiffName',
          'defendantName',
          'court',
          'circuit',
          'roleCapacity',
          'procedureTrack',
          'notes',
          'title',
          'filingDate',
          'lastSessionDate',
          'sessionResult',
          'nextSessionDate',
          'nextSessionType',
          'litigationStage',
          'agendaRoute',
          'fileLocation',
          'fileStatus',
          'status',
          'judge',
          'defendantAddress',
          'chosenHeadquarters',
          'firstInstanceNumber',
          'firstInstanceCourt',
          'firstInstanceDate',
          'firstInstanceJudgment',
          'summaryDecision',
          'judgmentCategory',
          'judgmentPronouncement',
          'claimAmount',
          'operationalStatus',
          'nextAction',
          'workflowStage',
          ...(Array.isArray(settings.customReminderTargetFields) ? settings.customReminderTargetFields : [])
            .map((field) => String(field?.value || field || '').trim())
            .filter(Boolean),
          ...(Array.isArray(context?.settings?.customReminderTargetFields) ? context.settings.customReminderTargetFields : [])
            .map((field) => String(field?.value || field || '').trim())
            .filter(Boolean),
          ...(Array.isArray(settings.customFieldDefinitions) ? settings.customFieldDefinitions : [])
            .map((field) => String(field?.id || '').trim())
            .filter(Boolean)
            .map((id) => `customFields.${id}`),
          ...(Array.isArray(context?.settings?.customFieldDefinitions) ? context.settings.customFieldDefinitions : [])
            .map((field) => String(field?.id || '').trim())
            .filter(Boolean)
            .map((id) => `customFields.${id}`)
        ]);
        const rules = settings.customReminderRules || context?.settings?.customReminderRules || [];
        const updates = {};
        const tasks = [];
        const hits = [];
        const today = normalizeDate(new Date().toISOString());

        rules.forEach((rule, index) => {
          const condition1 = getCustomReminderCondition(rule, 'condition1');
          const condition2 = getCustomReminderCondition(rule, 'condition2');
          const actions = getCustomReminderActions(rule);
          const generatedTaskIds = [];
          const ruleId = getCustomReminderRuleId(rule, index);

          if (!allowedFields.has(condition1.field)) return;
          if (condition2.enabled && !allowedFields.has(condition2.field)) return;
          if (!matchesCustomReminderCondition(caseData, condition1)) return;
          if (condition2.enabled && !matchesCustomReminderCondition(caseData, condition2)) return;

          if (actions.createTask && actions.taskMessage) {
            const taskId = getCustomReminderTaskId(caseData.id, rule, index);
            generatedTaskIds.push(taskId);
            tasks.push({
              id: taskId,
              title: actions.taskMessage,
              description: actions.taskMessage,
              dueDate: today,
              priority: 'high',
              status: 'open',
              taskType: 'custom_automation',
              sourceRuleId: 'LB-DYNAMIC-CUSTOM-REMINDERS',
              autoGenerated: true,
              generatedFrom: {
                type: 'custom_reminder_rule',
                id: ruleId,
                action: 'createTask'
              }
            });
            hits.push(createRuleHit(
              { id: 'LB-DYNAMIC-CUSTOM-REMINDERS', title: 'التذكيرات الديناميكية المخصصة', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [], tasks: [taskId] },
              `تم إنشاء مهمة من قاعدة ${ruleId} بعد تحقق الشروط.`
            ));
          }

          if (actions.updateField && actions.targetField && actions.newValue && allowedFields.has(actions.targetField)) {
            applyCustomReminderFieldUpdate(updates, caseData, actions.targetField, actions.newValue);
            hits.push(createRuleHit(
              { id: 'LB-DYNAMIC-CUSTOM-REMINDERS', title: 'التذكيرات الديناميكية المخصصة', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [], tasks: [] },
              `تم تحديث الحقل ${actions.targetField} من قاعدة ${ruleId}.`
            ));
          }

          if (actions.doRollover) {
            Object.assign(updates, getCustomReminderRoutePatch(actions.targetRoute));
            hits.push(createRuleHit(
              { id: 'LB-DYNAMIC-CUSTOM-REMINDERS', title: 'التذكيرات الديناميكية المخصصة', sourceLaw: 'custom', sourceArticle: '-' },
              { deadlines: [], alerts: [], tasks: generatedTaskIds },
              `تم ترحيل المسار إلى ${actions.targetRoute || 'sessions'} من قاعدة ${ruleId}.`
            ));
          }
        });

        return { updates, deadlines: [], alerts: [], tasks, hits };
      }
    }
  ];
}

export default RulesEngine;
