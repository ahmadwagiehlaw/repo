import { useState } from 'react';
import * as XLSX from 'xlsx';
import storage from '@/data/Storage.js';
import { SYSTEM_FIELDS } from '@/components/import/SmartImporter.jsx';

const EXPORT_LIMIT = 20000;

function normalizeCaseNumberPart(caseNumber) {
  const raw = String(caseNumber || '').trim();
  if (!raw) return '';
  return raw.split('/')[0].trim();
}

function inferCaseYear(caseData) {
  const explicitYear = String(caseData?.caseYear || '').trim();
  if (explicitYear) return explicitYear;
  const match = String(caseData?.caseNumber || '').match(/\/\s*(\d{4})/);
  return match ? match[1] : '';
}

function formatExportValue(caseData, fieldKey) {
  if (fieldKey === 'caseNumber') return normalizeCaseNumberPart(caseData?.caseNumber);
  if (fieldKey === 'caseYear') return inferCaseYear(caseData);

  const value = caseData?.[fieldKey];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).join(' | ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}

function makeExportFileName(workspaceName) {
  const safeName = String(workspaceName || 'LawBase')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-');
  const date = new Date().toISOString().slice(0, 10);
  return `${safeName}-cases-import-format-${date}.xlsx`;
}

function buildCaseExportRows(cases) {
  const headers = SYSTEM_FIELDS.map((field) => field.label);
  const rows = (Array.isArray(cases) ? cases : []).map((caseData) => (
    SYSTEM_FIELDS.map((field) => formatExportValue(caseData, field.key))
  ));
  return [headers, ...rows];
}

function writeCasesWorkbook(cases, workspaceName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(buildCaseExportRows(cases));

  worksheet['!cols'] = SYSTEM_FIELDS.map((field) => ({
    wch: field.required ? 18 : Math.min(32, Math.max(14, String(field.label || '').length + 8)),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'القضايا');
  XLSX.writeFile(workbook, makeExportFileName(workspaceName), { bookType: 'xlsx' });
}

export default function DataExporter({ workspaceId, workspaceName }) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    const targetWorkspaceId = String(workspaceId || '').trim();
    if (!targetWorkspaceId || exporting) return;

    setExporting(true);
    setMessage('');

    try {
      const cases = await storage.listCases(targetWorkspaceId, { limit: EXPORT_LIMIT });
      const safeCases = Array.isArray(cases) ? cases : [];

      writeCasesWorkbook(safeCases, workspaceName);
      setMessage(`تم تصدير ${safeCases.length} قضية في ملف Excel بنفس عناوين ملف الاستيراد.`);
    } catch (error) {
      console.error('[DataExporter.handleExport]', error);
      setMessage('تعذر تصدير البيانات. تأكد من الاتصال والصلاحيات ثم حاول مرة أخرى.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        width: '100%',
        maxWidth: 920,
        boxSizing: 'border-box',
        marginBottom: 16,
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'white',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-light)',
          background: '#fff7ed',
        }}
      >
        <div style={{ flex: '1 1 420px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>📤 تصدير البيانات إلى Excel</h3>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#9a3412', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: 999, padding: '2px 9px' }}>
              نسخة خروج آمنة
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8 }}>
            يصدّر القضايا بنفس عناوين الأعمدة التي يعتمد عليها الاستيراد، مثل: رقم الدعوى، السنة، المدعي، المحكمة، الجلسات، والحكم.
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
            مناسب للنسخ الاحتياطي أو لتعديل البيانات في Excel ثم إعادة استيرادها عبر نفس أداة الاستيراد.
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={exporting || !workspaceId}
          style={{
            minWidth: 170,
            background: 'var(--primary)',
          }}
        >
          {exporting ? 'جاري التصدير...' : 'تصدير ملف Excel'}
        </button>
      </div>

      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 800 }}>
        <span style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>صيغة XLSX</span>
        <span style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>متوافق مع المستورد</span>
        <span style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>القضايا الحالية</span>
      </div>

      {message && (
        <div style={{
          margin: '0 20px 16px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: message.startsWith('تم') ? '#f0fdf4' : '#fff5f5',
          color: message.startsWith('تم') ? '#166534' : '#b91c1c',
          border: `1px solid ${message.startsWith('تم') ? '#bbf7d0' : '#fecaca'}`,
          fontSize: 12,
          fontWeight: 700,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
