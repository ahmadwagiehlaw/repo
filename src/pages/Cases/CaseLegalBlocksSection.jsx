export default function CaseLegalBlocksSection({
  legalBlocks,
  blockTypes,
  savingBlocks,
  showBlockTypesManager,
  setShowBlockTypesManager,
  saveBlocks,
  updateBlockTypes,
  setShowReportModal,
  onAddBlock,
  onUpdateBlockTitle,
  onUpdateBlockType,
  onMoveBlockUp,
  onMoveBlockDown,
  onDeleteBlock,
  onUpdateBlockContent,
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowBlockTypesManager(true)}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '13px' }}
          aria-pressed={showBlockTypesManager ? 'true' : 'false'}
        >
          ⚙️ تخصيص
        </button>
        <button
          onClick={onAddBlock}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '13px' }}
        >
          + إضافة كتلة
        </button>
        <button
          onClick={saveBlocks}
          disabled={savingBlocks}
          className="btn-primary"
          style={{ padding: '8px 12px', fontSize: '13px', marginLeft: 'auto' }}
        >
          {savingBlocks ? 'جاري الحفظ...' : '💾 حفظ'}
        </button>
        <button
          onClick={() => setShowReportModal(true)}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '13px' }}
        >
          📄 إنشاء تقرير
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {legalBlocks.sort((a, b) => a.order - b.order).map((block, idx) => {
          const blockType = blockTypes.find((type) => type.id === block.type) || blockTypes[0];

          return (
            <div
              key={block.id}
              style={{
                borderLeft: `4px solid ${blockType.color}`,
                background: blockType.bg,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) => onUpdateBlockTitle(block.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: blockType.color,
                      fontFamily: 'Cairo',
                      width: '100%',
                    }}
                    dir="rtl"
                  />
                </div>
                <select
                  value={block.type}
                  onChange={(e) => onUpdateBlockType(block.id, e.target.value)}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${blockType.color}`,
                    borderRadius: '4px',
                    background: 'white',
                    fontFamily: 'Cairo',
                    fontSize: '12px',
                    color: blockType.color,
                  }}
                >
                  {blockTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
                {idx > 0 && (
                  <button
                    onClick={() => onMoveBlockUp(block.id, block.order)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px',
                    }}
                  >
                    ▲
                  </button>
                )}
                {idx < legalBlocks.length - 1 && (
                  <button
                    onClick={() => onMoveBlockDown(block.id, block.order)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px',
                    }}
                  >
                    ▼
                  </button>
                )}
                {legalBlocks.length > 1 && (
                  <button
                    onClick={() => onDeleteBlock(block.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px',
                      color: '#ef4444',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={() => {
                  setTimeout(saveBlocks, 200);
                }}
                dangerouslySetInnerHTML={{ __html: block.content }}
                style={{
                  padding: '8px',
                  border: `1px solid ${blockType.color}`,
                  borderRadius: '4px',
                  minHeight: '80px',
                  background: 'white',
                  fontFamily: 'Cairo',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                onInput={(e) => onUpdateBlockContent(block.id, e.currentTarget.innerHTML)}
              />

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {block.content.replace(/<[^>]*>/g, '').length} حروف
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
