/**
 * RulesOrchestrator.js
 * ====================
 * Connects RulesEngine + TaskEngine + Storage service.
 */

import { RulesEngine } from './RulesEngine.js';
import { TaskEngine } from './TaskEngine.js';

export class RulesOrchestrator {
  constructor({ storage, rulesSettings = {}, taskSettings = {} } = {}) {
    if (!storage) {
      throw new Error('RulesOrchestrator requires a storage service instance');
    }

    this.storage = storage;
    this.rulesEngine = new RulesEngine(rulesSettings);
    this.taskEngine = new TaskEngine(taskSettings);
  }

  /**
   * Evaluate full case and persist effects.
   * @param {string} workspaceId
   * @param {object} caseData
   * @param {object} context
   */
  async evaluateAndPersistCase(workspaceId, caseData, context = {}) {
    const existingTasks = await this.storage.listTasks(workspaceId, {
      caseId: caseData.id
    });
    const workspaceSettings = typeof this.storage.getWorkspaceSettings === 'function'
      ? await this.storage.getWorkspaceSettings(workspaceId)
      : {};

    const evaluation = this.rulesEngine.evaluateCase(caseData, {
      ...context,
      settings: {
        ...(workspaceSettings || {}),
        ...(context.settings || {})
      },
      existingTasks
    });

    await this.storage.applyRuleEvaluation(workspaceId, caseData.id, evaluation);

    const { tasks: mergedTasks } = this.taskEngine.generateFromRules(caseData, evaluation, existingTasks);

    await this.storage.syncCaseTasks(workspaceId, caseData.id, mergedTasks);

    return {
      evaluation,
      tasks: mergedTasks
    };
  }

  /**
   * Process single event idempotently and persist effects.
   */
  async processEventAndPersist(workspaceId, eventType, eventData, caseData, context = {}) {
    const existingTasks = await this.storage.listTasks(workspaceId, {
      caseId: caseData.id
    });
    const workspaceSettings = typeof this.storage.getWorkspaceSettings === 'function'
      ? await this.storage.getWorkspaceSettings(workspaceId)
      : {};

    const evaluation = this.rulesEngine.processEvent(eventType, eventData, caseData, {
      ...context,
      settings: {
        ...(workspaceSettings || {}),
        ...(context.settings || {})
      },
      existingTasks
    });

    if (evaluation?.meta?.skipped) {
      return { evaluation, tasks: [] };
    }

    await this.storage.applyRuleEvaluation(workspaceId, caseData.id, evaluation);

    const { tasks: mergedTasks } = this.taskEngine.generateFromRules(caseData, evaluation, existingTasks);
    await this.storage.syncCaseTasks(workspaceId, caseData.id, mergedTasks);

    return {
      evaluation,
      tasks: mergedTasks
    };
  }
}

export default RulesOrchestrator;
