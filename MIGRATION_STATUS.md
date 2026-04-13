MIGRATION STATUS v2.1 - LawBase Stable Release
2026-04-13

LawBase Tech Lead

Patches
- P0 = 100% - Firebase compat + Contexts
- P1 = 100% - Attachments + LocalFileIndex + CloudSync
- P2 = 100% - Case Flags + Badges
- P3 = 100% - Judgments + Agenda + Deadline Calc
- P4 = 100% - Tasks UI + tooltip + manual icon
- P5 = 100% - Workspace Switcher
- P6 = 90% - Sessions print.css + workspace-name header
- P7 = 100% - Archive
- P8 = 100% - Session Rollover
- P9 = 90% - Templates Monolith
- P10 = 100% - AI Panel + AssistantService + ContextBuilder
- P11 = 100% - manifest + sw.js + CameraUpload + InstallPrompt + icon paths + drawer
- P12 = 100% - Storage upload + firebase.js + signed URLs
- P13 = 94% - AuditLogger + SubscriptionManager + FeatureGate + Settings wiring complete; ActivationRequest and SuperAdmin Firestore access routed through Storage.js; Admin tab removed from Settings UI

Completed / confirmed
- PERF-3 completed - Cairo font via @fontsource/cairo + Google Fonts CDN
- WIRE-1 completed - evaluateRules after mutations
- WIRE-2 completed - sessionsHistory via arrayUnion only
- WIRE-5 completed - AuditLogger coverage added for Settings-side mutations
- WIRE-4 patch 1 completed - ActivationRequest direct Firestore write removed and routed through Storage.js via createActivationRequest()
- WIRE-4 patch 2 completed - SuperAdmin Firestore reads/writes routed through Storage.js helpers
- WIRE-4 patch 2 (details) completed:
  - Removed direct db/firebase import from SuperAdmin.jsx
  - Routed activation requests loading through Storage.js
  - Routed workspace loading and per-workspace case counts through Storage.js
  - Routed workspace plan updates through Storage.js
  - Routed workspace member deletion through Storage.js
  - Routed activation request approve/reject status updates through Storage.js
  - Preserved existing Super Admin UI behavior, filters/sorting, and state flow
- Settings UI cleanup - obsolete Admin tab path removed from Settings.jsx after Super Admin activation

Open items
- WIRE-3 - Ensure CaseTasksTab.jsx uses isInspectionTask from src/utils/caseUtils.js consistently, including loaders

Known blockers / notes
- Unrelated pre-existing build blocker remains: src/pages/Cases/CaseAttachmentsTab.jsx:179 - "Empty parenthesized expression"
- No new build error was introduced from Settings.jsx, ActivationRequest.jsx, or SuperAdmin.jsx
- AdminSubscriptionPanel remains as temporary unreachable dead code inside Settings.jsx; safe to defer physical removal to a later cleanup patch if encoding/file stability allows
- Stable Release, not Rescue Mode
- Continue with safe mini-patches only; do not reopen PERF-3, signed URLs, or drawer unless a newly documented issue appears

Files to watch
- F-1: src/pages/Templates.jsx - 131KB
- F-2: src/pages/Settings.jsx - 92KB
- F-3: src/pages/ActivationRequest.jsx
- F-4: src/data/Storage.js
- F-5: src/pages/SuperAdmin.jsx

END STATUS v2.1
