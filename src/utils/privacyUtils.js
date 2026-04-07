export const SENSITIVE_MODE_KEY = 'lb_hide_sensitive_data';
export const SENSITIVE_MODE_EVENT = 'lawbase:sensitive-mode-changed';

export function isSensitiveModeEnabled() {
  try {
    return localStorage.getItem(SENSITIVE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSensitiveMode(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem(SENSITIVE_MODE_KEY, String(next));
  } catch {
    // ignore storage errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SENSITIVE_MODE_EVENT, { detail: { enabled: next } }));
  }

  return next;
}

export function maskSensitiveText(value, mask = '••••') {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return text || '—';
  return mask;
}

export function maskPartyName(value) {
  return maskSensitiveText(value, '••••••');
}
