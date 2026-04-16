import { useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import CaseNumberBadge from '@/components/cases/CaseNumberBadge.jsx';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { openCasePanel } from '@/utils/openCasePanel.js';
import { getDerivedCaseSessionType } from '@/utils/caseCanonical.js';
import { formatDisplayDate } from '@/utils/caseUtils.js';

/* ─── Font shorthand ─────────────────────────────────────────── */
const FF = "'Cairo', 'Tajawal', sans-serif";

/* ─── Widget registry ────────────────────────────────────────── */
const WIDGET_REGISTRY = [
  { id: 'attention', label: 'تنبيهات عاجلة',  icon: '🚨', defaultOrder: 0, defaultVisible: true  },
  { id: 'sessions',  label: 'جلسات الأسبوع',  icon: '📅', defaultOrder: 1, defaultVisible: true  },
  { id: 'judgments', label: 'محجوزة للحكم',   icon: '⚖️', defaultOrder: 2, defaultVisible: true  },
  { id: 'important', label: 'القضايا الهامة', icon: '⭐', defaultOrder: 3, defaultVisible: true  },
  { id: 'review',    label: 'تحتاج مراجعة',  icon: '🔍', defaultOrder: 4, defaultVisible: true  },
  { id: 'plaintiff', label: 'قضايا مدعين',   icon: '👤', defaultOrder: 5, defaultVisible: false },
];
const DEFAULT_CONFIG = WIDGET_REGISTRY.map(({ id, defaultOrder, defaultVisible }) => ({
  id, order: defaultOrder, visible: defaultVisible,
}));

function loadCfg(wsId) {
  try {
    const raw = localStorage.getItem(`lb_dw_${wsId}`);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CONFIG;
    const map = Object.fromEntries(parsed.map(w => [w.id, w]));
    return WIDGET_REGISTRY.map(({ id, defaultOrder, defaultVisible }) => ({
      id,
      order: map[id]?.order ?? defaultOrder,
      visible: map[id]?.visible ?? defaultVisible,
    })).sort((a, b) => a.order - b.order);
  } catch { return DEFAULT_CONFIG; }
}
function saveCfg(wsId, cfg) {
  try { localStorage.setItem(`lb_dw_${wsId}`, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/* ─── Shared micro-components ────────────────────────────────── */
function SessionTag({ type }) {
  const MAP = {
    موضوع: { bg: '#DBEAFE', color: '#1D4ED8' },
    فحص:   { bg: '#FEF3C7', color: '#B45309' },
    حكم:   { bg: '#D1FAE5', color: '#065F46' },
  };
  const s = MAP[type] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap', fontFamily: FF }}>
      {type || 'جلسة'}
    </span>
  );
}

const CARD = { background: 'var(--card-bg, white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg, 12px)', overflow: 'hidden', fontFamily: FF };
const CARD_HEADER = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border)' };
const CARD_TITLE = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: FF };
const badge = (bg, color) => ({ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: bg, color, fontFamily: FF });
const LINK = { fontSize: 11, color: 'var(--primary)', cursor: 'pointer', fontFamily: FF };
const ROW_HOVER = { transition: 'background .1s' };

/* ─── Widget: CriticalStrip ──────────────────────────────────── */
function WidgetCritical({ stats, today, displaySettings }) {
  const hasUrgent = stats.urgentDeadlines.length > 0;
  const hasSusp   = stats.suspended > 0;
  if (!hasUrgent && !hasSusp) return (
    <div style={{ ...CARD }}>
      <div style={{ ...CARD_HEADER, background: '#FEF2F2', borderBottomColor: '#FECACA' }}>
        <span style={{ ...CARD_TITLE, color: '#991B1B' }}>🚨 تنبيهات عاجلة</span>
        <span style={{ ...badge('#F3F4F6', '#6B7280') }}>لا توجد تنبيهات</span>
      </div>
    </div>
  );

  return (
    <div style={{ ...CARD, borderColor: '#FECACA' }}>
      <style>{`@keyframes lb-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}`}</style>
      <div style={{ ...CARD_HEADER, background: '#FEF2F2', borderBottomColor: '#FECACA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'lb-blink 1.4s infinite' }} />
          <span style={{ ...CARD_TITLE, color: '#991B1B' }}>🚨 يحتاج انتباهك الآن</span>
        </div>
        <span style={badge('#FEE2E2', '#DC2626')}>{stats.urgentDeadlines.length + stats.suspendedCases.length} قضية</span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none' }}>
        {stats.urgentDeadlines.map(c => {
          const days = Math.ceil((new Date(c.nextSessionDate) - new Date()) / 86400000);
          const dl   = days <= 0 ? 'اليوم!' : days === 1 ? 'غداً' : `${days} أيام`;
          const dc   = days <= 0 ? '#DC2626' : days <= 2 ? '#D97706' : '#059669';
          return (
            <div key={c.id} onClick={() => openCasePanel(c.id)} style={{ flexShrink: 0, minWidth: 150, padding: '10px 12px', borderRadius: 10, border: '1px solid #FECACA', background: 'white', cursor: 'pointer' }}>
              <div style={{ direction: 'ltr', textAlign: 'right' }}>
                <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: dc, marginTop: 4, fontFamily: FF }}>{dl}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, fontFamily: FF }}>{c.plaintiffName?.substring(0, 22) || '—'}</div>
            </div>
          );
        })}
        {stats.suspendedCases.map(c => (
          <div key={c.id} onClick={() => openCasePanel(c.id)} style={{ flexShrink: 0, minWidth: 150, padding: '10px 12px', borderRadius: 10, border: '1px solid #DDD6FE', background: '#FAF5FF', cursor: 'pointer' }}>
            <div style={{ direction: 'ltr', textAlign: 'right' }}>
              <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', marginTop: 4, fontFamily: FF }}>وقف جزائي</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, fontFamily: FF }}>{c.plaintiffName?.substring(0, 22) || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Widget: Sessions Timeline ──────────────────────────────── */
function WidgetSessions({ stats, today, weekRange, displaySettings, navigate }) {
  const tomorrow = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [today]);

  const groups = useMemo(() =>
    stats.weekSessions.reduce((acc, c) => {
      const k = c.nextSessionDate === today ? 'today' : c.nextSessionDate === tomorrow ? 'tomorrow' : 'week';
      if (!acc[k]) acc[k] = [];
      acc[k].push(c);
      return acc;
    }, {}),
  [stats.weekSessions, today, tomorrow]);

  const typeCounts = useMemo(() => {
    const count = (t) => stats.weekSessions.filter(c => (c.sessionType || c.nextSessionType) === t).length;
    return [
      { label: 'موضوع', count: count('موضوع'), color: '#3B82F6' },
      { label: 'فحص',   count: count('فحص'),   color: '#D97706' },
      { label: 'حكم',   count: count('حكم'),   color: '#059669' },
    ];
  }, [stats.weekSessions]);

  const maxCount = Math.max(...typeCounts.map(t => t.count), 1);

  const DAY_META = {
    today:    { label: `اليوم — ${formatDisplayDate(today)}`,     dot: '#7C3AED' },
    tomorrow: { label: `غداً — ${formatDisplayDate(tomorrow)}`,    dot: '#D97706' },
    week:     { label: 'باقي الأسبوع',                             dot: '#059669' },
  };

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <div style={CARD_TITLE}>
          <span>📅</span><span>جلسات الأسبوع</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>{weekRange?.label || ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={badge('#EDE9FE', '#7C3AED')}>{stats.weekSessions.length}</span>
          <span style={LINK} onClick={() => navigate('/sessions')}>عرض الكل ←</span>
        </div>
      </div>

      {/* Type KPI strip with mini bars */}
      {stats.weekSessions.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {typeCounts.map(t => (
            <div key={t.label} style={{ flex: 1, padding: '9px 12px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.color, fontFamily: FF }}>{t.count}</div>
              <div style={{ height: 3, background: '#F3F4F6', borderRadius: 2, margin: '5px 0 3px' }}>
                <div style={{ height: '100%', width: `${(t.count / maxCount) * 100}%`, background: t.color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: FF }}>{t.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline rows */}
      {stats.weekSessions.length === 0
        ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, fontFamily: FF }}>لا توجد جلسات هذا الأسبوع ✅</div>
        : (
            <>
              <div style={{ maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                {['today', 'tomorrow', 'week'].map(key => {
                  const grp = groups[key];
                  if (!grp?.length) return null;
                  const meta = DAY_META[key];
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 16px', fontSize: 11, fontWeight: 600, background: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontFamily: FF }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', flexShrink: 0 }} />
                        {meta.label}
                      </div>
                      {grp.slice(0, 5).map(c => {
                        const sType = getDerivedCaseSessionType(c);
                        return (
                          <div key={c.id} onClick={() => openCasePanel(c.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', ...ROW_HOVER }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <div style={{ direction: 'ltr', minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
                              <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FF }}>{c.plaintiffName || c.defendantName || '—'}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FF }}>{c.court?.replace('محكمة', '').trim() || ''}</div>
                            </div>
                            {sType && <SessionTag type={sType} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {stats.weekSessions.length > 5 && (
                <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: FF, borderTop: '1px solid var(--border)' }}>
                  + {stats.weekSessions.length - 5} جلسة أخرى — اضغط عرض الكل
                </div>
              )}
            </>
          )
      }

      <div style={{ padding: '8px 16px' }}>
        <button type="button" onClick={() => navigate('/sessions')}
          style={{ width: '100%', padding: '7px 0', fontSize: 13, fontFamily: FF, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-page)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          عرض كل الجلسات ←
        </button>
      </div>
    </div>
  );
}

/* ─── Widget: Judgments + Donut Chart ────────────────────────── */
function WidgetJudgments({ stats, displaySettings, navigate }) {
  const total = stats.total || 1;
  const R = 34, CX = 42, CY = 42, CIRC = 2 * Math.PI * R;

  const segs = [
    { v: stats.active,      color: '#7C3AED' },
    { v: stats.forJudgment, color: '#10B981' },
    { v: stats.suspended,   color: '#6B7280' },
    { v: Math.max(0, total - stats.active - stats.forJudgment - stats.suspended), color: '#D97706' },
  ].filter(s => s.v > 0);

  let off = 0;
  const arcs = segs.map(s => {
    const dash = (s.v / total) * CIRC;
    const arc  = { ...s, dash, gap: CIRC - dash, off };
    off += dash;
    return arc;
  });

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <div style={CARD_TITLE}><span>⚖️</span><span>محجوزة للحكم</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={badge('#EDE9FE', '#7C3AED')}>{stats.forJudgment} قضية</span>
          <span style={LINK} onClick={() => navigate('/judgments')}>عرض الكل ←</span>
        </div>
      </div>

      {/* Donut + legend + bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--border)' }}>

        {/* Donut SVG */}
        <div style={{ padding: '14px 16px', flexShrink: 0 }}>
          <svg width="84" height="84" viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth="11" />
            {arcs.map((a, i) => (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={a.color} strokeWidth="11"
                strokeDasharray={`${a.dash} ${a.gap}`}
                strokeDashoffset={-a.off}
                transform={`rotate(-90 ${CX} ${CY})`} />
            ))}
            <text x={CX} y={CY - 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--primary)" fontFamily={FF}>{stats.total}</text>
            <text x={CX} y={CY + 9} textAnchor="middle" fontSize="9" fill="var(--text-secondary)" fontFamily={FF}>إجمالي</text>
          </svg>
        </div>

        {/* Legend + progress bars */}
        <div style={{ flex: 1, padding: '14px 16px 14px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'نشطة',    v: stats.active,      color: '#7C3AED' },
            { label: 'للحكم',   v: stats.forJudgment, color: '#10B981' },
            { label: 'مدعون',   v: stats.plaintiff,   color: '#2563EB' },
            { label: 'موقوفة',  v: stats.suspended,   color: '#6B7280' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 40, fontFamily: FF }}>{item.label}</span>
              <div style={{ flex: 1, height: 4, background: '#F3F4F6', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, background: item.color, width: `${total > 0 ? Math.round((item.v / total) * 100) : 0}%`, transition: 'width .5s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: item.color, minWidth: 24, textAlign: 'left', fontFamily: FF }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Judgment list */}
      {stats.forJudgmentCases.length === 0
        ? <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', fontFamily: FF }}>لا توجد قضايا محجوزة</div>
        : stats.forJudgmentCases.slice(0, 4).map(c => (
            <div key={c.id} onClick={() => openCasePanel(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', ...ROW_HOVER }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ width: 3, minHeight: 32, borderRadius: 2, background: '#7C3AED', flexShrink: 0, alignSelf: 'stretch' }} />
              <div style={{ direction: 'ltr', minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
                <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FF }}>{c.plaintiffName || '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1, fontFamily: FF }}>{c.court?.replace('محكمة', '').trim().substring(0, 18) || '—'}</div>
              </div>
              {c.flags?.isUrgent
                ? <span style={badge('#FEE2E2', '#DC2626')}>عاجل</span>
                : <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, fontFamily: FF }}>بانتظار الحكم</span>}
            </div>
          ))
      }

      <div style={{ padding: '8px 16px' }}>
        <button type="button" onClick={() => navigate('/judgments')}
          style={{ width: '100%', padding: '7px 0', fontSize: 13, fontFamily: FF, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-page)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          عرض الأحكام ←
        </button>
      </div>
    </div>
  );
}

/* ─── Tab: Reports ───────────────────────────────────────────── */
function TabReports({ stats, navigate }) {
  const handleExport = (type) => alert(`تصدير: ${type} — سيتم تفعيله قريباً`);

  const BTNS = [
    { icon: '📊', label: 'إحصائية شهرية',   sub: 'PDF · Word · Excel', fn: () => handleExport('monthly') },
    { icon: '📅', label: 'رول جلسات',        sub: 'PDF · طباعة',        fn: () => handleExport('sessions') },
    { icon: '⚖️', label: 'مواعيد الطعن',    sub: 'مرتبة بالأولوية',    fn: () => handleExport('deadlines') },
    { icon: '📝', label: 'تعبئة نموذج',      sub: 'دمج الإحصائيات',     fn: () => navigate('/templates?prefill=stats') },
    { icon: '⏰', label: 'المهام المتأخرة',  sub: 'لكل مستخدم',         fn: () => handleExport('tasks') },
    { icon: '⚙️', label: 'تقرير مخصص',      sub: 'حدد الحقول والفترة', fn: () => navigate('/templates?mode=custom-report') },
  ];

  return (
    <div style={{ display: 'grid', gap: 16, fontFamily: FF }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'إجمالي القضايا', v: stats.total,              color: '#7C3AED', bg: '#EDE9FE' },
          { label: 'جلسات الأسبوع',  v: stats.weekSessions.length, color: '#059669', bg: '#D1FAE5' },
          { label: 'محجوزة للحكم',   v: stats.forJudgment,         color: '#D97706', bg: '#FEF3C7' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: '16px 14px', textAlign: 'center', border: `1px solid ${k.color}25` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: FF, lineHeight: 1 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: k.color, marginTop: 5, fontFamily: FF }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Stats table */}
      <div style={{ ...CARD }}>
        <div style={{ ...CARD_HEADER }}>
          <span style={{ ...CARD_TITLE }}>📋 الإحصائية التفصيلية</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => handleExport('excel')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: FF, border: '1px solid #7C3AED', background: '#EDE9FE', color: '#7C3AED' }}>⬇️ Excel</button>
            <button type="button" onClick={() => handleExport('pdf')}   style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: FF, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>🖨️ PDF</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FF }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['النوع','الإجمالي','نشطة','للحكم','موقوفة','جلسات الأسبوع'].map(h => (
                <th key={h} style={{ padding: '7px 14px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: FF }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: FF }}>مساحة العمل</td>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#7C3AED', fontFamily: FF }}>{stats.total}</td>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#059669', fontFamily: FF }}>{stats.active}</td>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#7C3AED', fontFamily: FF }}>{stats.forJudgment}</td>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: FF }}>{stats.suspended}</td>
              <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#059669', fontFamily: FF }}>{stats.weekSessions.length}</td>
            </tr>
            <tr style={{ background: '#EDE9FE' }}>
              {[
                { v: 'الإجمالي', bold: true },
                { v: stats.total,               color: '#7C3AED' },
                { v: stats.active,              color: '#059669' },
                { v: stats.forJudgment,         color: '#7C3AED' },
                { v: stats.suspended,           color: 'var(--text-secondary)' },
                { v: stats.weekSessions.length, color: '#059669' },
              ].map((cell, i) => (
                <td key={i} style={{ padding: '8px 14px', fontWeight: 700, color: cell.color || 'var(--text)', fontFamily: FF }}>{cell.v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export buttons */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, fontFamily: FF }}>تصدير ودمج في النماذج</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {BTNS.map(b => (
            <div key={b.label} onClick={b.fn}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 10px', borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-page)', textAlign: 'center', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#EDE9FE'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-page)'; }}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: FF }}>{b.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: FF }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate        = useNavigate();
  const { cases }       = useCases();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();

  const wsId = String(currentWorkspace?.id || 'default');

  /* ── Stats ── */
  const caseList = Array.isArray(cases) ? cases : [];
  const today    = new Date().toISOString().split('T')[0];

  const weekRange = useMemo(() => {
    const d = new Date();
    const sat = new Date(d); sat.setDate(d.getDate() - ((d.getDay() + 1) % 7));
    const thu = new Date(sat); thu.setDate(sat.getDate() + 5);
    return {
      start: sat.toISOString().split('T')[0],
      end:   thu.toISOString().split('T')[0],
      label: `${sat.toLocaleDateString('ar-EG', { month:'short', day:'numeric' })} — ${thu.toLocaleDateString('ar-EG', { month:'short', day:'numeric' })}`,
    };
  }, []);

  const stats = useMemo(() => {
    const active      = caseList.filter(c => ['active','new','under_review'].includes(c.status));
    const forJudgment = caseList.filter(c => c.agendaRoute === 'judgments' || c.status === 'reserved_for_judgment');
    const plaintiff   = caseList.filter(c => c.flags?.isPlaintiff);
    const important   = caseList.filter(c => c.flags?.isImportant);
    const needsReview = caseList.filter(c => c.flags?.needsReview);
    const suspended   = caseList.filter(c => c.status === 'suspended');
    const weekSessions = caseList
      .filter(c => c.nextSessionDate >= weekRange.start && c.nextSessionDate <= weekRange.end)
      .sort((a,b) => String(a.nextSessionDate||'').localeCompare(String(b.nextSessionDate||'')));
    const todaySessions   = caseList.filter(c => c.nextSessionDate === today);
    const urgentDeadlines = caseList.filter(c => {
      if (!c.nextSessionDate || c.nextSessionDate < today) return false;
      return Math.ceil((new Date(c.nextSessionDate) - new Date()) / 86400000) <= 3;
    });
    return {
      total: caseList.length, active: active.length, forJudgment: forJudgment.length,
      plaintiff: plaintiff.length, important: important.length,
      needsReview: needsReview.length, suspended: suspended.length,
      weekSessions, todaySessions, urgentDeadlines,
      plaintiffCases: plaintiff, importantCases: important,
      suspendedCases: suspended, forJudgmentCases: forJudgment,
      needsReviewCases: needsReview,
    };
  }, [caseList, today, weekRange]);

  /* ── UI state ── */
  const [activeTab,     setActiveTab]     = useState('main');
  const [showCustomize, setShowCustomize] = useState(false);
  const [widgetConfig,  setWidgetConfig]  = useState(() => loadCfg(wsId));
  const [dragId,        setDragId]        = useState(null);
  const dragOverId = useRef(null);

  const greeting  = (() => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور'; })();
  const ownerName = currentWorkspace?.ownerDisplayName || currentWorkspace?.name || '';

  /* ── Widget config ── */
  const updateCfg = useCallback((cfg) => { setWidgetConfig(cfg); saveCfg(wsId, cfg); }, [wsId]);
  const toggleVisible  = useCallback((id) => updateCfg(widgetConfig.map(w => w.id === id ? { ...w, visible: !w.visible } : w)), [widgetConfig, updateCfg]);
  const resetToDefault = useCallback(() => updateCfg(DEFAULT_CONFIG), [updateCfg]);

  /* ── Drag & Drop ── */
  const onDragStart = (id)    => setDragId(id);
  const onDragOver  = (e, id) => { e.preventDefault(); dragOverId.current = id; };
  const onDrop      = (e)     => {
    e.preventDefault();
    if (!dragId || dragId === dragOverId.current) { setDragId(null); return; }
    const from = widgetConfig.findIndex(w => w.id === dragId);
    const to   = widgetConfig.findIndex(w => w.id === dragOverId.current);
    if (from === -1 || to === -1) { setDragId(null); return; }
    const next = [...widgetConfig];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateCfg(next.map((w, i) => ({ ...w, order: i })));
    setDragId(null);
    dragOverId.current = null;
  };
  const onDragEnd = () => { setDragId(null); dragOverId.current = null; };

  const shared = { stats, today, weekRange, displaySettings, navigate };

  /* ── Widget renderers ── */
  const RENDER = {
    attention: () => <WidgetCritical  stats={stats} today={today} displaySettings={displaySettings} />,
    sessions:  () => <WidgetSessions  {...shared} />,
    judgments: () => <WidgetJudgments stats={stats} displaySettings={displaySettings} navigate={navigate} />,
    important: () => stats.important > 0 ? (
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_TITLE}><span>⭐</span><span>القضايا الهامة</span></div>
          <span style={badge('#FEF3C7','#B45309')}>{stats.important} قضية</span>
        </div>
        <div style={{ display: 'grid', gap: 5, maxHeight: 200, overflowY: 'auto', padding: '8px 0' }}>
          {stats.importantCases.slice(0, 6).map(c => (
            <div key={c.id} onClick={() => openCasePanel(c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', ...ROW_HOVER }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ direction: 'ltr' }}>
                <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: FF }}>{c.plaintiffName?.substring(0, 22) || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    ) : null,
    review: () => stats.needsReview > 0 ? (
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_TITLE}><span>🔍</span><span>تحتاج مراجعة</span></div>
          <span style={badge('#FFF7ED','#EA580C')}>{stats.needsReview} قضية</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8, padding: 12 }}>
          {stats.needsReviewCases.slice(0, 8).map(c => (
            <div key={c.id} onClick={() => openCasePanel(c.id)}
              style={{ padding: '8px 12px', background: '#FFF7ED', borderRadius: 8, cursor: 'pointer', borderRight: '3px solid #EA580C' }}>
              <div style={{ direction: 'ltr', textAlign: 'right' }}>
                <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, fontFamily: FF }}>{c.plaintiffName?.substring(0, 25) || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    ) : null,
    plaintiff: () => stats.plaintiff > 0 ? (
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_TITLE}><span>👤</span><span>قضايا مدعين</span></div>
          <span style={badge('#DBEAFE','#1D4ED8')}>{stats.plaintiff} قضية</span>
        </div>
        <div style={{ display: 'grid', gap: 5, maxHeight: 180, overflowY: 'auto', padding: '8px 0' }}>
          {stats.plaintiffCases.filter(c => c.nextSessionDate >= today)
            .sort((a,b) => String(a.nextSessionDate||'').localeCompare(String(b.nextSessionDate||'')))
            .slice(0, 5).map(c => (
              <div key={c.id} onClick={() => openCasePanel(c.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', ...ROW_HOVER }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{ direction: 'ltr' }}>
                  <CaseNumberBadge caseNumber={c.caseNumber} caseYear={c.caseYear} caseData={c} variant="inline" displayOrder={displaySettings?.caseNumberDisplayOrder} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }} />
                </div>
                <span style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, fontFamily: FF }}>{formatDisplayDate(c.nextSessionDate)}</span>
              </div>
            ))}
        </div>
      </div>
    ) : null,
  };

  const sorted = [...widgetConfig].sort((a,b) => a.order - b.order);

  /* ════════════════ RENDER ════════════════ */
  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 1200, margin: '0 auto', fontFamily: FF }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: FF }}>
            {greeting}{ownerName ? `، ${ownerName.split('@')[0]}` : ''}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3, fontFamily: FF }}>
            {new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 14, fontFamily: FF }}>
          {currentWorkspace?.name || 'مساحة العمل'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', gap: 2, overflowX: 'auto' }}>
        {[
          { id:'main',     label:'لوحة التحكم' },
          { id:'sessions', label:'الجلسات' },
          { id:'reports',  label:'التقارير والنماذج' },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{
            padding: '9px 16px', fontSize: 13, fontFamily: FF, background: 'none', border: 'none',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === t.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === 'main' && (
          <button type="button" onClick={() => setShowCustomize(v => !v)} style={{
            fontSize: 11, padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 20,
            background: showCustomize ? 'var(--primary-light)' : 'var(--bg-page)',
            cursor: 'pointer', color: showCustomize ? 'var(--primary)' : 'var(--text-secondary)',
            fontFamily: FF, whiteSpace: 'nowrap',
          }}>
            ⚙️ تخصيص الويدجات
          </button>
        )}
      </div>

      {/* ════ TAB: MAIN ════ */}
      {activeTab === 'main' && (
        <>
          {/* Customize panel */}
          {showCustomize && (
            <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FF }}>🎛️ إدارة الويدجات</span>
                <button type="button" onClick={resetToDefault} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 20, background: 'white', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: FF }}>
                  ↺ إعادة للافتراضي
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: FF }}>اسحب لتغيير الترتيب · انقر المربع للإخفاء/الإظهار</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sorted.map(w => {
                  const meta = WIDGET_REGISTRY.find(r => r.id === w.id);
                  if (!meta) return null;
                  return (
                    <div key={w.id} draggable
                      onDragStart={() => onDragStart(w.id)} onDragOver={e => onDragOver(e, w.id)}
                      onDrop={onDrop} onDragEnd={onDragEnd}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${dragId===w.id?'var(--primary)':'var(--border)'}`, background: w.visible ? 'white' : 'var(--bg-page)', cursor: 'grab', userSelect: 'none', fontSize: 13, fontFamily: FF, opacity: dragId===w.id ? 0.5 : 1 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>⠿</span>
                      <span>{meta.icon}</span>
                      <span style={{ color: w.visible ? 'var(--text)' : 'var(--text-muted)' }}>{meta.label}</span>
                      <input type="checkbox" checked={w.visible} onChange={() => toggleVisible(w.id)} style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Widget grid */}
          <div style={{ display: 'grid', gap: 14 }}>
            {sorted.map(w => {
              if (!w.visible) return null;
              const renderer = RENDER[w.id];
              if (!renderer) return null;
              const node = renderer();
              if (!node) return null;
              return (
                <div key={w.id} draggable
                  onDragStart={() => onDragStart(w.id)} onDragOver={e => onDragOver(e, w.id)}
                  onDrop={onDrop} onDragEnd={onDragEnd}
                  style={{ opacity: dragId===w.id ? 0.4 : 1, outline: dragOverId.current===w.id&&dragId&&dragId!==w.id ? '2px dashed var(--primary)' : 'none', borderRadius: 'var(--radius-md)' }}>
                  {node}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════ TAB: SESSIONS ════ */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
            {[
              { label:'جلسات اليوم',  v: stats.todaySessions.length,  color:'var(--primary)' },
              { label:'هذا الأسبوع', v: stats.weekSessions.length,   color:'#059669' },
              { label:'فحص',          v: stats.weekSessions.filter(c=>(c.sessionType||c.nextSessionType)==='فحص').length,   color:'#D97706' },
              { label:'موضوع',        v: stats.weekSessions.filter(c=>(c.sessionType||c.nextSessionType)==='موضوع').length, color:'#2563EB' },
              { label:'حكم',          v: stats.weekSessions.filter(c=>(c.sessionType||c.nextSessionType)==='حكم').length,   color:'#059669' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: FF }}>{k.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, fontFamily: FF }}>{k.label}</div>
              </div>
            ))}
          </div>
          <WidgetSessions {...shared} showAll />
        </div>
      )}

      {/* ════ TAB: REPORTS ════ */}
      {activeTab === 'reports' && <TabReports stats={stats} navigate={navigate} />}

    </div>
  );
}
