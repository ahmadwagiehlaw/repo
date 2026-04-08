import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DateDisplay from '@/components/common/DateDisplay.jsx';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import { confirmDialog } from '@/utils/browserFeedback.js';

function buildCaseDocumentHtml(documentItem) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${documentItem?.title || 'مستند قضية'}</title>
  <style>
    body{font-family:Cairo,Tahoma,sans-serif;direction:rtl;margin:24px;color:#0f172a;line-height:1.9;background:#fff}
    img{max-width:100%;height:auto}
    table{width:100%;border-collapse:collapse}
  </style>
</head>
<body>${documentItem?.htmlContent || ''}</body>
</html>`;
}

export default function CaseDocumentsTab({
  caseData,
  dateDisplayOptions,
}) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = String(currentWorkspace?.id || '').trim();
  const caseId = String(caseData?.id || '').trim();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadDocuments = useCallback(async () => {
    if (!workspaceId || !caseId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      const result = await storage.getCaseDocuments(workspaceId, caseId);
      setDocuments(Array.isArray(result) ? result : []);
    } finally {
      setLoading(false);
    }
  }, [caseId, workspaceId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const linkedCaseLabel = useMemo(() => {
    const caseNumber = [
      String(caseData?.caseNumber || '').trim(),
      String(caseData?.caseYear || '').trim(),
    ].filter(Boolean).join('/');
    const parties = [
      String(caseData?.plaintiffName || '').trim(),
      String(caseData?.defendantName || '').trim(),
    ].filter(Boolean).join(' ضد ');

    return [caseNumber, parties].filter(Boolean).join(' — ') || 'ملف القضية';
  }, [caseData]);

  const availableTypes = useMemo(
    () => [...new Set(documents.map((item) => String(item?.type || 'custom').trim()).filter(Boolean))],
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    return documents.filter((documentItem) => {
      const matchesQuery = !query || String(documentItem?.title || '').toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || String(documentItem?.type || 'custom').trim() === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  const handleOpenInEditor = (documentItem) => {
    navigate('/templates', {
      state: {
        selectedCaseId: caseId,
        caseDocument: {
          ...documentItem,
          caseId,
        },
      },
    });
  };

  const handleCreateNew = () => {
    navigate('/templates', {
      state: {
        selectedCaseId: caseId,
      },
    });
  };

  const handlePrint = (documentItem) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(buildCaseDocumentHtml(documentItem));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleDelete = async (documentItem) => {
    const confirmed = await confirmDialog(`حذف المستند "${documentItem?.title || 'بدون عنوان'}"؟`, {
      title: 'تأكيد حذف المستند',
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!confirmed) return;

    setDeletingId(String(documentItem?.id || ''));
    try {
      await storage.deleteCaseDocument(workspaceId, caseId, documentItem.id);
      setDocuments((prev) => prev.filter((entry) => String(entry?.id || '') !== String(documentItem?.id || '')));
    } finally {
      setDeletingId('');
    }
  };

  if (!caseId) {
    return (
      <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'white', color: 'var(--text-muted)', textAlign: 'center' }}>
        لا يمكن عرض المستندات قبل تحميل بيانات القضية.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '16px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: 'white',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'grid', gap: '6px' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
            📄 مستندات القضية
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {linkedCaseLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
            onClick={loadDocuments}
          >
            تحديث
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
            onClick={handleCreateNew}
          >
            + إنشاء مستند
          </button>
        </div>
      </div>

      {documents.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--bg-page)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="🔍 بحث باسم المستند..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: '250px', fontSize: '13px' }}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>التصنيف:</span>
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ fontSize: '13px', padding: '6px 12px', minWidth: '140px' }}
            >
              <option value="all">جميع المستندات</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '26px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'white', color: 'var(--text-muted)', textAlign: 'center' }}>
          جاري تحميل المستندات...
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            padding: '28px',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🗂️</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            لا توجد مستندات محفوظة داخل ملف القضية
          </div>
          <div style={{ fontSize: '13px' }}>
            يمكنك إنشاء مستند من صفحة النماذج ثم حفظه مباشرة داخل هذه القضية.
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div
          style={{
            padding: '24px',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'white',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          لم يتم العثور على مستندات تطابق بحثك.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {filteredDocuments.map((documentItem) => (
            <article
              key={documentItem.id}
              style={{
                display: 'grid',
                gap: '14px',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'white',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {documentItem.title || 'مستند بدون عنوان'}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {documentItem.type || 'custom'}
                    </span>
                    <span>
                      أنشئ في <DateDisplay value={documentItem.createdAt} options={dateDisplayOptions} />
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    minWidth: '44px',
                    height: '44px',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '12px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '20px',
                  }}
                >
                  📄
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                  lineHeight: 1.8,
                  minHeight: '84px',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: documentItem.htmlContent || '<span>لا يوجد محتوى.</span>' }}
              />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 12px' }}
                  onClick={() => handleOpenInEditor(documentItem)}
                >
                  ✏️ تعديل
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 12px' }}
                  onClick={() => handlePrint(documentItem)}
                >
                  🖨️ طباعة
                </button>
                <button
                  type="button"
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fff5f5',
                    color: '#b91c1c',
                    cursor: deletingId ? 'wait' : 'pointer',
                    fontSize: '12px',
                    fontFamily: 'Cairo',
                    fontWeight: 700,
                  }}
                  disabled={deletingId === documentItem.id}
                  onClick={() => handleDelete(documentItem)}
                >
                  {deletingId === documentItem.id ? 'جارٍ الحذف...' : '🗑️ حذف'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
