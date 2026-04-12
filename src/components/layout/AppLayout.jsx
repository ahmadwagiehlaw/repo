import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { NAV_ITEMS as SIDEBAR_NAV_ITEMS } from '@/components/layout/Sidebar.jsx';
import AppHeader from '@/components/layout/AppHeader.jsx';
import MobileNav from '@/components/layout/MobileNav.jsx';
import MobileDrawer from '@/components/layout/MobileDrawer.jsx';
import CameraUpload from '@/components/mobile/CameraUpload.jsx';
import AIPanel from '@/components/AIPanel.jsx';
import CaseSidePanel from '@/components/cases/CaseSidePanel.jsx';
import BrowserFeedbackHost from '@/components/ui/BrowserFeedbackHost.jsx';
import { useCases } from '@/contexts/CaseContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function AppLayout() {
  const { loading: casesLoading } = useCases();
  const { loading: workspaceLoading, bootstrapping } = useWorkspace();
  const [collapsed, setCollapsed] = useState(() => (
    localStorage.getItem('lb_sidebar_collapsed') === 'true'
  ));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const anyLoading = casesLoading || workspaceLoading;

  return (
    <div style={{ display: 'flex', direction: 'rtl', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {anyLoading ? <div className="global-loading-bar" /> : null}

      <div className={`desktop-sidebar${collapsed ? ' collapsed' : ''}`}> 
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => {
            const next = !collapsed;
            setCollapsed(next);
            localStorage.setItem('lb_sidebar_collapsed', String(next));
          }}
        />
      </div>

      <main style={{ flex: 1, minWidth: 0, background: 'var(--bg-page)', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', position: 'relative' }}>
        <AppHeader onMobileDrawerToggle={() => setDrawerOpen(true)} />
        <div style={{ padding: '24px' }}>
          {bootstrapping ? (
            <div className="empty-state" style={{ textAlign: 'center' }}>
              جاري تهيئة مساحة العمل...
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} navItems={SIDEBAR_NAV_ITEMS} />
      <MobileNav />
      <CameraUpload />
      <AIPanel />
      <CaseSidePanel />
      <BrowserFeedbackHost />
    </div>
  );
}
