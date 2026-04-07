import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { openCasePanel } from '@/utils/openCasePanel.js';
import { getDerivedCaseSessionType } from '@/utils/caseCanonical.js';
import { formatDisplayDate } from '@/utils/caseUtils.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { cases } = useCases();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();
  const [showAttentionPanel, setShowAttentionPanel] = useState(false);

  const caseList = Array.isArray(cases) ? cases : [];
  const today = new Date().toISOString().split('T')[0];

  const weekRange = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const distToSat = (day + 1) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - distToSat);
    const thu = new Date(sat);
    thu.setDate(sat.getDate() + 5);
    return {
      start: sat.toISOString().split('T')[0],
      end: thu.toISOString().split('T')[0],
      label: `${sat.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} — ${thu.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`,
    };
  }, []);

  const stats = useMemo(() => {
    const active = caseList.filter((c) => ['active', 'new', 'under_review'].includes(c.status));
    const forJudgment = caseList.filter((c) => c.agendaRoute === 'judgments' || c.status === 'reserved_for_judgment');
    const plaintiff = caseList.filter((c) => c.flags?.isPlaintiff);
    const important = caseList.filter((c) => c.flags?.isImportant);
    const urgent = caseList.filter((c) => c.flags?.isUrgent);
    const needsReview = caseList.filter((c) => c.flags?.needsReview);
    const suspended = caseList.filter((c) => c.status === 'suspended');

    const weekSessions = caseList
      .filter((c) => c.nextSessionDate >= weekRange.start && c.nextSessionDate <= weekRange.end)
      .sort((a, b) => String(a.nextSessionDate || '').localeCompare(String(b.nextSessionDate || '')));

    const todaySessions = caseList.filter((c) => c.nextSessionDate === today);

    const urgentDeadlines = caseList.filter((c) => {
      if (!c.nextSessionDate || c.nextSessionDate < today) return false;
      const days = Math.ceil((new Date(c.nextSessionDate) - new Date()) / 86400000);
      return days <= 3;
    });

    return {
      total: caseList.length,
      active: active.length,
      forJudgment: forJudgment.length,
      plaintiff: plaintiff.length,
      important: important.length,
      urgent: urgent.length,
      needsReview: needsReview.length,
      suspended: suspended.length,
      weekSessions,
      todaySessions,
      urgentDeadlines,
      weekSessionsList: weekSessions,
      plaintiffCases: plaintiff,
      importantCases: important,
      suspendedCases: suspended,
      forJudgmentCases: forJudgment,
      needsReviewCases: needsReview,
    };
  }, [caseList, today, weekRange]);

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>لوحة التحكم</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <div
          style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {currentWorkspace?.name || 'مساحة العمل'}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {[
          { label: 'إجمالي القضايا', value: stats.total, icon: '📁', color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'نشطة', value: stats.active, icon: '⚡', color: '#16a34a', bg: '#dcfce7' },
          { label: 'محجوزة للحكم', value: stats.forJudgment, icon: '⚖️', color: '#7c3aed', bg: '#ede9fe' },
          { label: 'مدعين', value: stats.plaintiff, icon: '👤', color: '#0284c7', bg: '#dbeafe' },
          { label: 'هامة', value: stats.important, icon: '⭐', color: '#d97706', bg: '#fef3c7' },
          { label: 'عاجلة', value: stats.urgent, icon: '⌛', color: '#dc2626', bg: '#fee2e2' },
          { label: 'تحتاج مراجعة', value: stats.needsReview, icon: '🚨', color: '#ea580c', bg: '#ffedd5' },
          { label: 'موقوفة', value: stats.suspended, icon: '⏸️', color: '#6b7280', bg: '#f3f4f6' },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.value > 0 && navigate('/cases')}
            style={{
              background: stat.value > 0 ? stat.bg : 'var(--bg-page)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 12px',
              textAlign: 'center',
              border: '1px solid',
              borderColor: stat.value > 0 ? `${stat.color}30` : 'var(--border)',
              cursor: stat.value > 0 ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 22 }}>{stat.icon}</div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: stat.value > 0 ? stat.color : 'var(--text-muted)',
                lineHeight: 1.2,
                marginTop: 4,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {(stats.urgentDeadlines.length > 0 || stats.suspended > 0) && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>🚨 يحتاج انتباهك الآن</div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12, borderColor: '#fca5a5', color: '#b91c1c', background: 'white' }}
              onClick={() => setShowAttentionPanel((prev) => !prev)}
            >
              {showAttentionPanel ? 'إغلاق' : 'عرض'}
            </button>
          </div>

          {showAttentionPanel && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {stats.urgentDeadlines.map((c) => {
                const days = Math.ceil((new Date(c.nextSessionDate) - new Date()) / 86400000);
                return (
                  <div
                    key={c.id}
                    onClick={() => openCasePanel(c.id)}
                    style={{
                      background: 'white',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 13,
                      border: '1px solid #fca5a5',
                    }}
                  >
                    <CaseNumberBadge
                      caseNumber={c.caseNumber}
                      caseYear={c.caseYear}
                      caseData={c}
                      variant="inline"
                      displayOrder={displaySettings.caseNumberDisplayOrder}
                      style={{ color: 'var(--primary)', fontWeight: 700 }}
                    />
                    <span style={{ color: '#dc2626', fontWeight: 700, marginRight: 6 }}>
                      {days <= 0 ? 'اليوم!' : days === 1 ? 'غداً' : `${days} أيام`}
                    </span>
                  </div>
                );
              })}
              {stats.suspendedCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openCasePanel(c.id)}
                  style={{
                    background: 'white',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    border: '1px solid #fca5a5',
                  }}
                >
                  <CaseNumberBadge
                    caseNumber={c.caseNumber}
                    caseYear={c.caseYear}
                    caseData={c}
                    variant="inline"
                    displayOrder={displaySettings.caseNumberDisplayOrder}
                    style={{ color: 'var(--primary)', fontWeight: 700 }}
                  />
                  <span style={{ color: '#7c3aed', marginRight: 6, fontSize: 11 }}>وقف جزائي</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>📅 جلسات الأسبوع</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{weekRange.label}</div>
            </div>
            <span
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '2px 10px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {stats.weekSessions.length}
            </span>
          </div>

          {stats.weekSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>لا توجد جلسات هذا الأسبوع ✅</div>
          ) : (
            <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
              {stats.weekSessions.map((c) => {
                const isToday = c.nextSessionDate === today;
                const days = Math.ceil((new Date(c.nextSessionDate) - new Date()) / 86400000);
                return (
                  <div
                    key={c.id}
                    onClick={() => openCasePanel(c.id)}
                    style={{
                      padding: '8px 12px',
                      background: isToday ? 'var(--primary-light)' : 'var(--bg-page)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      borderRight: isToday ? '3px solid var(--primary)' : '3px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>
                        <CaseNumberBadge
                          caseNumber={c.caseNumber}
                          caseYear={c.caseYear}
                          caseData={c}
                          variant="inline"
                          displayOrder={displaySettings.caseNumberDisplayOrder}
                          style={{ color: 'var(--primary)', fontWeight: 700 }}
                        />
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {c.plaintiffName || '—'}
                        {getDerivedCaseSessionType(c) && ` · ${getDerivedCaseSessionType(c)}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      {isToday && (
                        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 11, marginBottom: 1 }}>⚡ اليوم</div>
                      )}
                      {!isToday && days === 1 && (
                        <div style={{ color: '#d97706', fontWeight: 700, fontSize: 11, marginBottom: 1 }}>غداً</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDisplayDate(c.nextSessionDate)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button className="btn-secondary" style={{ width: '100%', marginTop: 10, fontSize: 13 }} onClick={() => navigate('/sessions')}>
            عرض كل الجلسات ←
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>⭐ القضايا الهامة</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.important} قضية</span>
            </div>
            {stats.important === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>لا توجد قضايا هامة</div>
            ) : (
              <div style={{ display: 'grid', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                {stats.importantCases.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => openCasePanel(c.id)}
                    style={{
                      padding: '6px 10px',
                      background: '#fffbeb',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      borderRight: '2px solid #d97706',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <CaseNumberBadge
                      caseNumber={c.caseNumber}
                      caseYear={c.caseYear}
                      caseData={c}
                      variant="inline"
                      displayOrder={displaySettings.caseNumberDisplayOrder}
                      style={{ color: 'inherit', fontSize: 13, fontWeight: 600 }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.plaintiffName?.substring(0, 20) || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>⚖️ محجوزة للحكم</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.forJudgment} قضية</span>
            </div>
            {stats.forJudgment === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>لا توجد قضايا محجوزة</div>
            ) : (
              <div style={{ display: 'grid', gap: 5, maxHeight: 160, overflowY: 'auto' }}>
                {stats.forJudgmentCases.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => openCasePanel(c.id)}
                    style={{
                      padding: '6px 10px',
                      background: '#faf5ff',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      borderRight: '2px solid #7c3aed',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <CaseNumberBadge
                      caseNumber={c.caseNumber}
                      caseYear={c.caseYear}
                      caseData={c}
                      variant="inline"
                      displayOrder={displaySettings.caseNumberDisplayOrder}
                      style={{ color: '#7c3aed', fontSize: 13, fontWeight: 600 }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {c.court?.replace('محكمة', '').trim().substring(0, 15) || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" style={{ width: '100%', marginTop: 8, fontSize: 12 }} onClick={() => navigate('/judgments')}>
              عرض الأحكام ←
            </button>
          </div>

          {stats.plaintiff > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>👤 قضايا مدعين</span>
                <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 700 }}>{stats.plaintiff} قضية</span>
              </div>
              <div style={{ display: 'grid', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
                {stats.plaintiffCases
                  .filter((c) => c.nextSessionDate >= today)
                  .sort((a, b) => String(a.nextSessionDate || '').localeCompare(String(b.nextSessionDate || '')))
                  .slice(0, 4)
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openCasePanel(c.id)}
                      style={{
                        padding: '6px 10px',
                        background: '#eff6ff',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        borderRight: '2px solid #0284c7',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <CaseNumberBadge
                        caseNumber={c.caseNumber}
                        caseYear={c.caseYear}
                        caseData={c}
                        variant="inline"
                        displayOrder={displaySettings.caseNumberDisplayOrder}
                        style={{ color: 'inherit', fontSize: 13, fontWeight: 600 }}
                      />
                      <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>{formatDisplayDate(c.nextSessionDate)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {stats.needsReview > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🚨 تحتاج مراجعة ({stats.needsReview})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {stats.needsReviewCases.slice(0, 8).map((c) => (
              <div
                key={c.id}
                onClick={() => openCasePanel(c.id)}
                style={{
                  padding: '8px 12px',
                  background: '#fff7ed',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  borderRight: '2px solid #ea580c',
                }}
              >
                <CaseNumberBadge
                  caseNumber={c.caseNumber}
                  caseYear={c.caseYear}
                  caseData={c}
                  variant="inline"
                  displayOrder={displaySettings.caseNumberDisplayOrder}
                  style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 700 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.plaintiffName?.substring(0, 25) || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
