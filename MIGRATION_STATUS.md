MIGRATION STATUS v2.4 - LawBase Stable Release
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
- P13 = 91% - AuditLogger + SubscriptionManager + FeatureGate + Settings wiring + fine-grained Settings audit (customReminderRules / identityKeywords / customFieldDefinitions / workspaceOptions / members)

Completed / confirmed
- PERF-3 completed - Cairo font via @fontsource/cairo + Google Fonts CDN
- WIRE-1 completed - evaluateRules after mutations
- WIRE-2 completed - sessionsHistory via arrayUnion only
- WIRE-5 mini-patch 1 completed - fine-grained audit added in Settings save flow for customRules/customFields-related changes
- WIRE-5 mini-patch 1 (details) completed:
  - Added local pure comparison helpers in Settings.jsx only (no new files)
  - saveSettings now snapshots previous relevant values before building next
  - After successful storage.updateWorkspaceSettings(...), emits non-blocking fine-grained audit logs only when changed:
    - section=customRules, action=customReminderRulesUpdated, previousCount/nextCount (+ addedCount/removedCount)
    - section=customRules, action=identityKeywordsUpdated, previousCount/nextCount
    - section=customFields, action=customFieldDefinitionsUpdated, previousCount/nextCount
  - Keeps one fallback generic settings audit only when no fine-grained branch fired
  - Preserved existing save behavior and UI flow (customFieldsDirty reset timing, setDisplaySettings(next), LAWBASE_EVENTS dispatch)
  - No Storage.js contract/schema changes; audit metadata only
- WIRE-5 mini-patch 2 completed - fine-grained audit added for remaining high-value settings-side mutations
- WIRE-5 mini-patch 2 (details) completed:
  - OptionEditor save(...) now logs a lightweight workspaceOptions audit entry after successful saveWorkspaceOptions(...)
  - Added section=workspaceOptions, action=workspaceOptionListUpdated, optionType, previousCount, nextCount, changeType
  - handleMemberRoleChange(...) now logs section=members, action=memberRoleUpdated, memberId, previousRole, nextRole
  - handleMemberActiveToggle(...) now logs section=members, action=memberActiveUpdated, memberId, previousActive, nextActive
  - Audit remains non-blocking via nested try/catch and all writes still go through Storage.js only
  - No UI, permissions, feedback text, or optimistic state behavior changes
- Settings cleanup completed - obsolete admin tab removed from Settings UI
- Settings cleanup (details) completed:
  - Removed the activeTab === 'admin' render path from Settings.jsx
  - SETTINGS_TABS now excludes the obsolete admin tab entry from the visible tabs list
  - Subscription tab and UsageStatsPanel behavior remain unchanged
  - No Storage.js, Firestore, subscriptionManager, or audit flow changes in this cleanup patch
  - AdminSubscriptionPanel remains as temporary unreachable dead code inside Settings.jsx due to file encoding friction; safe functional removal from UI is complete

Open items
- WIRE-5 - cover remaining settings-side actions not yet emitting fine-grained audit where needed
- WIRE-4 - Remove any direct Firestore calls in ActivationRequest / SuperAdmin flows and route them through Storage.js
- WIRE-3 - Ensure CaseTasksTab.jsx uses isInspectionTask from src/utils/caseUtils.js consistently, including loaders
- Build/test follow-up - resolve unrelated pre-existing Vite build error in src/pages/Cases/CaseAttachmentsTab.jsx:179 (not caused by WIRE-5 mini-patch 1 or 2, or the admin-tab cleanup patch)

Known constraints
- Stable Release, not Rescue Mode
- Settings.jsx is large but currently working; only safe mini-patches
- Do not reopen PERF-3, signed URLs, or drawer unless a newly documented issue appears

Files to watch
- F-1: src/pages/Templates.jsx - 131KB
- F-2: src/pages/Settings.jsx - 92KB

END STATUS v2.4
