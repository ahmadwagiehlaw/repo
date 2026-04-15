import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin.js';
import storage from '@/data/Storage.js';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { path: '/cases', label: 'القضايا', icon: '📁' },
  { path: '/sessions', label: 'الجلسات', icon: '📅' },
  { path: '/judgments', label: 'الأحكام', icon: '⚖️' },
  { path: '/sessions-log', label: 'أجندة الجلسات', icon: '🗓️' },
  { path: '/tasks', label: 'المهام', icon: '✓' },
  { path: '/archive', label: 'الأرشيف', icon: '🗄️' },
  { path: '/templates', label: 'النماذج', icon: '📝' },
  { path: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function Sidebar({ collapsed = false, onToggleCollapse = () => {} }) {
  const { user: currentUser, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();
  const [brandName, setBrandName] = React.useState('LawBase');
  const [brandSub, setBrandSub] = React.useState('نظام إدارة القضايا');

  React.useEffect(() => {
    if (!currentWorkspace?.id) return;
    storage.getWorkspaceSettings(currentWorkspace.id).then((settings) => {
      if (settings?.brandName) setBrandName(settings.brandName);
      if (settings?.brandSub) setBrandSub(settings.brandSub);
    }).catch(() => {});
  }, [currentWorkspace?.id]);

  const navGroups = [
    {
      items: [
        { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
        { path: '/cases', label: 'القضايا', icon: '📁' },
      ],
    },
    {
      items: [
        { path: '/sessions', label: 'الجلسات', icon: '📅' },
        { path: '/judgments', label: 'الأحكام', icon: '⚖️' },
        { path: '/sessions-log', label: 'أجندة الجلسات', icon: '🗓️' },
      ],
    },
    {
      items: [
        { path: '/tasks', label: 'المهام', icon: '✓' },
        { path: '/archive', label: 'الأرشيف', icon: '🗄️' },
        { path: '/templates', label: 'النماذج', icon: '📝' },
      ],
    },
    {
      items: [
        { path: '/settings', label: 'الإعدادات', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside
      aria-label="الشريط الجانبي"
      style={{
        width: '100%',
        height: '100vh',
        background: 'var(--bg-card, white)',
        borderLeft: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: collapsed ? '16px 8px' : '18px 16px 16px',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 12,
          minHeight: 86,
        }}
      >
        <img
          src="/images/icon-192.png"
          alt="LawBase"
          style={{
            width: collapsed ? 42 : 54,
            height: collapsed ? 42 : 54,
            objectFit: 'contain',
            borderRadius: 10,
            flexShrink: 0,
          }}
        />

        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 19,
                color: 'var(--text-primary, #0f172a)',
                fontFamily: 'Cairo',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {brandName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted, #64748b)',
                fontFamily: 'Cairo',
                marginTop: 4,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {brandSub}
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', marginTop: 4 }}>
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {groupIdx > 0 && (
              <div
                style={{
                  height: 1,
                  background: 'var(--bg-secondary, #f1f5f9)',
                  margin: '8px 4px',
                }}
              />
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                title={collapsed ? item.label : ''}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '12px 0' : '11px 14px',
                  borderRadius: 10,
                  marginBottom: 4,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#b45309' : 'var(--text-secondary, #64748b)',
                  background: isActive ? '#fff8ec' : 'transparent',
                  borderRight: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                  transition: 'all 0.15s',
                })}
              >
                <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {isSuperAdmin && (
          <NavLink
            to="/super-admin"
            title={collapsed ? 'لوحة الأدمن' : ''}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '12px 0' : '11px 14px',
              borderRadius: 10,
              marginTop: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
              color: isActive ? '#7c3aed' : '#7c3aed',
              background: isActive ? '#ede9fe' : '#f5f3ff',
              borderRight: '3px solid transparent',
            })}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>👑</span>
            {!collapsed && <span>لوحة الأدمن</span>}
          </NavLink>
        )}
      </nav>

      {!collapsed && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b45309',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(currentUser?.displayName || currentUser?.email || 'م')
              .split(' ')
              .slice(0, 2)
              .map((word) => word[0])
              .join('')
              .toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: 'var(--text-primary, #0f172a)',
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.displayName || 'مستخدم'}
            </div>
            <div
              style={{
                color: 'var(--text-muted, #94a3b8)',
                fontSize: 10,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.email || ''}
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            style={{
              background: 'none',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 6,
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              fontSize: 11,
              padding: '4px 8px',
              fontFamily: 'Cairo',
            }}
          >
            خروج
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border, #e2e8f0)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          color: 'var(--text-muted, #94a3b8)',
          fontFamily: 'Cairo',
          fontSize: 12,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--text-secondary, #64748b)'; }}
        onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--text-muted, #94a3b8)'; }}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        <span>{collapsed ? '⇥' : '⇤'}</span>
        {!collapsed && <span>طي القائمة</span>}
      </button>
    </aside>
  );
}
