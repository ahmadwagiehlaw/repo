import { useEffect, useMemo, useState } from 'react';
import {
  installBrowserAlertBridge,
  registerBrowserFeedbackHandlers,
} from '@/utils/browserFeedback.js';

function buildToastId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function BrowserFeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [dialogState, setDialogState] = useState(null);

  const api = useMemo(() => ({
    toast: ({ message, tone = 'info', duration = 3200 }) => {
      const id = buildToastId();
      const safeDuration = Number(duration) > 0 ? Number(duration) : 3200;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((entry) => entry.id !== id));
      }, safeDuration);
    },
    confirm: ({ text, title, confirmLabel, cancelLabel, danger }) => new Promise((resolve) => {
      setDialogState({
        type: 'confirm',
        title,
        text,
        confirmLabel,
        cancelLabel,
        danger,
        defaultValue: '',
        placeholder: '',
        resolver: resolve,
      });
    }),
    prompt: ({ text, title, confirmLabel, cancelLabel, defaultValue, placeholder }) => new Promise((resolve) => {
      setDialogState({
        type: 'prompt',
        title,
        text,
        confirmLabel,
        cancelLabel,
        danger: false,
        defaultValue,
        placeholder,
        resolver: resolve,
      });
    }),
  }), []);

  useEffect(() => {
    registerBrowserFeedbackHandlers(api);
    installBrowserAlertBridge();
    return () => registerBrowserFeedbackHandlers({});
  }, [api]);

  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (dialogState?.type === 'prompt') {
      setPromptValue(String(dialogState.defaultValue || ''));
    }
  }, [dialogState]);

  const closeConfirm = (value) => {
    if (!dialogState?.resolver) return;
    const resolver = dialogState.resolver;
    setDialogState(null);
    resolver(value);
  };

  const closePrompt = (value) => {
    if (!dialogState?.resolver) return;
    const resolver = dialogState.resolver;
    setDialogState(null);
    resolver(value);
  };

  return (
    <>
      <div className="lb-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`lb-toast lb-toast-${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {dialogState && (
        <div className="lb-dialog-overlay" role="dialog" aria-modal="true">
          <div className="lb-dialog-card">
            <h3 className="lb-dialog-title">{dialogState.title}</h3>
            <div className="lb-dialog-message">{dialogState.text}</div>

            {dialogState.type === 'prompt' && (
              <input
                autoFocus
                className="lb-dialog-input"
                value={promptValue}
                placeholder={dialogState.placeholder || ''}
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    closePrompt(promptValue);
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closePrompt(null);
                  }
                }}
              />
            )}

            <div className="lb-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (dialogState.type === 'prompt' ? closePrompt(null) : closeConfirm(false))}
              >
                {dialogState.cancelLabel}
              </button>
              <button
                type="button"
                className={dialogState.danger ? 'lb-btn-danger' : 'btn-primary'}
                onClick={() => (dialogState.type === 'prompt' ? closePrompt(promptValue) : closeConfirm(true))}
              >
                {dialogState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
