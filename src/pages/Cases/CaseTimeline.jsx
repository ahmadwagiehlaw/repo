import DateDisplay from '@/components/common/DateDisplay.jsx';

export default function CaseTimeline({
  mode,
  sessions = [],
  judgments = [],
  timelineEvents = [],
  onAddSession,
  onAddJudgment,
  dateDisplayOptions,
}) {
  if (mode === 'sessions') {
    return (
      <div style={{ display: 'grid', gap: '12px' }}>
        <button
          onClick={onAddSession}
          className="btn-primary"
          style={{ padding: '10px 16px', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}
        >
          + إضافة جلسة
        </button>

        {sessions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
            لا توجد جلسات
          </div>
        ) : (
          sessions.map((session, idx) => (
            <div key={idx} style={{ padding: '12px', border: '1px solid #2563eb', borderLeft: '4px solid #2563eb', borderRadius: 'var(--radius-md)', background: '#eff6ff' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#1e40af' }}>
                <DateDisplay value={session.date} options={dateDisplayOptions} />
              </div>
              <div style={{ fontSize: '13px', color: '#1e3a8a', marginBottom: '4px' }}>{session.sessionResult || '—'}</div>
              {session.notes && <div style={{ fontSize: '12px', color: '#475569' }}>ملاحظات: {session.notes}</div>}
            </div>
          ))
        )}
      </div>
    );
  }

  if (mode === 'judgments') {
    return (
      <div style={{ display: 'grid', gap: '12px' }}>
        <button
          onClick={onAddJudgment}
          className="btn-primary"
          style={{ padding: '10px 16px', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}
        >
          + إضافة حكم
        </button>

        {judgments.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
            لا توجد أحكام
          </div>
        ) : (
          judgments.map((judgment) => (
            <div key={judgment.id} style={{ padding: '12px', border: '1px solid #10b981', borderLeft: '4px solid #10b981', borderRadius: 'var(--radius-md)', background: '#f0fdf4' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#065f46' }}>
                <DateDisplay value={judgment.date} options={dateDisplayOptions} />
              </div>
              <div style={{ fontSize: '13px', color: '#047857', marginBottom: '4px', fontWeight: 600 }}>{judgment.decision || '—'}</div>
              {judgment.summary && <div style={{ fontSize: '12px', color: '#475569' }}>ملخص: {judgment.summary}</div>}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {timelineEvents.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
          لا توجد أحداث
        </div>
      ) : (
        timelineEvents.map((event, idx) => {
          const eventStyles = {
            session: { borderColor: '#2563eb', backgroundColor: '#eff6ff', textColor: '#1e40af', icon: '📅' },
            judgment: { borderColor: '#10b981', backgroundColor: '#f0fdf4', textColor: '#065f46', icon: '⚖️' },
            task: { borderColor: '#f59e0b', backgroundColor: '#fffbeb', textColor: '#92400e', icon: '✓' },
          };
          const style = eventStyles[event.type] || eventStyles.task;

          return (
            <div
              key={`${event.type}-${idx}`}
              style={{
                padding: '12px',
                border: `1px solid ${style.borderColor}`,
                borderLeft: `4px solid ${style.borderColor}`,
                borderRadius: 'var(--radius-md)',
                background: style.backgroundColor,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', color: style.textColor }}>
                {style.icon} {event.title} · <DateDisplay value={event.date} options={dateDisplayOptions} />
              </div>
              <div style={{ fontSize: '13px', color: '#475569' }}>{event.content}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
