import React from "react";

function formatDate(value) {
  if (!value) return '—';
  return String(value).split('-').reverse().join('/');
}

const TaskCard = React.memo(function TaskCard({
            <span
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: isImportant || isUrgent ? 700 : 600,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {/* Manual-task icon: only show if not auto */}
              {!ruleMeta.isAuto && task.taskType === 'manual' && (
                <span title="مهمة يدوية" style={{ marginLeft: 4, cursor: 'help' }}>
                  📋
                </span>
              )}
              {/* Auto-task icon: unchanged */}
              {ruleMeta.isAuto && (
                <span title={autoSourceTitle} style={{ marginLeft: 4, cursor: 'help' }}>
                  ⚙️
                </span>
              )}
              {task.title}
            </span>
  if (task.taskType === 'administrative') {
    return (
      <div
        key={task.id}
        style={{
          borderRight: '3px solid #0284c7',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>📋 {task.title}</span>
          <span style={{ fontSize: 11, background: '#dbeafe', color: '#2563eb', padding: '1px 8px', borderRadius: 10 }}>
            إجراء إداري
          </span>
        </div>
        {task.assignedTo && (
          <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>
            👤 {task.assignedTo}
          </div>
        )}
        {task.dueDate && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            📅 {formatDate(task.dueDate)}
          </div>
        )}
        {task.caseId && relatedCase && (
          <div
            onClick={() => onOpenCasePanel(task.caseId)}
            style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer', marginTop: 2 }}
          >
            📁 {relatedCase.caseNumber}
          </div>
        )}
      </div>
    );
  }

  const cardStyle = (() => {
    if (isOverdue) return {
      borderRight: '3px solid #dc2626',
      background: '#fff5f5',
    };
    if (isUrgent) return {
      borderRight: '3px solid #ea580c',
      background: '#fffbeb',
    };
    if (isImportant) return {
      borderRight: '3px solid #d97706',
      background: 'white',
    };
    if (task.pinned) return {
      borderRight: '3px solid #7c3aed',
      background: '#faf5ff',
    };
    return { borderRight: '3px solid var(--border)', background: 'white' };
  })();

  return (
    <div
      key={task.id}
      style={{
        ...cardStyle,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: compact ? '8px 10px' : '10px 14px',
        marginBottom: 6,
        opacity: task.status === 'done' ? 0.55 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onToggleDone(task)}
          style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                fontSize: compact ? 13 : 14,
                fontWeight: isImportant || isUrgent ? 700 : 600,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {ruleMeta.isAuto && (
                <span title={autoSourceTitle} style={{ marginLeft: 4, cursor: 'help' }}>
                  ⚙️
                </span>
              )}
              {task.title}
            </span>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              {isOverdue && (
                <span
                  style={{
                    fontSize: 10,
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  متأخرة {Math.abs(daysLeft)} يوم
                </span>
              )}
              {isUrgent && !isOverdue && (
                <span
                  style={{
                    fontSize: 10,
                    background: '#ffedd5',
                    color: '#ea580c',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  ⚠️ {daysLeft} يوم
                </span>
              )}
              {isImportant && !isUrgent && !isOverdue && (
                <span
                  style={{
                    fontSize: 10,
                    background: '#fef3c7',
                    color: '#d97706',
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  ⭐ مهمة
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  padding: '2px 6px',
                }}
                title="تعديل"
              >
                ✏️
              </button>

              <button
                onClick={() => onTogglePin(task)}
                title={task.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 2,
                  color: task.pinned ? '#7c3aed' : '#cbd5e1',
                  transition: 'all 0.15s',
                }}
              >
                📌
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 12 }}>
            {relatedCase && (
              <span
                onClick={() => task.caseId && onOpenCasePanel(task.caseId)}
                style={{ color: 'var(--primary)', cursor: 'pointer' }}
              >
                📁 {relatedCase.caseNumber}
                {relatedCase.flags?.isPlaintiff && ' ⚖️'}
                {relatedCase.flags?.isImportant && ' ⭐'}
              </span>
            )}
            {task.dueDate && (
              <span
                style={{
                  color: isOverdue ? '#dc2626' : isUrgent ? '#ea580c' : 'var(--text-muted)',
                  fontWeight: isOverdue ? 700 : 400,
                }}
              >
                📅 {formatDate(task.dueDate)}
              </span>
            )}
            {ruleMeta.isAuto && (
              <span
                title={autoSourceTitle}
                style={{
                  color: '#7c3aed',
                  background: '#f3e8ff',
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'help',
                }}
              >
                مهمة آلية
              </span>
            )}
            {task.notes && !compact && (
              <span style={{ color: 'var(--text-secondary)' }}>
                {task.notes.length > 40 ? task.notes.substring(0, 40) + '...' : task.notes}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskCard;
