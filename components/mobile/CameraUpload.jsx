import { useEffect, useMemo, useState } from 'react';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';

export default function CameraUpload() {
  const { cases } = useCases();
  const { currentWorkspace } = useWorkspace();
  const [showCaseSelect, setShowCaseSelect] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  const workspaceId = currentWorkspace?.id || '';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const caseOptions = useMemo(() => cases || [], [cases]);

  const handleCapture = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCaseId || !workspaceId) return;

    setUploading(true);
    setUploadResult('');

    try {
      const caseData = await storage.getCase(workspaceId, selectedCaseId);

      const attachmentData = {
        fileName: file.name || `photo_${Date.now()}.jpg`,
        mimeType: file.type || 'image/jpeg',
        size: file.size,
        source: 'camera_upload',
        uploadedAt: new Date().toISOString(),
        caseId: selectedCaseId,
        workspaceId,
      };

      const currentAttachments = Array.isArray(caseData?.attachments)
        ? caseData.attachments
        : [];

      await storage.updateCase(workspaceId, selectedCaseId, {
        attachments: [...currentAttachments, attachmentData],
      });

      setUploadResult('تم رفع الصورة بنجاح ✅');
      setShowCaseSelect(false);
      setSelectedCaseId('');
    } catch (error) {
      setUploadResult(`فشل الرفع: ${error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadResult(''), 3000);
      event.target.value = '';
    }
  };

  if (!isMobile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowCaseSelect(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '999px',
          background: '#1e293b',
          color: 'white',
          border: 'none',
          fontSize: '22px',
          cursor: 'pointer',
          zIndex: 320,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        aria-label="فتح الكاميرا لرفع صورة"
      >
        📷
      </button>

      {uploadResult ? (
        <div
          style={{
            position: 'fixed',
            bottom: '150px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontFamily: 'Cairo',
            zIndex: 999,
            fontSize: '14px',
          }}
        >
          {uploadResult}
        </div>
      ) : null}

      {showCaseSelect ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              background: 'white',
              width: '100%',
              borderRadius: '16px 16px 0 0',
              padding: '20px',
              fontFamily: 'Cairo',
              direction: 'rtl',
            }}
          >
            <h3 style={{ margin: '0 0 16px' }}>اختر القضية</h3>

            <select
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'Cairo',
                fontSize: '14px',
                direction: 'rtl',
              }}
            >
              <option value="">اختر قضية...</option>
              {caseOptions.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {caseItem.caseNumber}/{caseItem.caseYear} — {caseItem.clientName || caseItem.plaintiffName || '—'}
                </option>
              ))}
            </select>

            {selectedCaseId ? (
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  background: '#FF8C00',
                  color: 'white',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                {uploading ? 'جاري الرفع...' : '📷 التقط صورة'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleCapture}
                  disabled={uploading}
                />
              </label>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setShowCaseSelect(false);
                setSelectedCaseId('');
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'Cairo',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}