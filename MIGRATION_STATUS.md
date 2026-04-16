MIGRATION STATUS v2.3 — LawBase Stable Release
2026-04-16

═══════════════════════════════════════════════
Sessions UI patches (من v2.1)
═══════════════════════════════════════════════
- patch1: previousSession removed from DEFAULT_VISIBLE + onBlur array
- patch2: sessionType + rollNumber saves wired in saveAllEdits
- patch3: sessionsHistory loop removed — Live view one row per case
- patch4: all cases appear in Live view + استعلام filter added
- patch5: arrayUnion guard removed + auto-promote nextSessionDate
- patch6: rollNumber + sessionType added to ALLOWED_CASE_FIELDS

P14 — Roll Number Sync Fix ✅ 2026-04-15
- caseCanonical.js: getDerivedCaseRollNumber fallback chain
- SmartImporter.jsx: key unified to rollNumber

═══════════════════════════════════════════════
Cover Image & Critical Highlight System ✅ 2026-04-16
═══════════════════════════════════════════════
CaseHeader / CaseDetails / useCaseDetails / CaseSidePanel
CaseAttachmentsTab / CasesList
- coverImage + criticalHighlightUrl unified across all components
- getFeaturedImageUrl: يقبل http + blob + data: URLs
- isImageUrl helper: يمنع عرض PDF كـ img مكسور
- paste Ctrl+V → local attachment فوراً
- grid/list view modes في CaseAttachmentsTab
- blob viewer لـ base64 PDFs عبر URL.createObjectURL
- refreshCaseData بدون setLoading لتجنب flash

═══════════════════════════════════════════════
Attachments UX ✅ 2026-04-16
═══════════════════════════════════════════════
CaseAttachmentsTab.jsx
- AttachmentThumbnail: thumbnail حقيقي للصور
- double-click على الاسم → inline rename
- ⚠️ rename ينشئ record جديد حالياً — onUpdateAttachment مطلوبة

═══════════════════════════════════════════════
Settings — Full Overhaul ✅ 2026-04-16
═══════════════════════════════════════════════

Tab Navigation Restructure
- SETTINGS_TABS: 11 تبويب مع group: 1/2/3
- Navigation: 3 صفوف بتسميات المجموعات + pill buttons
- التبويبات:
  صف 1 — مساحة العمل: ⚙️ عام | ⚖️ القضايا | 📐 التنسيق
  صف 2 — الأتمتة والمظهر: 🤖 الأتمتة | 📋 الخيارات | 🎨 المظهر | ☁️ المزامنة
  صف 3 — الإدارة: 📥 البيانات | 👥 الأعضاء | ⭐ اشتراكي | 🔍 التدقيق

Content Migration
- ⚙️ عام: كارت بيانات الحساب + نوع مساحة العمل + منطقة خطرة
- ⚖️ القضايا: محكمة افتراضية + مواعيد الطعن + حقول مخصصة
- 📐 التنسيق: تنسيق تاريخ + رقم دعوى + أرقام عربية + urgentDays
- 🤖 الأتمتة: toggles + identityKeywords + customReminderRules
- 📋 الخيارات: قوائم الاختيار فقط

Sync Tab ☁️
- Pro: بطاقة خضراء + syncMode + syncMaxFileSizeMB + 3 toggles + progress bar
- Free: بطاقة رمادية + قائمة مزايا + زر ترقية
- حقول: syncMode / syncMaxFileSizeMB / syncCompressImages
         syncAutoRetry / syncOnMobile

General Tab Cleanup
- كارت "👤 بيانات الحساب": ownerDisplayName + ownerPhone
  + email read-only + brand customization
- كارت "🏢 نوع مساحة العمل": منفصل وبسيط
- workspaceName input حُذف — الاسم من currentWorkspace.name
- import useAuth أُضيف

Color Picker — Appearance Tab
- 8 ألوان: برتقالي + أزرق + بنفسجي + أخضر + أحمر + سماوي
           + بينك (#ec4899) + داكن
- اللون المحدد: يكبر 44px + glow animation
- نص اسم اللون أسفل الـ picker

═══════════════════════════════════════════════
UI Polish ✅ 2026-04-16
═══════════════════════════════════════════════

index.css
- --font-scale + --font-xs/sm/md/lg في :root
- @keyframes pulse (محدّث) + spin (جديد)
- .text-xs/.text-sm/.text-md/.text-lg utilities
- .sync-spinning + .sync-pulsing utilities
- Scrollbar: 6px نظيف عبر ::-webkit-scrollbar

AppHeader — SyncStatusIndicator
- import cloudSyncService + subscriptionManager
- syncState: idle | uploading | error | offline
- useEffect: onProgress listener + online/offline events
- أيقونة تظهر للـ Pro فقط قبل 🔔
  idle: ☁️ | uploading: ⏳ نقطة زرقاء | error: ⚠️ نقطة حمراء | offline: 📴

Field Density Button — Removed
- زر "احترافي/أساسي" حُذف من AppHeader
- السبب: feature نصف مبنية — لا تأثير مرئي في CasesList
- محفوظ للمستقبل: useFieldDensity.js + FIELD_DENSITY
  + BASIC_MODE_HIDDEN_FIELDS في Constants.js

═══════════════════════════════════════════════
Bug Fix — SessionsLog Case Number ✅ 2026-04-16
═══════════════════════════════════════════════
SessionsLogTable.jsx
- المشكلة: رقم الدعوى يظهر مكرراً (68694/71/71)
  السبب: entry.caseNumber مخزن مدمجاً (68694/71)
  + entry.caseYear منفصل (71) → يُضاف مرة ثانية
- الحل: استبدال البناء اليدوي بـ formatCaseNumber()
  من src/utils/caseUtils.js مع useDisplaySettings hook
- span بـ direction:ltr يمنع عكس RTL
SessionsLog.jsx (print function)
- guard يمنع إضافة caseYear لو caseNumber يحتويه أصلاً

═══════════════════════════════════════════════
Patches Status
═══════════════════════════════════════════════
P0  = 100% — Firebase compat + Contexts
P1  = 100% — Attachments + LocalFileIndex + CloudSync
P2  = 100% — Case Flags + Badges
P3  = 100% — Judgments + Agenda + Deadline Calc
P4  = 100% — Tasks UI + tooltip + manual icon
P5  = 100% — Workspace Switcher
P6  = 100% — Sessions print.css + workspace-name header
P7  = 100% — Archive
P8  = 100% — Session Rollover
P9  = 90%  — Templates Monolith (يعمل، تجزئة مؤجلة)
P10 = 100% — AI Panel + AssistantService + ContextBuilder
P11 = 100% — manifest + sw.js + CameraUpload + InstallPrompt
P12 = 100% — Firebase Storage upload/delete + signed URLs
P13 = 100% — AuditLogger + SubscriptionManager + FeatureGate

═══════════════════════════════════════════════
Known open items
═══════════════════════════════════════════════
- rename attachment: onUpdateAttachment مطلوبة (ينشئ record جديد حالياً)
- PDF كبير كـ base64 في Firestore — الحل: Firebase Storage
- P9: Templates.jsx monolith — تجزئة مؤجلة
- Dark Mode — مؤجل (inline styles تحتاج تحويل لـ CSS vars أولاً)
- Field Density: CasesList.jsx غير مربوط — جاهز للإكمال مستقبلاً
- CloudSyncService: existsInCloud() موجودة غير مربوطة في _uploadOne
- ownerDisplayName/ownerPhone: مُضافان في Settings
  لم يُربطا بـ SuperAdmin بعد
- Electron desktop app — مرحلة قادمة

═══════════════════════════════════════════════
Files to watch
═══════════════════════════════════════════════
F-1:  src/pages/Templates.jsx
F-2:  src/pages/Settings.jsx
F-3:  src/pages/Cases/CaseDetails.jsx (1300+ سطر)
F-4:  src/pages/Cases/useCaseDetails.js
F-5:  src/data/Storage.js
F-6:  src/components/cases/CasesList.jsx
F-7:  src/pages/Cases/CaseHeader.jsx
F-8:  src/components/cases/CaseSidePanel.jsx
F-9:  src/pages/Cases/CaseAttachmentsTab.jsx
F-10: src/pages/Sessions/SessionsList.jsx
F-11: src/pages/Sessions/useSessionsData.js
F-12: src/pages/Sessions/Sessions.jsx
F-13: src/workflows/SessionRollover.js
F-14: src/utils/caseCanonical.js
F-15: src/components/import/SmartImporter.jsx
F-16: src/components/layout/AppHeader.jsx
F-17: src/styles/index.css
F-18: src/pages/SessionsLog/SessionsLogTable.jsx
F-19: src/pages/SessionsLog/SessionsLog.jsx

END STATUS v2.3