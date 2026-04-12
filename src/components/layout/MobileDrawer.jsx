import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';

export default function MobileDrawer({ open, onClose, navItems }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div
        className="mobile-drawer-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.32)',
          zIndex: 200,
        }}
      />
      <aside
        className="mobile-drawer"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: 260,
          maxWidth: '80vw',
          background: 'white',
          boxShadow: '0 0 24px 0 rgba(0,0,0,0.10)',
          zIndex: 201,
          direction: 'rtl',
          fontFamily: 'Cairo',
          transition: 'transform 0.2s',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            color: '#64748b',
            padding: 12,
            cursor: 'pointer',
            float: 'left',
          }}
          aria-label="إغلاق القائمة"
        >
          ×
        </button>
        <nav style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: isActive ? '#FF8C00' : '#334155',
                fontWeight: isActive ? 700 : 500,
                fontSize: 16,
                padding: '8px 16px',
                borderRadius: 8,
                background: isActive ? '#fef3c7' : 'none',
                fontFamily: 'Cairo',
              })}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
