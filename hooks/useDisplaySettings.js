import { useEffect, useState } from 'react';
import { getDisplaySettings } from '@/utils/caseUtils.js';

const DISPLAY_SETTINGS_EVENT = 'lawbase:display-settings-changed';

export function useDisplaySettings() {
  const [settings, setSettings] = useState(() => getDisplaySettings());

  useEffect(() => {
    const handleChange = () => setSettings(getDisplaySettings());
    window.addEventListener(DISPLAY_SETTINGS_EVENT, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(DISPLAY_SETTINGS_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return settings;
}