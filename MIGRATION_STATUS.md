=== MIGRATION_STATUS v5.0 — LawBase Production Ready ===
تاريخ التحديث: 2026-04-09

── Phase 9 ✅ Local File Attachments ───────────────────────
  - LocalFileIndex.js: file input + IndexedDB blob storage
  - CaseAttachmentsTab: رفع محلي + preview صور inline
  - handleAddLocalFile: pickFile → saveFile → Firestore record
  - handleDeleteAttachment: cleans IndexedDB on delete
  - coverImage: يدعم الملفات المحلية + URL

── Phases 1-8 ✅ (see v4.0) ────────────────────────────────

── KNOWN REMAINING ⚠️ ─────────────────────────────────────
⚠️ رفع محلي في الأحكام لم يُضف بعد
⚠️ رفع محلي في الأرشيف لم يُضف بعد
⚠️ Firebase Storage upload للـ Pro (infrastructure جاهز)
⚠️ sessionType مفقود من historyEntry
⚠️ Mobile UI تفصيلي
⚠️ Custom Fields (P-E)
⚠️ Vitest unit tests

=== END STATUS v5.0 ===
