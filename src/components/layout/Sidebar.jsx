import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { path: '/cases', label: 'القضايا', icon: '📁' },
  { path: '/sessions', label: 'الجلسات', icon: '📅' },
  { path: '/judgments', label: 'الأحكام', icon: '⚖️' },
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

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <aside className="card" aria-label="الشريط الجانبي" style={{ width: '100%' }}>
      <div>
        <h2 className="sidebar-logo" title="LawBase">LawBase</h2>

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
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
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
          width: '100%', padding: '12px', background: 'none',
          border: 'none', borderTop: '1px solid var(--border)',
          cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
          fontFamily: 'Cairo'
        }}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        {collapsed ? '←' : '→ طي القائمة'}
      </button>

      {toast ? <div className="status-badge status-new">{toast}</div> : null}
    </aside>
  );
}
