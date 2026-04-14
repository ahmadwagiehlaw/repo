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
    const ROUTE_LABELS = {
      next_session: 'جلسة قادمة',
      judgments: 'أجندة الأحكام',
      archive: 'أرشفة القضية',
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            سجل الجلسات — {sessions.length} جلسة
          </span>
          <button
            onClick={onAddSession}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '12px' }}
          >
            + إضافة جلسة
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
            لا توجد جلسات مسجلة بعد
          </div>
        ) : (
          sessions.map((session, idx) => {
            const isRolled = Boolean(session.route || session.archivedAt);
            const borderColor = isRolled ? '#2563eb' : '#94a3b8';
            const bgColor = isRolled ? '#eff6ff' : '#f8fafc';
            const labelColor = isRolled ? '#1e40af' : '#475569';

            return (
              <div
                key={session.sessionId || session.id || idx}
                style={{
                  padding: '14px 16px',
                  border: `1px solid ${borderColor}`,
                  borderRight: `4px solid ${borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  background: bgColor,
                }}
              >
                {/* Row 1: Date + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: labelColor }}>
                    📅 <DateDisplay value={session.date || session.sessionDate} options={dateDisplayOptions} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {session.sessionType && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                        background: '#dbeafe', color: '#1d4ed8', borderRadius: '999px',
                      }}>
                        {session.sessionType}
                      </span>
                    )}
                    {isRolled && session.route && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                        background: '#dcfce7', color: '#15803d', borderRadius: '999px',
                      }}>
                        ✓ {ROUTE_LABELS[session.route] || session.route}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Decision */}
                {(session.decision || session.sessionResult) && (
                  <div style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 600, marginBottom: '6px' }}>
                    القرار: {session.decision || session.sessionResult}
                  </div>
                )}

                {/* Row 3: Next date */}
                {(session.nextDate || session.nextSessionDate) && (
                  <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>
                    الجلسة القادمة:{' '}
                    <DateDisplay
                      value={session.nextDate || session.nextSessionDate}
                      options={dateDisplayOptions}
                    />
                  </div>
                )}

                {/* Row 4: Notes */}
                {session.notes && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    {session.notes}
                  </div>
                )}

                {/* Row 5: Snapshot indicator */}
                {session.snapshot && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🗂️ snapshot محفوظ
                    {session.archivedAt && (
                      <span style={{ marginRight: '6px' }}>
                        · <DateDisplay value={session.archivedAt} options={dateDisplayOptions} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
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
