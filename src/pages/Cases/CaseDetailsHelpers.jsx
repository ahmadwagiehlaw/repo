import { useSensitiveMode } from '@/hooks/useSensitiveMode.js';

export function InfoCard({ icon, label, value, blurred = false }) {
  return (
    <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          filter: blurred ? 'blur(4px)' : 'none',
          userSelect: blurred ? 'none' : 'text',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export function BlockTypeTag({ type, onSelect, isActive }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      style={{
        padding: '4px 12px',
        borderRadius: '6px',
        border: isActive ? `2px solid ${type.color}` : `1px solid var(--border)`,
        background: isActive ? type.bg : 'transparent',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'Cairo',
        color: isActive ? type.color : 'var(--text-secondary)',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.2s',
      }}
    >
      {type.icon} {type.label}
    </button>
  );
}

export function isInspectionTask(task) {
  const title = String(task?.title || '');
  return title.startsWith('طلب اطلاع:') || task?.source === 'inspection';
}

export const DEFAULT_BLOCK_TYPES = [
  { id: 'facts', label: 'الوقائع', icon: '📖', color: '#3b82f6', bg: '#dbeafe' },
  { id: 'grounds', label: 'أسباب الطعن', icon: '⚠', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'response', label: 'الرد', icon: '💬', color: '#10b981', bg: '#d1fae5' },
  { id: 'defense', label: 'الدفاع', icon: '🛡️', color: '#8b5cf6', bg: '#f3e8ff' },
  { id: 'position', label: 'الموقف', icon: '👁️', color: '#ef4444', bg: '#fee2e2' },
  { id: 'notes', label: 'ملاحظات', icon: '📝', color: '#6b7280', bg: '#f3f4f6' },
  { id: 'custom', label: 'مخصص', icon: '★', color: '#ec4899', bg: '#fce7f3' },
];

export const CASE_TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: '📋' },
  { id: 'sessions', label: 'الجلسات', icon: '📅' },
  { id: 'judgments', label: 'الأحكام', icon: '⚖️' },
  { id: 'procedures', label: 'إجراءات الدعوى', icon: '🗂️' },
  { id: 'tasks', label: 'المهام', icon: '✓' },
  { id: 'legal', label: 'التحليل القانوني', icon: '📝' },
  { id: 'documents', label: 'المستندات', icon: '📄' },
  { id: 'attachments', label: 'أوراق الدعوى', icon: '📎' },
  { id: 'edit', label: 'تعديل', icon: '✏️' },
];

export const STATUS_LABELS = {
  new: 'جديدة',
  active: 'نشطة',
  under_review: 'قيد المراجعة',
  reserved_for_judgment: 'محجوزة للحكم',
  judged: 'محكوم فيها',
  appeal_window_open: 'نافذة الطعن',
  suspended: 'موقوفة',
  struck_out: 'مشطوبة',
  archived: 'مؤرشفة',
};
