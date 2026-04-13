MIGRATION STATUS v2.1 — LawBase Stable Release
2026-04-13

LawBase Tech Lead

Patches
- P0 = 100% — Firebase compat + Contexts
- P1 = 100% — Attachments + LocalFileIndex + CloudSync
- P2 = 100% — Case Flags + Badges
- P3 = 100% — Judgments + Agenda + Deadline Calc
- P4 = 100% — Tasks UI + tooltip + manual icon
- P5 = 100% — Workspace Switcher
- P6 = 100% - Sessions print.css + workspace-name header verified in active Sessions print path
- P7 = 100% — Archive
- P8 = 100% — Session Rollover
- P9 = 90% — Templates Monolith
- P10 = 100% — AI Panel + AssistantService + ContextBuilder
- P11 = 100% — manifest + sw.js + CameraUpload + InstallPrompt + icon paths + drawer
- P12 = 100% — Storage upload + firebase.js + signed URLs
- P13 = 100% — AuditLogger + SubscriptionManager + FeatureGate + Settings wiring complete; ActivationRequest and SuperAdmin Firestore access fully routed through Storage.js; attachments and audit gating/runtime fixes complete; branch-specific verification complete

Completed / confirmed
- PERF-3 completed — Cairo font via @fontsource/cairo + Google Fonts CDN
- WIRE-1 completed — evaluateRules after mutations
- WIRE-2 completed — sessionsHistory via arrayUnion only
- WIRE-3 verified complete for this branch — CaseTasksTab.jsx contains no duplicated inspection-task logic; canonical isInspectionTask(task) exists in src/utils/caseUtils.js and no CaseTasksTab patch is needed
- WIRE-4 completed — All ActivationRequest / SuperAdmin Firestore calls now go through Storage.js only:
  - createActivationRequest()
  - listWorkspaces()
  - getWorkspaceCaseCount()
  - updateWorkspacePlan()
  - deleteWorkspaceMember()
  - listActivationRequests()
  - updateActivationRequestStatus()
- WIRE-5 completed — fine-grained Settings audit and Settings UI cleanup
- Attachments runtime fix completed — FeatureGate import restored in CaseAttachmentsTab.jsx using the actual branch path
- Attachments UX fix completed — local offline attachment add/upload remains available for non-Pro; paid cloudSync notice narrowed to its own scope
- Settings audit runtime fix completed — FeatureGate import restored in Settings.jsx for AuditLogViewer path
- Settings mini-cleanup completed — unreachable AdminSubscriptionPanel dead code removed after confirming admin tab path is filtered/unreachable
- Build restored and passing
- P6 completed - Sessions print path verified: currentWorkspace?.name is passed from Sessions.jsx to SessionsPrintTable.jsx and rendered in the print-only header without affecting on-screen layout

Known blockers / notes
- No current build blocker reproduced
- No new build error introduced from Settings.jsx, ActivationRequest.jsx, SuperAdmin.jsx, Storage.js, CaseAttachmentsTab.jsx, or CaseTasksTab.jsx
- Admin tab remains intentionally filtered from SETTINGS_TABS in current branch
- Stable Release, not Rescue Mode
- Continue with safe mini-patches only; do not reopen PERF-3, signed URLs, or drawer unless a newly documented issue appears

Files to watch
- F-1: src/pages/Templates.jsx — 131KB
- F-2: src/pages/Settings.jsx — large and sensitive; mini-patches only
- F-3: src/pages/ActivationRequest.jsx
- F-4: src/pages/SuperAdmin.jsx
- F-5: src/data/Storage.js
- F-6: src/pages/Cases/CaseAttachmentsTab.jsx
- F-7: src/components/cases/SmartAttachmentUpload.jsx
- F-8: src/pages/Cases/CaseTasksTab.jsx
- F-9: src/utils/caseUtils.js

END STATUS v2.1
