let handlers = {
  toast: null,
  confirm: null,
  prompt: null,
};

let alertBridgeInstalled = false;

export function registerBrowserFeedbackHandlers(nextHandlers = {}) {
  handlers = {
    toast: typeof nextHandlers.toast === 'function' ? nextHandlers.toast : null,
    confirm: typeof nextHandlers.confirm === 'function' ? nextHandlers.confirm : null,
    prompt: typeof nextHandlers.prompt === 'function' ? nextHandlers.prompt : null,
  };
}

export function showToast(message, tone = 'info', duration = 3200) {
  const text = String(message || '').trim();
  if (!text) return;

  if (handlers.toast) {
    handlers.toast({ message: text, tone, duration });
    return;
  }

  console.log(`[${tone}] ${text}`);
}

export function installBrowserAlertBridge() {
  if (alertBridgeInstalled || typeof window === 'undefined') return;

  const originalAlert = window.alert;
  window.alert = (message) => {
    showToast(message, 'warning');
  };

  window.__lbOriginalAlert = originalAlert;
  alertBridgeInstalled = true;
}

export async function confirmDialog(message, options = {}) {
  const text = String(message || '').trim();
  const title = String(options.title || 'تأكيد الإجراء').trim();
  const confirmLabel = String(options.confirmLabel || 'تأكيد').trim();
  const cancelLabel = String(options.cancelLabel || 'إلغاء').trim();

  if (handlers.confirm) {
    return handlers.confirm({ text, title, confirmLabel, cancelLabel, danger: !!options.danger });
  }

  return window.confirm(text);
}

export async function promptDialog(message, defaultValue = '', options = {}) {
  const text = String(message || '').trim();
  const title = String(options.title || 'إدخال قيمة').trim();
  const confirmLabel = String(options.confirmLabel || 'متابعة').trim();
  const cancelLabel = String(options.cancelLabel || 'إلغاء').trim();

  if (handlers.prompt) {
    return handlers.prompt({
      text,
      title,
      confirmLabel,
      cancelLabel,
      defaultValue: String(defaultValue || ''),
      placeholder: String(options.placeholder || ''),
    });
  }

  return window.prompt(text, defaultValue);
}
