import { useEffect, useState } from 'react';
import { FIELD_DENSITY } from '@/core/Constants.js';

const STORAGE_KEY = 'lawbase_field_density';
const FIELD_DENSITY_EVENT = 'lawbase:field-density-changed';

export function useFieldDensity() {
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || FIELD_DENSITY.BASIC;
    } catch {
      return FIELD_DENSITY.BASIC;
    }
  });

  const toggle = () => {
    setDensity((prev) => {
      const next = prev === FIELD_DENSITY.BASIC
        ? FIELD_DENSITY.PRO
        : FIELD_DENSITY.BASIC;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      window.dispatchEvent(new CustomEvent(FIELD_DENSITY_EVENT, { detail: { density: next } }));
      return next;
    });
  };

  const isPro = density === FIELD_DENSITY.PRO;

  useEffect(() => {
    const handleDensityChange = (event) => {
      const next = String(event?.detail?.density || '').trim();
      if (next === FIELD_DENSITY.BASIC || next === FIELD_DENSITY.PRO) {
        setDensity(next);
      }
    };

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const next = String(event.newValue || '').trim();
      if (next === FIELD_DENSITY.BASIC || next === FIELD_DENSITY.PRO) {
        setDensity(next);
      }
    };

    window.addEventListener(FIELD_DENSITY_EVENT, handleDensityChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(FIELD_DENSITY_EVENT, handleDensityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { density, toggle, isPro };
}
