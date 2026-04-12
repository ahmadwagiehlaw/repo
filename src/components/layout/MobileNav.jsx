import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'الرئيسية' },
  { path: '/cases', icon: '📁', label: 'القضايا' },
  { path: '/sessions', icon: '📅', label: 'الجلسات' },
  { path: '/tasks', icon: '✓', label: 'المهام' },
  { path: '/settings', icon: '⚙️', label: 'المزيد' },
];

export default function MobileNav() {
  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'none',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        zIndex: 100,
        direction: 'rtl',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            padding: '8px',
            color: isActive ? '#FF8C00' : '#64748b',
            fontSize: '10px',
            fontFamily: 'Cairo',
            minWidth: '48px',
            minHeight: '44px',
            justifyContent: 'center',
          })}
        >
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
