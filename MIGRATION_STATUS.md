=== MIGRATION_STATUS v1.0 — LawBase Field Reorganization ===
تاريخ التحديث: 2026-04-06

تحديث 2026-04-07:
Patch: Implemented Identity Intelligence & Dynamic Reminders
✅ RulesEngine.js
   - إضافة LB-AUTO-IDENTITY-CLASSIFIER لتصنيف الصفة آلياً من identityKeywords
   - إضافة LB-SCHEDULED-SESSION-REMINDERS لمهام تذكير الجلسات قبل 14/7/1 يوم
   - إضافة LB-DYNAMIC-CUSTOM-REMINDERS للتذكيرات المخصصة من إعدادات workspace
✅ CaseSidePanel.jsx
   - إضافة زر تبديل تنبيهات الجلسات بجوار رقم الدعوى
   - حفظ notificationsEnabled عبر storage.updateCase ثم محاولة evaluateRules
✅ Settings.jsx
   - Phase J Extension: Automation UI & Custom Trigger Engine enabled.
   - إضافة محرك الأتمتة والذكاء الإجرائي في تبويب الخيارات
   - إدارة identityKeywords و customReminderRules داخل إعدادات workspace
   - توضيح طريقة فصل كلمات دلالة الصفة وإضافة حقول مستهدفة مخصصة للتذكيرات
   - توسيع الحقل المستهدف إلى قائمة اختيارات جاهزة تشمل حقول القضية والجلسات والحكم والحقول المخصصة
✅ Storage.js / ALLOWED_CASE_FIELDS
   - notificationsEnabled مضاف للسماح بحفظ حالة التنبيهات
   - إضافة applyRuleEvaluation و syncCaseTasks لتطبيق نتائج evaluateRules
✅ RulesOrchestrator.js
   - تمرير إعدادات workspace إلى RulesEngine حتى تعمل identityKeywords
✅ TaskEngine.js
   - تمرير taskType من قواعد الأتمتة إلى المهام النهائية
✅ AppHeader.jsx / CaseSidePanel.jsx
   - إضافة حذف منفرد للتنبيهات الظاهرة وغفوة 3 ساعات/يوم
   - إضافة زر علوي لحذف كل التنبيهات الظاهرة
   - حفظ حالة تنبيهات لوحة القضية ضمن case payload وحالة تنبيهات الهيدر في localStorage لكل workspace
✅ Settings.jsx / DataExporter.jsx
   - إضافة تصدير Excel من تبويب الاستيراد والتصدير
   - التصدير يستخدم نفس SYSTEM_FIELDS وعناوين الأعمدة الخاصة بـ SmartImporter
✅ Storage.js / SmartImporter.jsx
   - تصدير SYSTEM_FIELDS للاستخدام المشترك بين الاستيراد والتصدير
   - إضافة حقول الاستيراد المساندة إلى allowlist التخزين حتى لا تُحذف عند إعادة الاستيراد
✅ Data Exchange UI
   - توحيد المستوى الجمالي بين كارت التصدير ومكوّن الاستيراد
   - تمييز بصري واضح: التصدير كنسخة خروج آمنة والاستيراد كإدخال ومزامنة
   - تثبيت عرض الاستيراد والتصدير داخل حاوية موحدة وتقليل المؤثرات البصرية
   - إضافة رسالة نتيجة نهائية للاستيراد: نجاح / نجاح جزئي / فشل مع ملخص الأرقام
✅ RulesEngine.js / Storage.js Review
   - تثبيت IDs للمهام الآلية باستخدام makeStableId لمنع إعادة إنشاء مهام لنفس القاعدة والقضية عند تكرار التقييم
   - إضافة اختبارات تؤكد ثبات task id للتذكيرات المخصصة وتوقف توليدها عند حذف الكلمات الدلالية

── COMPLETED ✅ ────────────────────────────────────────────
✅ caseCanonical.js
   - readLegacyCaseField (fallback engine)
   - getCaseTitle           subject → title
   - getCaseSessionResult   courtDecision → sessionResult
   - getCaseRoleCapacity    role → roleCapacity
   - getCaseFileLocation    location → fileLocation
   - getCaseProcedureTrack  caseType → procedureTrack
   - getDerivedCaseRollNumber  ← من sessionsHistory
   - getDerivedCaseSessionType ← من sessionsHistory
   - getSessionSnapshot     ← قراءة snapshot من أي entry

✅ Storage.js / ALLOWED_CASE_FIELDS
   - caseProcedures / coverImage / criticalHighlightUrl → مضافة
   - plaintiffAddress / degreeOfLitigation             → محذوفة
   - caseFamily / caseType / sessionType / rollNumber  → محذوفة
   - fieldDensity                                      → مضاف
   - createSession يقبل caseData للـ snapshot

✅ [P-A] LITIGATION_STAGE_OPTIONS → Constants.js
   القيم: متداول / موقوف جزائياً / موقوف تعليقياً
          محجوز للحكم / خبراء

✅ [P-B] Field Density Toggle
   - FIELD_DENSITY + BASIC_MODE_HIDDEN_FIELDS → Constants.js
   - useFieldDensity.js → hook + localStorage
   - AppHeader.jsx → زر ⚙️ احترافي / 🧾 أساسي
   - CaseForm.jsx → hiddenFieldStyle conditional
   - Settings.jsx → موحّد مع Constants.js

✅ [P-C] Workspace Defaults
   - WORKSPACE_CASE_DEFAULTS_KEYS → Constants.js
   - Settings.jsx → card "⚖️ بيانات المحكمة الافتراضية"
   - CaseForm.jsx → auto-fill جديد فقط / non-destructive
   - procedureTrack يختفي لو workspace محدد اختصاص واحد

✅ [P-D] Session Snapshot
   - SessionRollover.execute() يقبل caseData اختياري
   - يجلب caseData تلقائياً لو مش موجود
   - snapshot مدموج في historyEntry
   - sessionsHistory تُضاف (append) مش تُحل محل
   - snapshot غائب بدون caseData بدون null

── DEBT صغير — للـ cleanup ─────────────────────────────────
⚠️ sessionType مش موجود في historyEntry
   → الخط الزمني مش هيعرف نوع الجلسة
   → يُضاف في cleanup قريب

── PENDING ─────────────────────────────────────────────────
[P-E] Custom Fields
      - customFieldDefinitions في workspace settings (max 15)
      - أنواع: string / date / number / boolean / dropdown
      - customFields: {} في case document
      - يظهر في تفاصيل القضية + النماذج
      - مش في الكارت

=== END STATUS v1.0 ===
