import { useEffect, useState } from 'react';
import { isSensitiveModeEnabled, setSensitiveMode, SENSITIVE_MODE_EVENT } from '@/utils/privacyUtils.js';

export function useSensitiveMode() {
  const [hidden, setHidden] = useState(() => isSensitiveModeEnabled());

  useEffect(() => {
    const handleChange = () => setHidden(isSensitiveModeEnabled());
    window.addEventListener(SENSITIVE_MODE_EVENT, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(SENSITIVE_MODE_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const update = (nextValue) => {
    const next = setSensitiveMode(nextValue);
    setHidden(next);
  };

  const toggle = () => update(!hidden);

  return { hidden, setHidden: update, toggle };
}
