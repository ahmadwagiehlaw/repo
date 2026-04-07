import { CASE_STATUS, LAWBASE_EVENTS } from '@/core/Constants.js';

export function getJudgmentReservationCaseUpdate(decision) {
  const text = String(decision || '').trim().toLowerCase();
  if (!text) return null;

  if (!(text.includes('حكم') || text.includes('حجز') || text.includes('judgment'))) {
    return null;
  }

  return {
    status: CASE_STATUS.RESERVED_FOR_JUDGMENT,
    agendaRoute: 'judgments',
  };
}

export function getRolloverRouteFromDecision(decision) {
  if (getJudgmentReservationCaseUpdate(decision)) return 'judgments';

  const text = String(decision || '').trim().toLowerCase();
  if (!text) return null;
  if (text.includes('شطب')) return 'archive';
  return null;
}

export function isDecisionUnrouted(decision, caseLike = {}) {
  const route = getRolloverRouteFromDecision(decision);
  if (!route) return false;

  const agendaRoute = String(caseLike?.agendaRoute || '').trim();
  const status = String(caseLike?.status || '').trim();

  if (route === 'judgments') {
    return !(
      agendaRoute === 'judgments'
      && [
        CASE_STATUS.RESERVED_FOR_JUDGMENT,
        CASE_STATUS.JUDGED,
        CASE_STATUS.APPEAL_WINDOW_OPEN,
      ].includes(status)
    );
  }

  if (route === 'archive') {
    return !(
      agendaRoute === 'archive'
      || [CASE_STATUS.ARCHIVED, CASE_STATUS.STRUCK_OUT].includes(status)
    );
  }

  return false;
}

export function getRolloverCasePatch(route) {
  switch (route) {
    case 'next_session':
      return {
        status: CASE_STATUS.ACTIVE,
        agendaRoute: 'sessions',
        updatedAt: new Date().toISOString(),
      };
    case 'judgments':
      return {
        status: CASE_STATUS.RESERVED_FOR_JUDGMENT,
        agendaRoute: 'judgments',
        updatedAt: new Date().toISOString(),
      };
    case 'archive':
      return {
        status: CASE_STATUS.ARCHIVED,
        agendaRoute: 'archive',
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    default:
      return null;
  }
}

export class SessionRollover {
  constructor({ storage }) {
    this.storage = storage;
  }

  async execute(workspaceId, session, options = {}, caseData = null) {
    if (!workspaceId || !session?.id) {
      throw new Error('workspaceId وbيانات الجلسة مطلوبان');
    }

    const results = {
      sessionId: session.id,
      caseId: session.caseId,
      route: options.route || 'next_session',
      archivedNotes: false,
      taskCreated: false,
      historyUpdated: false,
      errors: [],
    };

    try {
      const resolvedCaseData = caseData
        || await this.storage.getCase(workspaceId, session.caseId);

      const historyEntry = {
        sessionId: session.id,
        caseId: session.caseId,
        date: session.date || '',
        sessionDate: session.date || '',
        sessionType: session.sessionType || session.type || '',
        decision: session.decision || session.result || '',
        notes: session.notes || '',
        route: options.route || 'next_session',
        archivedAt: new Date().toISOString(),
        snapshot: resolvedCaseData ? {
          caseStatus: String(resolvedCaseData.status || '').trim(),
          litigationStage: String(resolvedCaseData.litigationStage || '').trim(),
          agendaRoute: String(resolvedCaseData.agendaRoute || '').trim(),
          court: String(resolvedCaseData.court || '').trim(),
          circuit: String(resolvedCaseData.circuit || '').trim(),
          roleCapacity: String((resolvedCaseData.roleCapacity || resolvedCaseData.role) || '').trim(),
          fileLocation: String((resolvedCaseData.fileLocation || resolvedCaseData.location) || '').trim(),
          procedureTrack: String(resolvedCaseData.procedureTrack || '').trim(),
          takenAt: new Date().toISOString(),
        } : null,
      };

      if (!historyEntry.snapshot) delete historyEntry.snapshot;

      // 1. Archive session notes to case history
      if (session.notes || session.decision || session.result) {
        const existingHistory = Array.isArray(resolvedCaseData?.sessionsHistory)
          ? resolvedCaseData.sessionsHistory
          : [];
        const updatedHistory = [...existingHistory, historyEntry];

        await this.storage.updateCase(workspaceId, session.caseId, {
          sessionsHistory: updatedHistory,
          lastSessionDate: session.date,
          sessionResult: session.decision || session.result || '',
          updatedAt: new Date().toISOString(),
        });
        results.archivedNotes = true;
      }

      // Mark this session as rolled over
      await this.storage.updateSession(workspaceId, session.id, {
        rolloverRoute: options.route || 'next_session',
        rolledOverAt: new Date().toISOString(),
      });

      // 2. Route case based on decision
      await this._routeCase(workspaceId, session, options.route, results);

      // 3. Log in case history
      await this.storage.appendToHistory(workspaceId, session.caseId, {
        action: 'session_rollover',
        sessionId: session.id,
        route: options.route,
        actor: options.actorName || 'المستشار',
      });
      results.historyUpdated = true;
    } catch (error) {
      results.errors.push(error.message);
      throw error;
    }

    window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.SESSION_UPDATED, {
      detail: { workspaceId, sessionId: session.id, caseId: session.caseId },
    }));

    return results;
  }

  async _routeCase(workspaceId, session, route, results) {
    const patch = getRolloverCasePatch(route);
    if (patch) {
      await this.storage.updateCase(workspaceId, session.caseId, patch);
    }
  }

  async getAvailableRoutes() {
    return [
      { id: 'next_session', label: 'جلسة قادمة' },
      { id: 'judgments', label: 'أجندة الأحكام' },
      { id: 'archive', label: 'أرشفة القضية' },
    ];
  }
}

export default SessionRollover;
