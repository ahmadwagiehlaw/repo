MIGRATION STATUS v2.1-patch6 — LawBase Stable Release
2026-04-14

Sessions UI — patches applied
- patch1: previousSession removed from DEFAULT_VISIBLE (SessionsList.jsx)
- patch1: previousSession removed from onBlur date-format array (SessionsList.jsx)
- patch2: sessionType + rollNumber saves wired in saveAllEdits (useSessionsData.js)
- patch2: sessionType added to applyBulkFieldUpdate fieldMap (useSessionsData.js)
- patch2: rollNumber added to isEditableColumn (useSessionsData.js)
- patch3: sessionsHistory loop removed — Live view is one row per case (useSessionsData.js)
- patch3: 'past' filter + tab removed (useSessionsData.js, Sessions.jsx)
- patch3: previousSession removed from date search dead code (useSessionsData.js)
- patch4: all cases appear in Live view regardless of lastSessionDate (useSessionsData.js)
- patch4: 'استعلام' filter tab added (useSessionsData.js, Sessions.jsx)
- patch5: arrayUnion guard removed — history always written (SessionRollover.js)
- patch5: auto-promote nextSessionDate → lastSessionDate on rollover (SessionRollover.js)
- patch5: daily session_roll archive document written on each rollover (SessionRollover.js)
- patch6: rollNumber + sessionType added to ALLOWED_CASE_FIELDS (Storage.js)
  — without this patch2 saves were silently dropped by sanitizeCasePayload

SessionRollover workflow (current):
  1. Write historyEntry to sessionsHistory (always)
  2. Promote nextSessionDate → lastSessionDate, clear nextSessionDate
  3. Write rollEntry to archive session_roll document (non-fatal)
  4. Mark session as rolled over in sessions subcollection
  5. Route case (next_session / judgments / archive)
  6. Log action in case history

Patches
- P0–P8 = 100%
- P9 = 90% — Templates Monolith
- P10–P13 = 100%

Known open items in Sessions
- sessionsHistory display in CaseDetails — separate future task

Files to watch
- F-1: src/pages/Templates.jsx
- F-2: src/pages/Settings.jsx
- F-3: src/pages/ActivationRequest.jsx
- F-4: src/pages/SuperAdmin.jsx
- F-5: src/data/Storage.js ← just patched
- F-6: src/pages/Cases/CaseAttachmentsTab.jsx
- F-7: src/components/cases/SmartAttachmentUpload.jsx
- F-8: src/pages/Cases/CaseTasksTab.jsx
- F-9: src/utils/caseUtils.js
- F-10: src/pages/Sessions/SessionsList.jsx
- F-11: src/pages/Sessions/useSessionsData.js
- F-12: src/pages/Sessions/Sessions.jsx
- F-13: src/workflows/SessionRollover.js

END STATUS v2.1-patch6