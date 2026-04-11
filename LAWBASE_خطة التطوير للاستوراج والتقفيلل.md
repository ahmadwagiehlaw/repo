🟡 In Progress


#Bootstrap plan
Phase 0 — Bootstrap (مرة واحدة)
  └── Batch 0.1: إنشاء LAWBASE_BATCH_TRACKER.md

Phase 1 — SSOT & Architectural Integrity
  ├── Batch 1.1: نقل lastAccess من WorkspaceContext → Storage.js
  ├── Batch 1.2: إضافة triggerRules guard في applyRuleEvaluation
  └── Batch 1.3: تأكيد ALLOWED_CASE_FIELDS شاملة

Phase 2 — PWA Completion (P11)
  ├── Batch 2.1: manifest.json + icons structure
  ├── Batch 2.2: Service Worker (sw.js)
  ├── Batch 2.3: تسجيل SW في main.jsx
  ├── Batch 2.4: useInstallPrompt hook
  ├── Batch 2.5: SplashScreen component
  └── Batch 2.6: Install button في AppHeader/Settings

Phase 3 — Giant Components Split
  ├── Batch 3.1: تجزئة Sessions.jsx
  ├── Batch 3.2: تجزئة Judgments.jsx
  └── Batch 3.3: تجزئة CaseDetails.jsx

Phase 4 — P4/P6 Debt Fix
  ├── Batch 4.1: Tasks — أيقونة ⚙️ للمهام الآلية
  └── Batch 4.2: Print CSS كامل RTL

Phase 5 — P12 Firebase Storage
  ├── Batch 5.1: AttachmentService.js (offline-first)
  ├── Batch 5.2: LocalFileIndex.js
  ├── Batch 5.3: دمج Firebase Storage في Storage.js
  └── Batch 5.4: Security Rules

Phase 6 — P13 Subscription + Audit
  ├── Batch 6.1: SubscriptionManager.js
  ├── Batch 6.2: FeatureGate component
  ├── Batch 6.3: AuditLogger.js
  └── Batch 6.4: AuditLogViewer في Settings

Phase 7 — Performance + Launch
  ├── Batch 7.1: React.lazy + Suspense في App.jsx
  ├── Batch 7.2: ErrorBoundary
  └── Batch 7.3: vite.config.js optimization


