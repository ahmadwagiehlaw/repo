import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCases } from '@/contexts/CaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FIELD_DENSITY } from '@/core/Constants.js';
import storage from '@/data/Storage.js';
import { openCasePanel } from '@/utils/openCasePanel.js';
import { formatCaseNumber } from '@/utils/caseUtils.js';
import { useFieldDensity } from '@/hooks/useFieldDensity.js';
import { useInstallPrompt } from '@/hooks/useInstallPrompt.js';
import { useDisplaySettings } from '@/hooks/useDisplaySettings.js';
import { useSensitiveMode } from '@/hooks/useSensitiveMode.js';
import { getCaseSessionResult, getCaseTitle, getDerivedCaseSessionType } from '@/utils/caseCanonical.js';

function buildNotifications(cases, tasks, judgments, displayOrder, urgentDays = 10) {
  const today = new Date().toISOString().split('T')[0];
  const notifications = [];

  (Array.isArray(tasks) ? tasks : [])
    .filter((t) => {
      if (t.status === 'done') return false;
      if (!t.dueDate || t.dueDate >= today) return false;
      const title = String(t.title || '').toLowerCase();
      return !title.startsWith('طلب إطلاع');
    })
    .slice(0, 5)
    .forEach((t) => {
      const days = Math.abs(Math.ceil((new Date(t.dueDate) - new Date()) / 86400000));
      notifications.push({
        id: `overdue-${t.id}`,
        type: 'overdue',
        icon: '🔴',
        title: String(t.title || '').substring(0, 45),
        subtitle: `متأخرة ${days} يوم`,
        caseId: t.caseId,
        priority: 1,
      });
    });

  const urgentDaysNum = Number(localStorage.getItem('lb_urgent_days') || urgentDays);

  (Array.isArray(tasks) ? tasks : [])
    .filter((t) => {
      if (t.status === 'done' || !t.dueDate || t.dueDate < today) return false;
      const title = String(t.title || '').toLowerCase();
      if (title.startsWith('طلب إطلاع')) return false;
      const days = Math.ceil((new Date(t.dueDate) - new Date()) / 86400000);
      return days <= urgentDaysNum;
    })
    .slice(0, 5)
    .forEach((t) => {
      const days = Math.ceil((new Date(t.dueDate) - new Date()) / 86400000);
      notifications.push({
        id: `urgent-task-${t.id}`,
        type: 'urgent_task',
        icon: '⚠️',
        title: String(t.title || '').substring(0, 45),
        subtitle: days === 0 ? 'اليوم!' : `متبقي ${days} يوم`,
        caseId: t.caseId,
        priority: days <= 3 ? 1 : 2,
      });
    });

  (Array.isArray(judgments) ? judgments : [])
    .filter((j) => j.isPlaintiff && j.appealDeadlineDate && j.appealDeadlineDate >= today)
    .forEach((j) => {
      const days = Math.ceil((new Date(j.appealDeadlineDate) - new Date()) / 86400000);
      if (days > 15) return;
      const num = formatCaseNumber(j.caseNumber, j.caseYear, { displayOrder });
      notifications.push({
        id: `appeal-${j.id}`,
        type: 'appeal_deadline',
        icon: '⚖️',
        title: `ميعاد طعن: ${num}`,
        subtitle: `ينتهي ${days === 0 ? 'اليوم!' : `خلال ${days} يوم`}`,
        caseId: j.caseId,
        priority: days <= 7 ? 1 : 2,
      });
    });

  (Array.isArray(cases) ? cases : [])
    .filter((c) => c.status === 'suspended' && c.flags?.isPlaintiff)
    .slice(0, 3)
    .forEach((c) => {
      const num = formatCaseNumber(c.caseNumber, c.caseYear, { displayOrder });
      notifications.push({
        id: `suspended-${c.id}`,
        type: 'suspension',
        icon: '🚨',
        title: `وقف جزائي: ${num}`,
        subtitle: 'مدعين — يحتاج تعجيل من الوقف',
        caseId: c.id,
        priority: 1,
      });
    });

  (Array.isArray(cases) ? cases : [])
    .filter((c) => c.nextSessionDate === today)
    .slice(0, 5)
    .forEach((c) => {
      const num = formatCaseNumber(c.caseNumber, c.caseYear, { displayOrder });
      notifications.push({
        id: `today-${c.id}`,
        type: 'today_session',
        icon: '📅',
        title: `جلسة اليوم: ${num}`,
        subtitle: `${c.court || '—'} · ${getDerivedCaseSessionType(c) || ''}`.trim().replace(/·\s*$/, ''),
        caseId: c.id,
        priority: 1,
      });
    });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  (Array.isArray(cases) ? cases : [])
    .filter((c) => c.nextSessionDate === tomorrowStr)
    .slice(0, 3)
    .forEach((c) => {
      const num = formatCaseNumber(c.caseNumber, c.caseYear, { displayOrder });
      notifications.push({
        id: `tomorrow-${c.id}`,
        type: 'tomorrow_session',
        icon: '🗓️',
        title: `جلسة غداً: ${num}`,
        subtitle: c.court || '—',
        caseId: c.id,
        priority: 2,
      });
    });

  return notifications.sort((a, b) => a.priority - b.priority);
}

function getNotificationControlsKey(workspaceId) {
  return `lawbase.notificationControls.${workspaceId || 'global'}`;
}

function getNotificationSignature(notification) {
  return [
    notification?.id,
    notification?.type,
    notification?.title,
    notification?.subtitle,
    notification?.caseId,
  ].map((value) => String(value || '')).join('|');
}

function readNotificationControls(workspaceId) {
  try {
    const raw = localStorage.getItem(getNotificationControlsKey(workspaceId));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [],
      snoozed: parsed.snoozed && typeof parsed.snoozed === 'object' ? parsed.snoozed : {},
    };
  } catch {
    return { dismissed: [], snoozed: {} };
  }
}

function writeNotificationControls(workspaceId, controls) {
  try {
    localStorage.setItem(getNotificationControlsKey(workspaceId), JSON.stringify({
      dismissed: Array.isArray(controls.dismissed) ? controls.dismissed : [],
      snoozed: controls.snoozed && typeof controls.snoozed === 'object' ? controls.snoozed : {},
    }));
  } catch {
    // Non-critical: notification controls should never block the main header.
  }
}

function getNotificationSnoozeUntil(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export default function AppHeader({ onMobileDrawerToggle }) {
  const { cases } = useCases();
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const displaySettings = useDisplaySettings();
  const location = useLocation();
  const { density, toggle } = useFieldDensity();
  const { hidden: sensitiveHidden, toggle: toggleSensitiveMode } = useSensitiveMode();
  const { canInstall, install } = useInstallPrompt();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationControls, setNotificationControls] = useState({ dismissed: [], snoozed: {} });
  const [showBell, setShowBell] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [lastLoaded, setLastLoaded] = useState(null);
  const searchRef = useRef(null);
  const bellRef = useRef(null);
  const workspaceId = String(currentWorkspace?.id || '').trim();
  const showDensityToggle = location.pathname === '/cases';

  useEffect(() => {
    setNotificationControls(readNotificationControls(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const results = (Array.isArray(cases) ? cases : [])
      .filter((c) => {
        const searchable = [
          c.caseNumber, c.caseYear, c.plaintiffName,
          c.clientName, c.defendantName, c.court,
          getCaseSessionResult(c), getCaseTitle(c),
        ].join(' ').toLowerCase();
        return searchable.includes(q);
      })
      .slice(0, 8);

    setSearchResults(results);
    setShowResults(true);
  }, [searchQuery, cases]);

  useEffect(() => {
    const handler = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!workspaceId || !Array.isArray(cases) || cases.length === 0) {
      setNotifications([]);
      return;
    }

    setLoadingNotifs(true);
    try {
      const [tasks, judgments] = await Promise.all([
        storage.listTasks(workspaceId, { limit: 300 }).catch(() => []),
        storage.listJudgments(workspaceId, { limit: 100 }).catch(() => []),
      ]);
      const notifs = buildNotifications(cases, tasks, judgments, displaySettings.caseNumberDisplayOrder);
      setNotifications(notifs);
      setLastLoaded(new Date());
    } finally {
      setLoadingNotifs(false);
    }
  }, [workspaceId, cases, displaySettings.caseNumberDisplayOrder]);

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, [workspaceId, cases.length, loadNotifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications().catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowBell(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user?.displayName || user?.email || 'م')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const visibleNotifications = useMemo(() => {
    const dismissed = new Set(Array.isArray(notificationControls.dismissed) ? notificationControls.dismissed : []);
    const snoozed = notificationControls.snoozed && typeof notificationControls.snoozed === 'object'
      ? notificationControls.snoozed
      : {};
    const now = new Date();

    return notifications.filter((notification) => {
      const signature = getNotificationSignature(notification);
      if (dismissed.has(signature)) return false;

      const snooze = snoozed[notification.id];
      if (!snooze || snooze.signature !== signature || !snooze.until) return true;

      return new Date(snooze.until) <= now;
    });
  }, [notifications, notificationControls]);

  const criticalNotifications = visibleNotifications.filter((n) => n.priority === 1);
  const importantNotifications = visibleNotifications.filter((n) => n.priority === 2);

  const persistNotificationControls = useCallback((updater) => {
    setNotificationControls((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      writeNotificationControls(workspaceId, next);
      return next;
    });
  }, [workspaceId]);

  const dismissNotification = useCallback((notification) => {
    persistNotificationControls((previous) => {
      const snoozed = { ...(previous.snoozed || {}) };
      delete snoozed[notification.id];
      return {
        dismissed: Array.from(new Set([...(previous.dismissed || []), getNotificationSignature(notification)])),
        snoozed,
      };
    });
  }, [persistNotificationControls]);

  const snoozeNotification = useCallback((notification, hours) => {
    persistNotificationControls((previous) => ({
      dismissed: previous.dismissed || [],
      snoozed: {
        ...(previous.snoozed || {}),
        [notification.id]: {
          signature: getNotificationSignature(notification),
          until: getNotificationSnoozeUntil(hours),
        },
      },
    }));
  }, [persistNotificationControls]);

  const dismissVisibleNotifications = useCallback(() => {
    persistNotificationControls((previous) => {
      const dismissed = new Set(previous.dismissed || []);
      const snoozed = { ...(previous.snoozed || {}) };

      visibleNotifications.forEach((notification) => {
        dismissed.add(getNotificationSignature(notification));
        delete snoozed[notification.id];
      });

      return { dismissed: Array.from(dismissed), snoozed };
    });
  }, [persistNotificationControls, visibleNotifications]);

  const handleBellClick = () => {
    setShowBell((state) => {
      const next = !state;
      if (next) loadNotifications().catch(() => {});
      return next;
    });
  };

  return (
    <header className="app-header" style={{
      height: 56,
      background: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 200,
      direction: 'rtl',
    }}>
      {/* Mobile drawer hamburger button (mobile only, RTL, minimal) */}
      <button
        onClick={onMobileDrawerToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          fontSize: 28,
          color: '#64748b',
          padding: 8,
          marginLeft: 8,
          cursor: 'pointer',
          borderRadius: 8,
          boxShadow: 'none',
          // Only show on mobile screens
          '@media (min-width: 900px)': { display: 'none' },
        }}
        aria-label="فتح القائمة الجانبية"
        className="mobile-drawer-toggle"
      >
        <span style={{ fontSize: 28 }}>☰</span>
      </button>
      <div className="app-header-logo" style={{ display: 'flex', alignItems: 'center', minWidth: '220px', textDecoration: 'none' }}>
        <img src="/images/logo.png" alt="LawBase Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))' }} loading="lazy" />
      </div>

      <div className="app-header-search" ref={searchRef} style={{ flex: 1, maxWidth: 500, position: 'relative', margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: 16, pointerEvents: 'none'
          }}>
            🔍
          </span>
          <input
            className="form-input"
            placeholder="بحث سريع في كل شيء... (رقم القضية، اسم الموكل، المحكمة)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            style={{
              paddingRight: 38,
              fontSize: 14,
              background: '#f8fafc',
              border: '1.5px solid var(--border)',
            }}
          />
        </div>

        {showResults && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%', right: 0, left: 0,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 300,
            maxHeight: 400,
            overflowY: 'auto',
            marginTop: 4,
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: 11, color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-light)'
            }}>
              {searchResults.length} نتيجة — اضغط على القضية لفتحها
            </div>
            {searchResults.map((c) => {
              const num = formatCaseNumber(c.caseNumber, c.caseYear, { displayOrder: displaySettings.caseNumberDisplayOrder });
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    openCasePanel(c.id);
                    setSearchQuery('');
                    setShowResults(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <span style={{
                        background: 'var(--primary)', color: 'white',
                        padding: '2px 8px', borderRadius: 12,
                        fontSize: 12, fontWeight: 800, marginLeft: 8,
                        filter: sensitiveHidden ? 'blur(4px)' : 'none',
                        userSelect: sensitiveHidden ? 'none' : 'text',
                      }}>
                        {num}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          filter: sensitiveHidden ? 'blur(4px)' : 'none',
                          userSelect: sensitiveHidden ? 'none' : 'text',
                        }}
                      >
                        {c.plaintiffName || c.clientName || '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.court || ''}
                    </span>
                  </div>
                  {getCaseSessionResult(c) && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                      آخر قرار: {getCaseSessionResult(c)}
                    </div>
                  )}
                </div>
              );
            })}
            {searchResults.length === 8 && (
              <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                عرض أول 8 نتائج — دقق البحث لنتائج أكثر
              </div>
            )}
          </div>
        )}

        {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, left: 0,
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '16px',
            textAlign: 'center', color: 'var(--text-muted)',
            fontSize: 13, marginTop: 4, zIndex: 300,
            boxShadow: 'var(--shadow-md)'
          }}>
            لا توجد نتائج لـ "{searchQuery}"
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
        {canInstall && (
          <button
            onClick={install}
            style={{
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              padding: '6px 10px',
              color: 'white',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="تثبيت التطبيق"
          >
            📲 تثبيت
          </button>
        )}

        {showDensityToggle && (
          <button
            onClick={toggle}
            style={{
              background: density === FIELD_DENSITY.PRO ? 'var(--primary-light)' : 'none',
              border: density === FIELD_DENSITY.PRO ? '1px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              padding: '6px 10px',
              color: density === FIELD_DENSITY.PRO ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            title={density === FIELD_DENSITY.BASIC ? 'تفعيل الوضع الاحترافي' : 'تفعيل الوضع الأساسي'}
            aria-label={density === FIELD_DENSITY.BASIC ? 'تفعيل الوضع الاحترافي' : 'تفعيل الوضع الأساسي'}
          >
            {density === FIELD_DENSITY.BASIC ? '⚙️ احترافي' : '🧾 أساسي'}
          </button>
        )}

        <button
          onClick={toggleSensitiveMode}
          style={{
            background: sensitiveHidden ? 'var(--primary-light)' : 'none',
            border: sensitiveHidden ? '1px solid var(--primary)' : '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            padding: '5px 8px',
            color: sensitiveHidden ? 'var(--primary)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
          title={sensitiveHidden ? 'إظهار البيانات الحساسة' : 'إخفاء البيانات الحساسة'}
          aria-label={sensitiveHidden ? 'إظهار البيانات الحساسة' : 'إخفاء البيانات الحساسة'}
        >
          {sensitiveHidden ? '🙈' : '👁️'}
        </button>

        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={handleBellClick}
            style={{
              background: showBell ? 'var(--primary-light)' : 'none',
              border: showBell ? '1px solid var(--primary)' : '1px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 20,
              padding: '4px 8px',
              color: criticalNotifications.length > 0 ? '#dc2626' : 'var(--text-secondary)',
              position: 'relative',
              transition: 'all 0.15s',
            }}
            title="الإشعارات"
          >
            {criticalNotifications.length > 0 ? '🔔' : '🔕'}
            {visibleNotifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: -5,
                left: -5,
                background: criticalNotifications.length > 0 ? '#dc2626' : 'var(--primary)',
                color: 'white',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                animation: criticalNotifications.length > 0 ? 'pulse 2s infinite' : 'none',
              }}>
                {visibleNotifications.length > 9 ? '9+' : visibleNotifications.length}
              </span>
            )}
          </button>

          {showBell && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              width: 380,
              maxHeight: 520,
              overflowY: 'auto',
              zIndex: 300,
              direction: 'rtl',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                background: 'white',
                zIndex: 1,
              }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  🔔 الإشعارات
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {loadingNotifs && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ⟳ جاري التحديث
                    </span>
                  )}
                  <button
                    onClick={() => loadNotifications().catch(() => {})}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--primary)' }}
                    title="تحديث"
                  >
                    🔄
                  </button>
                  {visibleNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={dismissVisibleNotifications}
                      style={{
                        background: '#fff5f5',
                        border: '1px solid #fecaca',
                        borderRadius: 999,
                        color: '#b91c1c',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 8px',
                        fontFamily: 'Cairo',
                      }}
                      title="حذف كل التنبيهات الظاهرة"
                    >
                      حذف الظاهرة
                    </button>
                  )}
                  {visibleNotifications.length > 0 && (
                    <span style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {visibleNotifications.length}
                    </span>
                  )}
                </div>
              </div>

              {visibleNotifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>كل شيء على ما يرام</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>لا توجد تنبيهات</div>
                  {lastLoaded && (
                    <div style={{ fontSize: 10, marginTop: 8, color: 'var(--text-muted)' }}>
                      آخر تحديث: {lastLoaded.toLocaleTimeString('ar-EG')}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {criticalNotifications.length > 0 && (
                    <div>
                      <div style={{
                        padding: '6px 16px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#dc2626',
                        background: '#fff5f5',
                        borderBottom: '1px solid #fee2e2',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>🚨 عاجل جداً</span>
                        <span>{criticalNotifications.length}</span>
                      </div>
                      {criticalNotifications.map((n) => (
                        <NotifItem
                          key={n.id}
                          notif={n}
                          onClose={() => setShowBell(false)}
                          onDismiss={dismissNotification}
                          onSnooze={snoozeNotification}
                          sensitiveHidden={sensitiveHidden}
                        />
                      ))}
                    </div>
                  )}

                  {importantNotifications.length > 0 && (
                    <div>
                      <div style={{
                        padding: '6px 16px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#d97706',
                        background: '#fffbeb',
                        borderBottom: '1px solid #fef3c7',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>⚠️ مهم</span>
                        <span>{importantNotifications.length}</span>
                      </div>
                      {importantNotifications.map((n) => (
                        <NotifItem
                          key={n.id}
                          notif={n}
                          onClose={() => setShowBell(false)}
                          onDismiss={dismissNotification}
                          onSnooze={snoozeNotification}
                          sensitiveHidden={sensitiveHidden}
                        />
                      ))}
                    </div>
                  )}

                  <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    position: 'sticky',
                    bottom: 0,
                    background: 'white',
                  }}>
                    {lastLoaded && `آخر تحديث: ${lastLoaded.toLocaleTimeString('ar-EG')}`}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu((s) => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 20, padding: '4px 12px 4px 8px',
              cursor: 'pointer', fontFamily: 'Cairo'
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800
            }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.displayName || user?.email?.split('@')[0] || 'المستشار'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▾</span>
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0,
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', marginTop: 4,
              minWidth: 180, zIndex: 300,
              boxShadow: 'var(--shadow-md)', direction: 'rtl'
            }}>
              <button type="button" className="nav-item" onClick={signOut} style={{ width: '100%', margin: 0, borderRadius: 'var(--radius-md)' }}>
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotifItem({ notif, onClose, onDismiss, onSnooze, sensitiveHidden = false }) {
  const typeColors = {
    overdue: { border: '#dc2626', bg: '#fff5f5' },
    urgent_task: { border: '#ea580c', bg: '#fff7ed' },
    appeal_deadline: { border: '#7c3aed', bg: '#faf5ff' },
    suspension: { border: '#dc2626', bg: '#fff5f5' },
    today_session: { border: 'var(--primary)', bg: 'var(--primary-light)' },
    tomorrow_session: { border: '#0284c7', bg: '#eff6ff' },
  };

  const colors = typeColors[notif.type] || { border: 'var(--border)', bg: 'white' };

  return (
    <div
      onClick={() => {
        if (notif.caseId) {
          openCasePanel(notif.caseId);
          onClose();
        }
      }}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-light)',
        borderRight: `3px solid ${colors.border}`,
        background: colors.bg,
        cursor: notif.caseId ? 'pointer' : 'default',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        transition: 'opacity 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{notif.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ filter: sensitiveHidden ? 'blur(4px)' : 'none', userSelect: sensitiveHidden ? 'none' : 'text' }}>
          {notif.title}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          {notif.subtitle}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSnooze?.(notif, 3);
            }}
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              fontFamily: 'Cairo',
            }}
          >
            غفوة ٣ ساعات
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSnooze?.(notif, 24);
            }}
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              fontFamily: 'Cairo',
            }}
          >
            غفوة يوم
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDismiss?.(notif);
            }}
            style={{
              background: '#fff5f5',
              border: '1px solid #fecaca',
              borderRadius: 999,
              color: '#b91c1c',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              fontFamily: 'Cairo',
            }}
          >
            حذف
          </button>
        </div>
      </div>
      {notif.caseId && (
        <span style={{ fontSize: 11, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>
          فتح ←
        </span>
      )}
    </div>
  );
}
