import DateDisplay from '@/components/common/DateDisplay.jsx';

export default function CaseTasksTab({
  tasks = [],
  dateDisplayOptions,
  onAddTask,
  onToggleTaskComplete,
  onEditTask,
  onDeleteTask,
}) {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <button
        onClick={onAddTask}
        className="btn-primary"
        style={{ padding: '10px 16px', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}
      >
        + إضافة مهمة
      </button>

      {tasks.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
          لا توجد مهام
        </div>
      ) : (
        tasks.map((task) => {
          const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

          return (
            <div
              key={task.id}
              style={{
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: task.completed ? '#f3f4f6' : 'var(--bg-hover)',
                opacity: task.completed ? 0.7 : 1,
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <input
                type="checkbox"
                checked={task.completed || false}
                onChange={() => onToggleTaskComplete(task)}
                style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', textDecoration: task.completed ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {task.dueDate && <span><DateDisplay value={task.dueDate} options={dateDisplayOptions} /></span>}
                  {task.priority && (
                    <span style={{ color: priorityColors[task.priority] || '#666', fontWeight: 600 }}>
                      {task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                    </span>
                  )}
                </div>
                {task.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>{task.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => onEditTask(task)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
