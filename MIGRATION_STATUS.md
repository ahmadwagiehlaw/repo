MIGRATION STATUS v2.2 — LawBase Stable Release
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
الهدف: توحيد حقلي coverImage و criticalHighlightUrl عبر كل الواجهات

CaseHeader.jsx
- unified fields: coverImage + criticalHighlightUrl (بدل fileCoverImageUrl)
- getFeaturedImageUrl: يقبل http + blob + data: URLs
- onPickCover + onPickCritical props — تفتح picker modal
- isImageUrl helper: يمنع عرض PDF كـ img مكسور
- 📄 للملفات غير الصور، 📁 للغلاف الفارغ، 📜 للملف المهم الفارغ

CaseDetails.jsx
- picker modal: اختيار الغلاف أو الملف المهم من المرفقات
- toBase64 helper: تحويل الملفات المحلية لـ base64 قبل الحفظ
- blob viewer: فتح base64 PDFs عبر Blob + URL.createObjectURL
- handleSetCover + handleSetCritical: يستدعيان refreshCaseData بعد الحفظ
- handleSetCover يقبل null لإزالة الغلاف
- storage import مضاف صح (لا dynamic import)

useCaseDetails.js
- refreshCaseData: يقرأ من Firestore مباشرة عبر db
  بدون setLoading لتجنب flash الصفحة
  { ...updated } spread لإجبار React على re-render

CaseSidePanel.jsx
- زر ⚡ فتح الملف المهم في قسم الهوية (يظهر فقط عند وجود criticalHighlightUrl)
- زر ⚡ يفتح data: URLs عبر Blob بدل href مباشر
- cover selector: يدعم الصور المحلية + URL + إزالة الغلاف

CaseAttachmentsTab.jsx
- paste من الكليبورد Ctrl+V → يحفظ كمرفق محلي فوراً
- زر 🖼 غلاف لكل مرفق في list view
- local attachment cover: رسالة واضحة بدل silent fail
- grid/list view modes
- onSetCover prop (اختياري — لا crash بدونه)

CasesList.jsx
- حذف cover image block من الكارت (أنظف وأسرع)
- زر ⚡ للملف المهم في identity row (أقصى اليسار)
- زر ⚡ يفتح data: URLs عبر Blob بدل href

═══════════════════════════════════════════════
Attachments UX ✅ 2026-04-16
═══════════════════════════════════════════════
CaseAttachmentsTab.jsx
- AttachmentThumbnail: thumbnail حقيقي للصور (محلية + URL)
- AttachmentThumbnail: double-click على الاسم → inline rename
- list view: زر ✏️ → inline rename
- ⚠️ rename يستخدم onSaveAttachment حالياً → ينشئ record جديد
  مطلوب: onUpdateAttachment في باتش قادم

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
- rename attachment: onUpdateAttachment مطلوبة (حالياً ينشئ record جديد)
- PDF كبير كـ base64 في Firestore — الحل الدائم Firebase Storage
- P9: Templates.jsx monolith — تجزئة مؤجلة
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

END STATUS v2.2