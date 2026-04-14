import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function PortalDropdown({ anchorRef, open, options, value, onSelect, onClose, width = 160 }) {
  const dropdownRef = useRef();
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width || width,
      });
    }
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;
  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        boxShadow: '0 2px 12px 0 #0002',
        padding: '4px 0',
        maxHeight: 260,
        overflowY: 'auto',
      }}
    >
      {options.map((opt) => (
        <div
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            padding: '8px 18px 8px 8px',
            cursor: 'pointer',
            background: value === opt ? 'var(--primary-lightest)' : 'transparent',
            color: value === opt ? 'var(--primary)' : '#222',
            fontWeight: value === opt ? 700 : 400,
            fontSize: 14,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.background = value === opt ? 'var(--primary-lightest)' : 'transparent')}
        >
          {opt}
        </div>
      ))}
    </div>,
    document.body
  );
}
