const NEW_OPTION_INPUT_ID = 'newOptionInput';

export default function SessionsOptionsManagerModal({
  optionsManager,
  fieldOptions,
  fieldDefaults,
  onClose,
  onSaveFieldOptions,
  onSaveFieldDefault,
}) {
  if (!optionsManager) return null;

  const currentOptions = fieldOptions[optionsManager.field] || [];

  const submitNewOption = (value) => {
    const nextValue = value.trim();
    if (!nextValue || currentOptions.includes(nextValue)) return;
    onSaveFieldOptions(optionsManager.field, [...currentOptions, nextValue]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width: 400,
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-md)',
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            إدارة خيارات {optionsManager.field === 'decision' ? 'القرار' : 'نوع الجلسة'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            id={NEW_OPTION_INPUT_ID}
            className="form-input"
            placeholder="أضف خيارًا جديدًا..."
            style={{ flex: 1, fontSize: 13 }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              submitNewOption(e.target.value);
              e.target.value = '';
            }}
          />
          <button
            className="btn-primary"
            style={{ padding: '8px 12px', fontSize: 13 }}
            onClick={() => {
              const input = document.getElementById(NEW_OPTION_INPUT_ID);
              const value = input?.value?.trim();
              if (!value) return;
              submitNewOption(value);
              if (input) input.value = '';
            }}
          >
            + إضافة
          </button>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          {currentOptions.map((opt, i) => {
            const isDefault = fieldDefaults[optionsManager.field] === opt;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: isDefault ? 'var(--primary-light)' : 'var(--bg-page)',
                  borderRadius: 'var(--radius-sm)',
                  border: isDefault ? '1px solid var(--primary)' : '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => onSaveFieldDefault(optionsManager.field, isDefault ? '' : opt)}
                  title={isDefault ? 'إلغاء الافتراضي' : 'تعيين كافتراضي'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '2px',
                    color: isDefault ? '#d97706' : '#cbd5e1',
                  }}
                >
                  ⭑
                </button>

                <span style={{ flex: 1, fontSize: 14, fontWeight: isDefault ? 600 : 400 }}>
                  {opt}
                  {isDefault && (
                    <span style={{ fontSize: 11, color: 'var(--primary)', marginRight: 6 }}>
                      (افتراضي)
                    </span>
                  )}
                </span>

                <button
                  onClick={() => {
                    onSaveFieldOptions(
                      optionsManager.field,
                      currentOptions.filter((option) => option !== opt),
                    );
                    if (fieldDefaults[optionsManager.field] === opt) {
                      onSaveFieldDefault(optionsManager.field, '');
                    }
                  }}
                  style={{
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontSize: 12,
                  }}
                >
                  حذف
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
