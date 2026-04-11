/**
 * LawBase Storage Layer
 * ====================
 * Firestore data access — single source of truth لكل عمليات القراءة والكتابة.
 * يستخدم Firebase compat SDK v9 (namespaced) — firebase.firestore() فقط.
 *
 * القاعدة: كل update يستخدم { merge: true } — لا full overwrite أبداً.
 * القاعدة: كل Firestore schema change = additive فقط.
 *
 * @module Storage
 * @version 1.0.0
 */

import { CASE_FLAGS_DEFAULT } from '../core/Constants.js';
import { initAuditLogger } from '@/services/AuditLogger.js';

// ─── Firestore instance (تُعيَّن عند initStorage) ────────────────────────────
let _db = null;

function ensureDb() {
  if (!_db) {
    throw new Error('Storage has not been initialized with Firestore');
  }
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

const ALLOWED_CASE_FIELDS = new Set([
  'caseNumber', 'caseYear', 'plaintiffName', 'defendantName',
  'court', 'circuit', 'roleCapacity', 'procedureTrack',
  'title', 'filingDate', 'lastSessionDate', 'sessionResult',
  'notificationsEnabled',
  'summaryDecision', 'judgmentCategory', 'judgmentPronouncement',
  'nextSessionDate', 'nextSessionType',
  'litigationStage', 'agendaRoute', 'fileLocation', 'fileStatus',
  'status', 'judge', 'defendantAddress', 'joinedCases',
  'otherDefendants', 'chosenHeadquarters',
  'assignedCounsel', 'inspectionRequests', 'sessionPreparation', 'previousSession',
  'firstInstanceNumber', 'firstInstanceCourt', 'firstInstanceDate', 'firstInstanceJudgment',
  'notes', 'flags', 'attachments', 'sessionsHistory',
  'dismissedInlineAlerts', 'snoozedInlineAlerts',
  'derivedDeadlines', 'derivedAlerts', 'ruleHits', 'ruleEvaluationMeta',
  'lastRuleEvaluationAt',
  'criticalDeadlineDate', 'criticalDeadlineLabel', 'criticalDeadlineSource', 'criticalDeadline',
  'operationalStatus', 'nextAction', 'workflowStage', 'proceduralFlags',
  'customFields',
  'caseProcedures', 'coverImage', 'criticalHighlightUrl',
  'judgments', 'tasks', 'history',
  'workspaceId', 'createdAt', 'updatedAt', 'id',
  'fieldDensity',
  'claimAmount',
  'returnedFromJudgmentsAt',
]);

function sanitizeCasePayload(payload) {
  const clean = {};
  for (const key of Object.keys(payload || {})) {
    if (ALLOWED_CASE_FIELDS.has(key)) {
      clean[key] = payload[key];
    }
  }
  return clean;
}

async function deleteCollectionDocs(collectionRef, batchSize = 200) {
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = _db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < batchSize) break;
  }
}

/**
 * تهيئة الـ Storage بـ Firestore instance
 * تُستدعى مرة واحدة في app.js بعد firebase.initializeApp()
 */
export function initStorage(firestoreInstance) {
  _db = firestoreInstance;
  initAuditLogger(firestoreInstance);
}

/**
 * الـ storage object — يُستورد في كل مكان
 * استخدام: import { storage } from './data/Storage.js';
 */
export const storage = {

  // ════════════════════════════════════════════════════════════════
  // WORKSPACE
  // ════════════════════════════════════════════════════════════════

  /**
   * جلب بيانات الـ workspace
   */
  async getWorkspace(workspaceId) {
    if (!workspaceId) return null;
    try {
      const doc = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.error('[Storage.getWorkspace]', err);
      return null;
    }
  },

  /**
   * جلب إعدادات الـ workspace
   */
  async getWorkspaceSettings(workspaceId) {
    if (!workspaceId) return {};
    try {
      const doc = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('settings')
        .doc('general')
        .get();
      return doc.exists ? doc.data() : {};
    } catch (err) {
      console.error('[Storage.getWorkspaceSettings]', err);
      return {};
    }
  },

  /**
   * تحديث إعدادات الـ workspace
   */
  async updateWorkspaceSettings(workspaceId, updates) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('settings')
      .doc('general')
      .set(updates, { merge: true });
  },

  async listWorkspaceMembers(workspaceId) {
    if (!workspaceId) return [];
    try {
      const snapshot = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('members')
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('listWorkspaceMembers error:', error);
      return [];
    }
  },

  async getWorkspaceMember(workspaceId, uid) {
    const resolvedWorkspaceId = String(workspaceId || '').trim();
    const resolvedUserId = String(uid || '').trim();
    if (!resolvedWorkspaceId || !resolvedUserId) return null;

    try {
      const doc = await _db
        .collection('workspaces')
        .doc(resolvedWorkspaceId)
        .collection('members')
        .doc(resolvedUserId)
        .get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('[Storage.getWorkspaceMember]', error);
      return null;
    }
  },

  async updateWorkspaceMemberRole(workspaceId, uid, role) {
    const resolvedWorkspaceId = String(workspaceId || '').trim();
    const resolvedUserId = String(uid || '').trim();
    const resolvedRole = String(role || '').trim();
    const allowedRoles = ['admin', 'lawyer', 'secretary', 'readonly'];

    if (!resolvedWorkspaceId || !resolvedUserId) {
      throw new Error('workspaceId و uid مطلوبان');
    }
    if (!allowedRoles.includes(resolvedRole)) {
      throw new Error('role غير صالح');
    }

    await _db
      .collection('workspaces')
      .doc(resolvedWorkspaceId)
      .collection('members')
      .doc(resolvedUserId)
      .set({ role: resolvedRole }, { merge: true });
  },

  async setWorkspaceMemberActive(workspaceId, uid, isActive) {
    const resolvedWorkspaceId = String(workspaceId || '').trim();
    const resolvedUserId = String(uid || '').trim();

    if (!resolvedWorkspaceId || !resolvedUserId) {
      throw new Error('workspaceId و uid مطلوبان');
    }

    await _db
      .collection('workspaces')
      .doc(resolvedWorkspaceId)
      .collection('members')
      .doc(resolvedUserId)
      .set({ isActive: Boolean(isActive) }, { merge: true });
  },

  async getUserProfile(uid) {
    const userId = String(uid || '').trim();
    if (!userId) return null;

    try {
      const doc = await _db.collection('users').doc(userId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('[Storage.getUserProfile]', error);
      return null;
    }
  },

  async createOrUpdateUserProfile(user, extraData = {}) {
    ensureDb();

    const userId = String(user?.uid || extraData?.uid || '').trim();
    if (!userId) {
      throw new Error('user.uid مطلوب');
    }

    const existingProfile = await this.getUserProfile(userId);
    const createdAt = existingProfile?.createdAt || nowIso();
    const updatedAt = nowIso();
    const workspaceIds = Array.isArray(extraData.workspaceIds)
      ? uniqueStrings(extraData.workspaceIds)
      : uniqueStrings(existingProfile?.workspaceIds);
    const primaryWorkspaceId = String(
      extraData.primaryWorkspaceId
      ?? existingProfile?.primaryWorkspaceId
      ?? ''
    ).trim();

    const payload = {
      uid: userId,
      displayName: String(
        extraData.displayName
        ?? user?.displayName
        ?? existingProfile?.displayName
        ?? ''
      ).trim(),
      email: String(
        extraData.email
        ?? user?.email
        ?? existingProfile?.email
        ?? ''
      ).trim(),
      photoURL: String(
        extraData.photoURL
        ?? user?.photoURL
        ?? existingProfile?.photoURL
        ?? ''
      ).trim(),
      workspaceIds,
      primaryWorkspaceId,
      createdAt,
      updatedAt,
    };

    if (extraData.preferences || existingProfile?.preferences) {
      payload.preferences = extraData.preferences || existingProfile?.preferences;
    }

    await _db.collection('users').doc(userId).set(payload, { merge: true });
    return payload;
  },

  async createWorkspace(workspaceData = {}) {
    ensureDb();

    const now = nowIso();
    const docRef = _db.collection('workspaces').doc();
    const payload = {
      id: docRef.id,
      name: String(workspaceData.name || 'مساحة العمل').trim() || 'مساحة العمل',
      ownerId: String(workspaceData.ownerId || '').trim(),
      plan: String(workspaceData.plan || 'free').trim() || 'free',
      createdAt: workspaceData.createdAt || now,
      updatedAt: now,
      ...workspaceData,
      id: docRef.id,
      ownerId: String(workspaceData.ownerId || '').trim(),
      updatedAt: now,
    };

    await docRef.set(payload);
    return payload;
  },

  async addWorkspaceMember(workspaceId, userId, memberData = {}) {
    ensureDb();

    const resolvedWorkspaceId = String(workspaceId || '').trim();
    const resolvedUserId = String(userId || memberData?.uid || '').trim();
    if (!resolvedWorkspaceId || !resolvedUserId) {
      throw new Error('workspaceId و userId مطلوبان');
    }

    const existingDoc = await _db
      .collection('workspaces')
      .doc(resolvedWorkspaceId)
      .collection('members')
      .doc(resolvedUserId)
      .get();
    const existingData = existingDoc.exists ? (existingDoc.data() || {}) : {};

    const payload = {
      uid: resolvedUserId,
      displayName: String(memberData.displayName ?? existingData.displayName ?? '').trim(),
      email: String(memberData.email ?? existingData.email ?? '').trim(),
      role: String(memberData.role ?? existingData.role ?? 'admin').trim() || 'admin',
      joinedAt: String(memberData.joinedAt ?? existingData.joinedAt ?? nowIso()).trim(),
      isActive: memberData.isActive ?? existingData.isActive ?? true,
    };

    await _db
      .collection('workspaces')
      .doc(resolvedWorkspaceId)
      .collection('members')
      .doc(resolvedUserId)
      .set(payload, { merge: true });

    return payload;
  },

  async bootstrapUserWorkspace(user) {
    ensureDb();

    const userId = String(user?.uid || '').trim();
    if (!userId) {
      throw new Error('user.uid مطلوب');
    }

    const existingProfile = await this.getUserProfile(userId);
    const profileWorkspaceIds = uniqueStrings(existingProfile?.workspaceIds);
    const profilePrimaryWorkspaceId = String(existingProfile?.primaryWorkspaceId || '').trim();

    let ownedWorkspaces = [];
    try {
      const ownedSnapshot = await _db
        .collection('workspaces')
        .where('ownerId', '==', userId)
        .get();
      ownedWorkspaces = ownedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[Storage.bootstrapUserWorkspace] owned workspaces lookup failed:', error);
    }

    let memberWorkspaceIds = [];
    try {
      const memberSnapshot = await _db
        .collectionGroup('members')
        .where('uid', '==', userId)
        .get();
      memberWorkspaceIds = uniqueStrings(
        memberSnapshot.docs.map((doc) => doc.ref.parent.parent?.id)
      );
    } catch (error) {
      console.warn('[Storage.bootstrapUserWorkspace] member workspace lookup skipped:', error);
    }

    const candidateWorkspaceIds = uniqueStrings([
      ...profileWorkspaceIds,
      profilePrimaryWorkspaceId,
      ...ownedWorkspaces.map((workspace) => workspace.id),
      ...memberWorkspaceIds,
    ]);

    const candidateWorkspaces = await Promise.all(
      candidateWorkspaceIds.map((workspaceId) => this.getWorkspace(workspaceId))
    );
    let validWorkspaces = candidateWorkspaces.filter(Boolean);
    let createdWorkspace = null;

    if (validWorkspaces.length === 0) {
      const workspaceLabel = String(
        user?.displayName
        || String(user?.email || '').split('@')[0]
        || ''
      ).trim();
      createdWorkspace = await this.createWorkspace({
        name: workspaceLabel ? `مساحة عمل ${workspaceLabel}` : 'مساحة العمل',
        ownerId: userId,
        plan: 'free',
      });
      validWorkspaces = [createdWorkspace];
    }

    const currentWorkspace = validWorkspaces.find(
      (workspace) => String(workspace?.id || '') === profilePrimaryWorkspaceId
    ) || validWorkspaces[0] || null;
    const finalWorkspaceIds = uniqueStrings(validWorkspaces.map((workspace) => workspace?.id));

    const ownedWorkspaceIds = new Set(
      uniqueStrings([
        ...ownedWorkspaces.map((workspace) => workspace.id),
        createdWorkspace?.id,
      ])
    );

    await Promise.all(
      validWorkspaces
        .filter((workspace) => ownedWorkspaceIds.has(String(workspace?.id || '')))
        .map((workspace) => this.addWorkspaceMember(workspace.id, userId, {
          uid: userId,
          displayName: user?.displayName || existingProfile?.displayName || '',
          email: user?.email || existingProfile?.email || '',
          role: 'admin',
          isActive: true,
        }))
    );

    const userProfile = await this.createOrUpdateUserProfile(user, {
      workspaceIds: finalWorkspaceIds,
      primaryWorkspaceId: currentWorkspace?.id || '',
    });

    return {
      userProfile,
      workspaces: validWorkspaces,
      currentWorkspace,
      createdWorkspace,
    };
  },

  // ════════════════════════════════════════════════════════════════
  // CASES
  // ════════════════════════════════════════════════════════════════

  /**
   * جلب قضية واحدة بالـ ID
   * مع backward compatibility لـ flags (PATCH 2)
   */
  async getCase(workspaceId, caseId) {
    if (!workspaceId || !caseId) return null;
    try {
      const doc = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('cases')
        .doc(String(caseId))
        .get();
      if (!doc.exists) return null;

      const data = { id: doc.id, ...doc.data() };

      // Backward compatibility — PATCH 2
      if (!data.flags) {
        data.flags = { ...CASE_FLAGS_DEFAULT };
      }

      return data;
    } catch (err) {
      console.error('[Storage.getCase]', err);
      return null;
    }
  },

  /**
   * قائمة القضايا
   */
  async listCases(workspaceId, { limit = 50, status } = {}) {
    if (!workspaceId) return [];
    try {
      let query = _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('cases')
        .orderBy('updatedAt', 'desc')
        .limit(limit);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() };
        // Backward compatibility — PATCH 2
        if (!data.flags) data.flags = { ...CASE_FLAGS_DEFAULT };
        return data;
      });
    } catch (err) {
      console.error('[Storage.listCases]', err);
      return [];
    }
  },

  /**
   * إنشاء قضية جديدة
   */
  async createCase(workspaceId, caseData) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const docRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc();

    const payload = {
      ...caseData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      flags: caseData.flags || { ...CASE_FLAGS_DEFAULT },
      createdAt: caseData.createdAt || now,
      updatedAt: now,
    };
    const safePayload = sanitizeCasePayload(payload);

    await docRef.set(safePayload);
    return safePayload;
  },

  /**
   * تحديث قضية — partial update دائماً
   */
  async updateCase(workspaceId, caseId, updates) {
    if (!workspaceId || !caseId) throw new Error('workspaceId وcaseId مطلوبان');
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const safeUpdates = sanitizeCasePayload(payload);
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .set(safeUpdates, { merge: true });
  },

  async appendToHistory(workspaceId, caseId, historyEntry) {
    if (!workspaceId || !caseId || !historyEntry) return;

    const caseData = await this.getCase(workspaceId, caseId);
    if (!caseData) return;

    const currentHistory = Array.isArray(caseData.history) ? caseData.history : [];
    const updatedHistory = [
      ...currentHistory,
      {
        ...historyEntry,
        timestamp: historyEntry.timestamp || new Date().toISOString(),
      },
    ];

    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .set(
        { history: updatedHistory, updatedAt: new Date().toISOString() },
        { merge: true }
      );
  },

  /**
   * حذف قضية
   */
  async deleteCase(workspaceId, caseId) {
    if (!workspaceId || !caseId) throw new Error('workspaceId وcaseId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .delete();
  },

  // ════════════════════════════════════════════════════════════════
  // SESSIONS
  // ════════════════════════════════════════════════════════════════

  async listSessions(workspaceId, { limit = 50, caseId } = {}) {
    if (!workspaceId) return [];
    try {
      let query = _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('sessions')
        .orderBy('date', 'desc')
        .limit(limit);

      if (caseId) {
        query = query.where('caseId', '==', String(caseId));
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.listSessions]', err);
      return [];
    }
  },

  async createSession(workspaceId, sessionData, caseData = null) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const docRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('sessions')
      .doc();

    const snapshot = caseData ? {
      caseStatus: String(caseData.status || '').trim(),
      litigationStage: String(caseData.litigationStage || '').trim(),
      agendaRoute: String(caseData.agendaRoute || '').trim(),
      court: String(caseData.court || '').trim(),
      circuit: String(caseData.circuit || '').trim(),
      roleCapacity: String(caseData.roleCapacity || caseData.role || '').trim(),
      fileLocation: String(caseData.fileLocation || caseData.location || '').trim(),
      procedureTrack: String(caseData.procedureTrack || '').trim(),
      takenAt: now,
    } : null;

    const payload = {
      ...sessionData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      createdAt: now,
      updatedAt: now,
      ...(snapshot ? { snapshot } : {}),
    };

    await docRef.set(payload);
    return payload;
  },

  async updateSession(workspaceId, sessionId, updates) {
    if (!workspaceId || !sessionId) throw new Error('workspaceId وsessionId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('sessions')
      .doc(String(sessionId))
      .set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  },

  async deleteSession(workspaceId, sessionId) {
    if (!workspaceId || !sessionId) throw new Error('workspaceId وsessionId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('sessions')
      .doc(String(sessionId))
      .delete();
  },

  // ════════════════════════════════════════════════════════════════
  // JUDGMENTS
  // ════════════════════════════════════════════════════════════════

  async listJudgments(workspaceId, { limit = 50 } = {}) {
    if (!workspaceId) return [];
    try {
      const snapshot = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('judgments')
        .orderBy('date', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.listJudgments]', err);
      return [];
    }
  },

  async listJudgmentsForCase(workspaceId, caseId) {
    if (!workspaceId || !caseId) return [];
    try {
      const snapshot = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('judgments')
        .where('caseId', '==', String(caseId))
        .orderBy('date', 'desc')
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.listJudgmentsForCase]', err);
      return [];
    }
  },

  async createJudgment(workspaceId, judgmentData) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const docRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('judgments')
      .doc();

    const payload = {
      // Backward compatible defaults — PATCH 3
      judgmentType: null,
      summaryDecision: '',
      judgmentCategory: '',
      judgmentPronouncement: '',
      originSessionType: '',
      originSessionDate: '',
      pronouncementDate: '',
      appealDeadlineDays: null,
      appealDeadlineDate: '',
      executionStatus: 'pending',
      linkedProcedures: [],
      ...judgmentData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);
    return payload;
  },

  async updateJudgment(workspaceId, judgmentId, updates) {
    if (!workspaceId || !judgmentId) throw new Error('workspaceId وjudgmentId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('judgments')
      .doc(String(judgmentId))
      .set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  },

  // ════════════════════════════════════════════════════════════════
  // TASKS
  // ════════════════════════════════════════════════════════════════

  async listTasks(workspaceId, { limit = 50, caseId, status } = {}) {
    if (!workspaceId) return [];
    try {
      let query = _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('tasks');

      if (caseId) query = query.where('caseId', '==', String(caseId));
      if (status) query = query.where('status', '==', status);

      const snapshot = await query.get();
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = docs.sort((a, b) => {
        if (a.dueDate && b.dueDate) return String(a.dueDate).localeCompare(String(b.dueDate));
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        const ac = String(a.createdAt || '');
        const bc = String(b.createdAt || '');
        return bc.localeCompare(ac);
      });
      return Number.isFinite(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
    } catch (err) {
      console.error('[Storage.listTasks]', err);
      return [];
    }
  },

  async createTask(workspaceId, taskData) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const docRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('tasks')
      .doc();

    const payload = {
      autoGenerated: taskData?.autoGenerated || false,
      createdByRuleId: '',
      createdByRuleName: '',
      explanation: '',
      status: taskData?.status || 'open',
      priority: taskData?.priority || 'medium',
      taskType: taskData?.taskType || 'manual',
      createdAt: taskData?.createdAt || now,
      ...taskData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      createdAt: taskData?.createdAt || now,
      updatedAt: now,
    };

    await docRef.set(payload);
    return payload;
  },

  async updateTask(workspaceId, taskId, updates) {
    if (!workspaceId || !taskId) throw new Error('workspaceId وtaskId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('tasks')
      .doc(String(taskId))
      .set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  },

  async deleteTask(workspaceId, taskId) {
    if (!workspaceId || !taskId) throw new Error('workspaceId وtaskId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('tasks')
      .doc(String(taskId))
      .delete();
  },

  async applyRuleEvaluation(workspaceId, caseId, evaluation) {
    if (!workspaceId || !caseId) throw new Error('workspaceId وcaseId مطلوبان');

    const payload = sanitizeCasePayload({
      ...(evaluation?.updates || {}),
      derivedDeadlines: Array.isArray(evaluation?.deadlines) ? evaluation.deadlines : [],
      derivedAlerts: Array.isArray(evaluation?.alerts) ? evaluation.alerts : [],
      ruleHits: Array.isArray(evaluation?.hits) ? evaluation.hits : [],
      ruleEvaluationMeta: evaluation?.meta || {},
      updatedAt: nowIso(),
    });

    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .set(payload, { merge: true });
  },

  async syncCaseTasks(workspaceId, caseId, tasks = []) {
    if (!workspaceId || !caseId) throw new Error('workspaceId وcaseId مطلوبان');

    const now = nowIso();
    const tasksRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('tasks');
    const nextTasks = Array.isArray(tasks) ? tasks : [];
    const nextTaskIds = new Set(nextTasks.map((task) => String(task?.id || '').trim()).filter(Boolean));
    const existingTasks = await this.listTasks(workspaceId, { caseId, limit: 0 });
    const batch = _db.batch();
    let hasBatchWrites = false;

    nextTasks.forEach((task) => {
      const taskId = String(task?.id || '').trim();
      const docRef = taskId ? tasksRef.doc(taskId) : tasksRef.doc();
      batch.set(docRef, {
        ...task,
        id: docRef.id,
        workspaceId: String(workspaceId),
        caseId: String(caseId),
        createdAt: task?.createdAt || now,
        updatedAt: now,
      }, { merge: true });
      hasBatchWrites = true;
    });

    existingTasks.forEach((task) => {
      const source = String(task?.originSource || task?.source || '');
      const isRuleTask = source === 'rule' || Boolean(task?.originRuleId || task?.sourceRuleId);
      if (isRuleTask && !nextTaskIds.has(String(task?.id || ''))) {
        batch.delete(tasksRef.doc(String(task.id)));
        hasBatchWrites = true;
      }
    });

    if (hasBatchWrites) {
      await batch.commit();
    }
  },

  // ════════════════════════════════════════════════════════════════
  // WORKSPACE OPTIONS — للـ dropdowns (PATCH 5)
  // ════════════════════════════════════════════════════════════════

  async getWorkspaceOptions(workspaceId, optionType) {
    if (!workspaceId || !optionType) return [];
    try {
      const doc = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('options')
        .doc(String(optionType))
        .get();
      return doc.exists ? (doc.data()?.items || []) : [];
    } catch (err) {
      console.error('[Storage.getWorkspaceOptions]', err);
      return [];
    }
  },

  async saveWorkspaceOptions(workspaceId, optionType, items) {
    if (!workspaceId || !optionType) throw new Error('workspaceId وoptionType مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('options')
      .doc(String(optionType))
      .set({ type: optionType, items, updatedAt: new Date().toISOString() }, { merge: true });
  },

  // ════════════════════════════════════════════════════════════════
  // ARCHIVE — للأرشيف الذكي (PATCH 7)
  // ════════════════════════════════════════════════════════════════

  async createArchiveDocument(workspaceId, docData) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const docRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('archive')
      .doc();

    const payload = {
      title: '',
      section: 'session_rolls',
      customSection: '',
      fileUrl: '',
      driveFileId: '',
      linkedSessionId: '',
      linkedCaseId: '',
      notes: '',
      tags: [],
      ...docData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      uploadDate: docData.uploadDate || now,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);
    return payload;
  },

  async listArchiveDocuments(workspaceId, { section, linkedCaseId, linkedSessionId } = {}) {
    if (!workspaceId) return [];
    try {
      let query = _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('archive')
        .orderBy('uploadDate', 'desc');

      if (section) query = query.where('section', '==', section);
      if (linkedCaseId) query = query.where('linkedCaseId', '==', linkedCaseId);
      if (linkedSessionId) query = query.where('linkedSessionId', '==', linkedSessionId);

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.listArchiveDocuments]', err);
      return [];
    }
  },

  async updateArchiveDocument(workspaceId, docId, updates) {
    if (!workspaceId || !docId) throw new Error('workspaceId وdocId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('archive')
      .doc(String(docId))
      .set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  },

  async deleteArchiveDocument(workspaceId, docId) {
    if (!workspaceId || !docId) throw new Error('workspaceId وdocId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('archive')
      .doc(String(docId))
      .delete();
  },

  // ════════════════════════════════════════════════════════════════
  // TEMPLATES — للنماذج الذكية (PATCH 9)
  // ════════════════════════════════════════════════════════════════

  async listTemplates(workspaceId) {
    if (!workspaceId) return [];
    try {
      const snapshot = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('templates')
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.listTemplates]', err);
      return [];
    }
  },

  async saveTemplate(workspaceId, templateData) {
    if (!workspaceId) throw new Error('workspaceId مطلوب');
    const now = new Date().toISOString();
    const isNew = !templateData.id;
    const docRef = isNew
      ? _db.collection('workspaces').doc(String(workspaceId)).collection('templates').doc()
      : _db.collection('workspaces').doc(String(workspaceId)).collection('templates').doc(templateData.id);

    const payload = {
      ...templateData,
      id: docRef.id,
      workspaceId: String(workspaceId),
      createdAt: templateData.createdAt || now,
      updatedAt: now,
    };

    await docRef.set(payload, { merge: true });
    return payload;
  },

  async deleteTemplate(workspaceId, templateId) {
    if (!workspaceId || !templateId) throw new Error('workspaceId وtemplateId مطلوبان');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('templates')
      .doc(String(templateId))
      .delete();
  },

  async saveCaseDocument(workspaceId, caseId, docData = {}) {
    if (!workspaceId || !caseId) throw new Error('workspaceId وcaseId مطلوبان');
    const now = new Date().toISOString();
    const documentsRef = _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .collection('documents');
    const docRef = docData?.id ? documentsRef.doc(String(docData.id)) : documentsRef.doc();

    const payload = {
      id: docRef.id,
      caseId: String(caseId),
      workspaceId: String(workspaceId),
      title: String(docData?.title || '').trim() || 'مستند',
      htmlContent: String(docData?.htmlContent || ''),
      type: String(docData?.type || 'custom').trim() || 'custom',
      sourceTemplateId: String(docData?.sourceTemplateId || '').trim(),
      sourceTemplateName: String(docData?.sourceTemplateName || '').trim(),
      createdAt: docData?.createdAt || now,
      updatedAt: now,
    };

    await docRef.set(payload, { merge: true });
    return payload;
  },

  async getCaseDocuments(workspaceId, caseId) {
    if (!workspaceId || !caseId) return [];
    try {
      const snapshot = await _db
        .collection('workspaces')
        .doc(String(workspaceId))
        .collection('cases')
        .doc(String(caseId))
        .collection('documents')
        .orderBy('updatedAt', 'desc')
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Storage.getCaseDocuments]', err);
      return [];
    }
  },

  async deleteCaseDocument(workspaceId, caseId, docId) {
    if (!workspaceId || !caseId || !docId) throw new Error('workspaceId وcaseId وdocId مطلوبة');
    await _db
      .collection('workspaces')
      .doc(String(workspaceId))
      .collection('cases')
      .doc(String(caseId))
      .collection('documents')
      .doc(String(docId))
      .delete();
  },

  async clearWorkspaceData(workspaceId) {
    ensureDb();

    const resolvedWorkspaceId = String(workspaceId || '').trim();
    if (!resolvedWorkspaceId) throw new Error('workspaceId مطلوب');

    const workspaceRef = _db.collection('workspaces').doc(resolvedWorkspaceId);
    const casesSnapshot = await workspaceRef.collection('cases').get();
    for (const caseDoc of casesSnapshot.docs) {
      await deleteCollectionDocs(caseDoc.ref.collection('documents'));
    }
    const collectionsToClear = [
      'cases',
      'sessions',
      'judgments',
      'tasks',
      'archive',
      'templates',
      'options',
      'settings',
    ];

    for (const collectionName of collectionsToClear) {
      await deleteCollectionDocs(workspaceRef.collection(collectionName));
    }
  },

  /**
   * Batch 1.1 — SSOT: Update user's primary workspace in Firestore
   */
  async updateUserPrimaryWorkspace(userId, workspaceId) {
    if (!userId || !workspaceId) return;
    await db
      .collection('users')
      .doc(String(userId))
      .set({ primaryWorkspaceId: String(workspaceId) }, { merge: true });
  },

  /**
   * Batch 5.3 — Firebase Storage: Upload attachment file
   * PRO plan only — called by SubscriptionManager guard
   * @param {string} workspaceId
   * @param {string} caseId
   * @param {string} attachmentId
   * @param {File} file
   * @param {function} onProgress - callback(percentage)
   * @returns {Promise<string>} download URL
   */
  async uploadAttachment(workspaceId, caseId, attachmentId, file, onProgress) {
    if (!workspaceId || !caseId || !attachmentId || !file) {
      throw new Error('uploadAttachment: missing required parameters');
    }
    const { storage: fbStorage } = await import('@/config/firebase.js');
    const path = `workspaces/${workspaceId}/cases/${caseId}/${attachmentId}`;
    const ref = fbStorage.ref(path);
    return new Promise((resolve, reject) => {
      const task = ref.put(file);
      task.on(
        'state_changed',
        (snapshot) => {
          if (onProgress) {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            onProgress(pct);
          }
        },
        (error) => reject(error),
        async () => {
          const downloadUrl = await task.snapshot.ref.getDownloadURL();
          resolve(downloadUrl);
        }
      );
    });
  },

  /**
   * Batch 5.3 — Firebase Storage: Delete attachment file
   */
  async deleteAttachment(workspaceId, caseId, attachmentId) {
    if (!workspaceId || !caseId || !attachmentId) return;
    try {
      const { storage: fbStorage } = await import('@/config/firebase.js');
      const path = `workspaces/${workspaceId}/cases/${caseId}/${attachmentId}`;
      await fbStorage.ref(path).delete();
    } catch (error) {
      // File may not exist in cloud — not critical
      if (error.code !== 'storage/object-not-found') {
        console.error('deleteAttachment error:', error);
      }
    }
  },
};

export default storage;
