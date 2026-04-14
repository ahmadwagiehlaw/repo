import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin.js';
import subscriptionManager from '@/services/SubscriptionManager.js';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { path: '/cases', label: 'القضايا', icon: '📁' },
  { path: '/sessions', label: 'الجلسات', icon: '📅' },
  { path: '/judgments', label: 'الأحكام', icon: '⚖️' },
  { path: '/sessions-log', label: 'أجندة الجلسات', icon: '🗓️' },
  { path: '/tasks', label: 'المهام', icon: '✓' },
  { path: '/archive', label: 'الأرشيف', icon: '📦' },
  { path: '/templates', label: 'النماذج', icon: '📝' },
  { path: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function Sidebar({ collapsed = false, onToggleCollapse = () => {} }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState('');
  const { user: currentUser, signOut } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { isSuperAdmin } = useSuperAdmin();
  const isPro = ['pro', 'team'].includes(subscriptionManager.plan);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <aside className="card" aria-label="الشريط الجانبي" style={{ width: '100%' }}>
      <div>
        <div style={{ marginBottom: '24px' }}>
          {collapsed ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                width: '46px', height: '46px', 
                backgroundColor: 'var(--primary-light, #f0f9ff)', 
                border: '1px solid var(--primary, #3b82f6)', 
                borderRadius: '12px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
              }}>
                <img src="/images/icon.png" alt="LawBase Icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </div>
            </div>
          ) : (
            <div style={{ 
              fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', 
              letterSpacing: '0.5px', paddingRight: '4px' 
            }}>
              إدارة النظام
            </div>
          )}
        </div>


        <div className="form-group workspace-switcher">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-expanded={showDropdown}
            title={currentWorkspace?.name || 'مساحة العمل'}
          >
            {currentWorkspace?.name ? `${currentWorkspace.name} • مساحة العمل` : 'مساحة العمل'}
          </button>

          {showDropdown && workspaces.length > 1 ? (
            <div className="card" role="menu">
              {workspaces.map((workspaceItem) => (
                <button
                  key={workspaceItem.id}
                  type="button"
                  className="nav-item"
                  onClick={async () => {
                    await switchWorkspace(workspaceItem.id);
                    setToast(`تم التبديل إلى: ${workspaceItem.name}`);
                    setShowDropdown(false);
                  }}
                >
                  <span>{workspaceItem.name}</span>
                  {workspaceItem.id === currentWorkspace?.id ? <span>✓</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <nav>
          {NAV_ITEMS
            .filter(item => !(item.highlight && isPro))
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : ''}
                style={item.highlight ? {
                  background: 'linear-gradient(135deg, #f59e0b20, #f59e0b10)',
                  border: '1px solid #f59e0b40',
                  borderRadius: 8,
                  margin: '4px 0',
                  color: '#d97706',
                  fontWeight: 800,
                } : {}}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))
          }
          {isSuperAdmin && (
            <NavLink
              to="/super-admin"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? 'لوحة الأدمن' : ''}
              style={{
                background: 'linear-gradient(135deg, #7c3aed20, #7c3aed10)',
                border: '1px solid #7c3aed40',
                borderRadius: 8,
                margin: '4px 0',
                color: '#7c3aed',
                fontWeight: 800,
              }}
            >
              <span aria-hidden="true">👑</span>
              <span className="nav-label">لوحة الأدمن</span>
            </NavLink>
          )}
        </nav>
      </div>

      <div className="card">
        <p className="case-number" title={currentUser?.displayName || 'مستخدم'}>
          {collapsed ? '👤' : (currentUser?.displayName || 'مستخدم')}
        </p>
        {!collapsed && <p className="case-meta">{currentUser?.email || ''}</p>}
        <button type="button" className="btn-secondary" onClick={signOut}>
          {collapsed ? '⬋' : 'تسجيل الخروج'}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          width: '100%', padding: '16px', background: 'transparent',
          border: 'none', borderTop: '1px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', transition: 'all 0.2s ease', fontFamily: 'Cairo'
        }}
        onMouseEnter={(e) => { 
          e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f8fafc)'; 
          e.currentTarget.style.color = 'var(--primary, #3b82f6)'; 
        }}
        onMouseLeave={(e) => { 
          e.currentTarget.style.backgroundColor = 'transparent'; 
          e.currentTarget.style.color = 'var(--text-muted)'; 
        }}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        {collapsed ? (
          <span style={{ fontSize: '18px' }}>⇥</span>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⇤ طي القائمة
          </span>
        )}
      </button>

      {toast ? <div className="status-badge status-new">{toast}</div> : null}
    </aside>
  );
}
