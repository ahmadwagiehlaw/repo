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
  { path: '/archive', label: 'الأرشيف', icon: '🗦' },
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
    storage.getWorkspaceSettings(currentWorkspace.id).then((s) => {
      if (s?.brandName) setBrandName(s.brandName);
      if (s?.brandSub) setBrandSub(s.brandSub);
    }).catch(() => {});
  }, [currentWorkspace?.id]);

  const navGroups = [
    {
      items: [
        { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
        { path: '/cases', label: 'القضايا', icon: '📁' },
      ]
    },
    {
      items: [
        { path: '/sessions', label: 'الجلسات', icon: '📅' },
        { path: '/judgments', label: 'الأحكام', icon: '⚖️' },
        { path: '/sessions-log', label: 'أجندة الجلسات', icon: '🗓️' },
      ]
    },
    {
      items: [
        { path: '/tasks', label: 'المهام', icon: '✓' },
        { path: '/archive', label: 'الأرشيف', icon: '🗦' },
        { path: '/templates', label: 'النماذج', icon: '📝' },
      ]
    },
    {
      items: [
        { path: '/settings', label: 'الإعدادات', icon: '⚙️' },
      ]
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
      <div style={{
        padding: collapsed ? '16px 8px' : '20px 16px',
        borderBottom: '1px solid var(--border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 72,
      }}>
        <img
          src="/images/icon-192.png"
          alt="LawBase"
          style={{
            width: collapsed ? 40 : 52,
            height: collapsed ? 40 : 52,
            objectFit: 'contain',
            borderRadius: 10,
            flexShrink: 0,
          }}
        />
      </div>

      {!collapsed && (
        <div className="sidebar-brand" style={{
          padding: '16px 12px 8px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '8px',
        }}>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--color-text)',
            fontFamily: 'Cairo',
            lineHeight: 1.3,
          }}>
            {brandName}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            fontFamily: 'Cairo',
            marginTop: 2,
          }}>
            {brandSub}
          </div>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', marginTop: 8 }}>
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {groupIdx > 0 && (
              <div style={{
                height: 1,
                background: 'var(--bg-secondary, #f1f5f9)',
                margin: '6px 4px',
              }} />
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
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#b45309' : 'var(--text-secondary, #64748b)',
                  background: isActive ? '#fff8ec' : 'transparent',
                  borderRight: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                  transition: 'all 0.15s',
                })}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
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
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '9px 12px',
              borderRadius: 8,
              marginTop: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              color: isActive ? '#a78bfa' : '#7c3aed',
              background: isActive ? '#ede9fe' : '#f5f3ff',
              borderRight: '3px solid transparent',
            })}
          >
            <span style={{ fontSize: 15 }}>👑</span>
            {!collapsed && <span>لوحة الأدمن</span>}
          </NavLink>
        )}
      </nav>

      {!collapsed && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
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
          }}>
            {(currentUser?.displayName || currentUser?.email || 'م')
              .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: 'var(--text-primary, #0f172a)',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {currentUser?.displayName || 'مستخدم'}
            </div>
            <div style={{
              color: 'var(--text-muted, #94a3b8)',
              fontSize: 10,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
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
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary, #64748b)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'; }}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        <span>{collapsed ? '⇥' : '⇤'}</span>
        {!collapsed && <span>طي القائمة</span>}
      </button>
    </aside>
  );
}
