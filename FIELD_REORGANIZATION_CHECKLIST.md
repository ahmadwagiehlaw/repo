# Field Reorganization Checklist

> الهدف: ملف قرارات عملي لإعادة تنظيم الحقول قبل/أثناء الترحيل.
> 
> اكتب القيم اللي انت عايزها فقط. اللي تسيبه فاضي يشتغل بالقيم الافتراضية تحت.

## 1) القيم الافتراضية (لو سيبتها فاضية)

- الحقل: يبقى **محتفظ به** (لا يتم حذفه).
- الصلاحية: يبقى **قراءة وكتابة** (مش Read-Only).
- التعديل التلقائي: **غير مسموح** (No Auto-Update).
- المطلوبية: **اختياري** (Not Required).
- الترحيل: **غير مطلوب** (No Migration).
- حالة الترحيل: **Not Started**.

---

## 2) قواعد عامة (Global)

- [ ] اعتماد نمط Canonical Fields فقط (منع إنشاء مفاتيح Legacy جديدة).
- [ ] تفعيل وضع Read-Only على الحقول Legacy بعد الترحيل.
- [ ] السماح Auto-Update للحقول المحسوبة فقط.
- [ ] منع الحذف النهائي قبل نجاح Dry Run.
- [ ] تشغيل Validation قبل أي Batch Migration.
- [ ] تفعيل Rollback Plan إلزامي قبل التنفيذ.

ملاحظات عامة:

- 

---

## 3) قرارات كل حقل (Per Field Decisions)

> انسخ البلوك ده لكل حقل جديد. 
> لو مش هتحدد حاجة، سيبه فاضي وسيتم تطبيق القيم الافتراضية.

### Field Block (Template)

- Entity:
- Field Name:
- Canonical Name (لو فيه إعادة تسمية):
- Type:

قرارات:

- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

لو الترحيل مطلوب:

- [ ] Rename
- [ ] Map Value
- [ ] Merge
- [ ] Split
- [ ] Backfill
- [ ] Drop Legacy

حالة الترحيل:

- [ ] Not Started
- [ ] Planned
- [ ] Dry Run
- [ ] In Progress
- [ ] Completed
- [ ] Failed
- [ ] Rolled Back

قواعد/شروط الحقل:

- 

ملاحظات تنفيذ:

- 

---

## 4) Starter Fields (مبدئي - عدل براحتك)

> دي أمثلة من الحقول اللي غالبا تحتاج قرار Canonicalization. امسح/زود كما تريد.

### Case

- Entity: Case
- Field Name: title
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Case
- Field Name: subject
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Case
- Field Name: litigationStage
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Case
- Field Name: litigationPhase
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Case
- Field Name: sessionResult
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Case
- Field Name: courtDecision
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

### Attachment

- Entity: Attachment
- Field Name: fileLocation
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Attachment
- Field Name: location
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

### Party

- Entity: Party
- Field Name: roleCapacity
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

- Entity: Party
- Field Name: role
- Canonical Name:
- [ ] حذف الحقل
- [ ] قراءة فقط (Read-Only)
- [ ] تعديل تلقائي (Auto-Update)
- [ ] مطلوب (Required)
- [ ] مطلوب ترحيل (Needs Migration)

---

## 5) Execution Gate (قبل التنفيذ)

- [ ] تم تحديد كل الحقول الحساسة (PII/Confidential).
- [ ] تم تحديد الحقول Read-Only بوضوح.
- [ ] تم تحديد الحقول التي يسمح لها Auto-Update فقط.
- [ ] تم اعتماد حالات الترحيل لكل حقل يحتاج Migration.
- [ ] تم تعريف قواعد Validation المطلوبة.
- [ ] تم اختبار Dry Run على عينة بيانات.
- [ ] تم تجهيز Rollback Plan.
- [ ] موافقة نهائية على التنفيذ.

---

## 6) Sign-off

- Owner:
- Reviewer:
- Date:
- Scope/Release:
