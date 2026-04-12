import { useEffect, useMemo, useState } from 'react';

const ORIENTATION_OPTIONS = [
  { value: 'landscape', label: 'بالعرض' },
  { value: 'portrait', label: 'بالطول' },
];

const COLOR_OPTIONS = [
  { value: 'brand', label: 'ألوان النظام' },
  { value: 'mono', label: 'أبيض وأسود' },
  { value: 'soft', label: 'ألوان هادئة' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'مريح' },
  { value: 'compact', label: 'مضغوط' },
];

function normalizeColumns(columns, allColumns) {
  const allowed = new Set(allColumns.map((c) => c.key));
  const list = Array.isArray(columns) ? columns : [];
  return list.filter((key) => allowed.has(key));
}

export default function SessionsPrintSettingsModal({
  open,
  allColumns,
  settings,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const selectedCount = useMemo(() => (draft?.columns || []).length, [draft?.columns]);

  if (!open) return null;

  const toggleColumn = (colKey) => {
    setDraft((prev) => {
      const current = normalizeColumns(prev.columns, allColumns);
      if (current.includes(colKey)) {
        return { ...prev, columns: current.filter((key) => key !== colKey) };
      }
      return { ...prev, columns: [...current, colKey] };
    });
  };

  const applySave = () => {
    const normalized = {
      ...draft,
      columns: normalizeColumns(draft.columns, allColumns),
      title: String(draft.title || '').trim() || 'رول الجلسات',
    };
    onSave(normalized);
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: 'min(980px, 96vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 19 }}>⚙ إعدادات طباعة الجلسات</h3>
          <button className="btn-secondary" onClick={onClose}>إغلاق</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              عنوان الرول
            </label>
            <input
              className="form-input"
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: رول جلسات الأسبوع"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              اتجاه الورقة
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ORIENTATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={draft.orientation === option.value ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDraft((prev) => ({ ...prev, orientation: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              ألوان الطباعة
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={draft.colorMode === option.value ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDraft((prev) => ({ ...prev, colorMode: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              كثافة الصفوف
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={draft.density === option.value ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDraft((prev) => ({ ...prev, density: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            background: 'var(--bg-page)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginBottom: 12,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!draft.includeMeta}
              onChange={(e) => setDraft((prev) => ({ ...prev, includeMeta: e.target.checked }))}
            />
            إظهار بيانات الطباعة (الإجمالي/التاريخ)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!draft.showOnlyFiltered}
              onChange={(e) => setDraft((prev) => ({ ...prev, showOnlyFiltered: e.target.checked }))}
            />
            طباعة النتائج المفلترة فقط
          </label>
        </div>

        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14 }}>الأعمدة في الطباعة ({selectedCount})</strong>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-secondary"
              onClick={() => setDraft((prev) => ({ ...prev, columns: allColumns.map((c) => c.key) }))}
            >
              تحديد الكل
            </button>
            <button
              className="btn-secondary"
              onClick={() => setDraft((prev) => ({ ...prev, columns: [] }))}
            >
              مسح الكل
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 8,
          }}
        >
          {allColumns.map((col) => (
            <label
              key={col.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 13,
                padding: '4px 6px',
                borderRadius: 6,
                background: (draft.columns || []).includes(col.key) ? 'var(--primary-light)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={(draft.columns || []).includes(col.key)}
                onChange={() => toggleColumn(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            يمكن اختيار أعمدة للطباعة حتى لو غير ظاهرة في الرول الحالي.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" onClick={applySave}>حفظ الإعدادات</button>
          </div>
        </div>
      </div>
    </div>
  );
}
