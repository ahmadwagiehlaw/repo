import { describe, expect, it } from 'vitest';
import RulesEngine from '../RulesEngine.js';

describe('RulesEngine smoke baseline', () => {
  it('returns a missing-data alert safely when essential fields are absent', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });

    const result = engine.evaluateCase(
      { id: 'case-1' },
      {
        today: '2026-04-04',
        sessions: [],
        judgments: [],
      }
    );

    expect(Array.isArray(result.alerts)).toBe(true);
    expect(result.alerts.some((alert) => alert.sourceRuleId === 'LB-MISSING-ESSENTIAL-DATA')).toBe(true);
    expect(result.hits.some((hit) => hit.ruleId === 'LB-MISSING-ESSENTIAL-DATA')).toBe(true);
  });

  it('creates custom automation tasks from workspace reminder rules', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });

    const result = engine.evaluateCase(
      {
        id: 'case-2',
        caseNumber: '10',
        court: 'محكمة',
        circuit: 'دائرة',
        notes: 'ملف يحتاج مراجعة خبراء',
      },
      {
        today: '2026-04-04',
        sessions: [],
        judgments: [],
        settings: {
          customReminderRules: [
            {
              id: 'experts-review',
              targetField: 'notes',
              triggerKeywords: ['خبراء'],
              reminderMessage: 'مراجعة ملف الخبراء',
            },
          ],
        },
      }
    );

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      title: 'مراجعة ملف الخبراء',
      taskType: 'custom_automation',
      sourceRuleId: 'LB-DYNAMIC-CUSTOM-REMINDERS',
      priority: 'high',
    });
  });

  it('supports custom reminder target fields declared in workspace settings', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });

    const result = engine.evaluateCase(
      {
        id: 'case-3',
        caseNumber: '11',
        court: 'محكمة',
        circuit: 'دائرة',
        customFields: {
          clientCode: 'VIP-7788',
        },
      },
      {
        today: '2026-04-04',
        sessions: [],
        judgments: [],
        settings: {
          customReminderTargetFields: [{ value: 'customFields.clientCode', label: 'كود العميل' }],
          customReminderRules: [
            {
              id: 'vip-client',
              targetField: 'customFields.clientCode',
              triggerKeywords: 'VIP',
              reminderMessage: 'مراجعة ملف عميل مهم',
            },
          ],
        },
      }
    );

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('مراجعة ملف عميل مهم');
  });

  it('keeps custom reminder task ids stable across repeated evaluations', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });
    const caseData = {
      id: 'case-4',
      notes: 'ملف يحتاج مراجعة خبراء',
    };
    const context = {
      today: '2026-04-04',
      sessions: [],
      judgments: [],
      settings: {
        customReminderRules: [
          {
            id: 'experts-review',
            targetField: 'notes',
            triggerKeywords: ['خبراء'],
            reminderMessage: 'مراجعة ملف الخبراء',
          },
        ],
      },
    };

    const first = engine.evaluateCase(caseData, context);
    const second = engine.evaluateCase(caseData, context);

    expect(first.tasks).toHaveLength(1);
    expect(second.tasks).toHaveLength(1);
    expect(second.tasks[0].id).toBe(first.tasks[0].id);
  });

  it('stops generating custom reminder tasks when trigger keywords are removed', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });
    const caseData = {
      id: 'case-5',
      notes: 'ملف يحتاج مراجعة خبراء',
    };
    const baseContext = {
      today: '2026-04-04',
      sessions: [],
      judgments: [],
    };

    const withKeywords = engine.evaluateCase(caseData, {
      ...baseContext,
      settings: {
        customReminderRules: [
          {
            id: 'experts-review',
            targetField: 'notes',
            triggerKeywords: ['خبراء'],
            reminderMessage: 'مراجعة ملف الخبراء',
          },
        ],
      },
    });

    const withoutKeywords = engine.evaluateCase(caseData, {
      ...baseContext,
      settings: {
        customReminderRules: [
          {
            id: 'experts-review',
            targetField: 'notes',
            triggerKeywords: [],
            reminderMessage: 'مراجعة ملف الخبراء',
          },
        ],
      },
    });

    expect(withKeywords.tasks.some((task) => task.sourceRuleId === 'LB-DYNAMIC-CUSTOM-REMINDERS')).toBe(true);
    expect(withoutKeywords.tasks.some((task) => task.sourceRuleId === 'LB-DYNAMIC-CUSTOM-REMINDERS')).toBe(false);
  });

  it('executes multi-condition custom rule actions when both conditions match', () => {
    const engine = new RulesEngine({
      customRules: { enabled: false },
    });

    const result = engine.evaluateCase(
      {
        id: 'case-6',
        notes: 'ملف يحتاج مراجعة خبراء',
        roleCapacity: 'مدعين / طاعنين',
      },
      {
        today: '2026-04-04',
        sessions: [],
        judgments: [],
        settings: {
          customReminderRules: [
            {
              id: 'experts-plaintiff-route',
              condition1: {
                field: 'notes',
                keywords: ['خبراء'],
              },
              condition2: {
                enabled: true,
                field: 'roleCapacity',
                keywords: ['مدعين'],
              },
              actions: {
                createTask: true,
                taskMessage: 'مراجعة ملف الخبراء للمدعين',
                updateField: true,
                targetField: 'fileStatus',
                newValue: 'يحتاج مراجعة',
                doRollover: true,
                targetRoute: 'chamber',
              },
            },
          ],
        },
      }
    );

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      title: 'مراجعة ملف الخبراء للمدعين',
      taskType: 'custom_automation',
      sourceRuleId: 'LB-DYNAMIC-CUSTOM-REMINDERS',
    });
    expect(result.updates).toMatchObject({
      fileStatus: 'يحتاج مراجعة',
      agendaRoute: 'chamber',
      status: 'under_review',
    });
    expect(result.hits.filter((hit) => hit.ruleId === 'LB-DYNAMIC-CUSTOM-REMINDERS').length).toBeGreaterThanOrEqual(3);
  });
});
