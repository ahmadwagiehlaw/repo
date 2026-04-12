/**
 * Batch 6.3 — AuditLogger
 * Records critical actions to Firestore auditLog collection
 * Pro/Team plan only — guarded by SubscriptionManager
 */
import subscriptionManager from '@/services/SubscriptionManager.js';

let _db = null;

export function initAuditLogger(db) {
  _db = db;
}

const ACTION_TYPES = {
  CASE_CREATE:      'case.create',
  CASE_UPDATE:      'case.update',
  CASE_DELETE:      'case.delete',
  CASE_ARCHIVE:     'case.archive',
  CASE_RESTORE:     'case.restore',
  SESSION_CREATE:   'session.create',
  SESSION_UPDATE:   'session.update',
  JUDGMENT_CREATE:  'judgment.create',
  JUDGMENT_UPDATE:  'judgment.update',
  TASK_CREATE:      'task.create',
  TASK_COMPLETE:    'task.complete',
  ATTACHMENT_ADD:   'attachment.add',
  ATTACHMENT_DELETE:'attachment.delete',
  WORKSPACE_SWITCH: 'workspace.switch',
  SETTINGS_CHANGE:  'settings.change',
};

export { ACTION_TYPES };

class AuditLogger {
  constructor() {
    this._queue = [];
    this._flushing = false;
  }

  // ── Log an action ───────────────────────────────────────
  async log(workspaceId, userId, action, details = {}) {
    if (!subscriptionManager.hasFeature('auditLog')) return;
    if (!_db || !workspaceId || !userId || !action) return;

    const entry = {
      action: String(action),
      details: details && typeof details === 'object' ? details : {},
      userId: String(userId),
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent?.substring(0, 200) || '',
    };

    this._queue.push({ workspaceId, entry });
    if (!this._flushing) this._flush();
  }

  // ── Non-blocking queue flush ────────────────────────────
  async _flush() {
    if (this._flushing || this._queue.length === 0) return;
    this._flushing = true;

    while (this._queue.length > 0) {
      const { workspaceId, entry } = this._queue.shift();
      try {
        await _db
          .collection('workspaces')
          .doc(String(workspaceId))
          .collection('auditLog')
          .add(entry);
      } catch (error) {
        console.warn('AuditLogger: failed to write entry', error);
      }
    }

    this._flushing = false;
  }

  // ── Read recent audit log ───────────────────────────────
  async getRecentLogs(workspaceId, limit = 50) {
    if (!_db || !workspaceId) return [];
    try {
      const snap = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('auditLog')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('AuditLogger.getRecentLogs error:', error);
      return [];
    }
  }
}

export default new AuditLogger();
