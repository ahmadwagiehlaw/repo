function hasDisplayValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

export function readLegacyCaseField(caseData, canonicalKey, legacyKeys = []) {
  const canonicalValue = caseData?.[canonicalKey];
  if (hasDisplayValue(canonicalValue)) return canonicalValue;

  for (const legacyKey of legacyKeys) {
    const legacyValue = caseData?.[legacyKey];
    if (hasDisplayValue(legacyValue)) return legacyValue;
  }

  return Array.isArray(canonicalValue) ? [] : '';
}

function toSortedHistory(caseData) {
  return Array.isArray(caseData?.sessionsHistory)
    ? [...caseData.sessionsHistory].sort((a, b) => new Date(b?.date || b?.sessionDate || 0) - new Date(a?.date || a?.sessionDate || 0))
    : [];
}

export function getLastSessionSnapshot(caseData) {
  return toSortedHistory(caseData)[0] || null;
}

export function getCaseTitle(caseData) {
  return String(readLegacyCaseField(caseData, 'title', ['subject']) || '').trim();
}

export function getCaseSessionResult(caseData) {
  return String(readLegacyCaseField(caseData, 'sessionResult', ['courtDecision']) || '').trim();
}

export function getCaseRoleCapacity(caseData) {
  return String(readLegacyCaseField(caseData, 'roleCapacity', ['role']) || '').trim();
}

export function getCaseFileLocation(caseData) {
  return String(readLegacyCaseField(caseData, 'fileLocation', ['location']) || '').trim();
}

export function getCaseProcedureTrack(caseData) {
  return String(readLegacyCaseField(caseData, 'procedureTrack', ['caseType']) || '').trim();
}

export function getDerivedCaseSessionType(caseData) {
  if (hasDisplayValue(caseData?.nextSessionType)) return String(caseData.nextSessionType).trim();

  const lastSession = getLastSessionSnapshot(caseData);
  const historyValue = String(lastSession?.sessionType || lastSession?.type || '').trim();
  if (historyValue) return historyValue;

  // Read-only fallback for pre-canonicalized case documents.
  return String(caseData?.sessionType || '').trim();
}

export function getDerivedCaseRollNumber(caseData) {
  const lastSession = getLastSessionSnapshot(caseData);
  const historyValue = String(lastSession?.rollNumber || '').trim();
  if (historyValue) return historyValue;

  // Read-only fallback for pre-canonicalized case documents.
  return String(caseData?.rollNumber || '').trim();
}

export function getSessionSnapshot(sessionData) {
  if (!sessionData?.snapshot) return null;
  const s = sessionData.snapshot;
  return {
    caseStatus: String(s.caseStatus || '').trim(),
    litigationStage: String(s.litigationStage || '').trim(),
    agendaRoute: String(s.agendaRoute || '').trim(),
    court: String(s.court || '').trim(),
    circuit: String(s.circuit || '').trim(),
    roleCapacity: String(s.roleCapacity || '').trim(),
    fileLocation: String(s.fileLocation || '').trim(),
    procedureTrack: String(s.procedureTrack || '').trim(),
    takenAt: String(s.takenAt || '').trim(),
  };
}
