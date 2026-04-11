import { useState, useEffect } from 'react';

/**
 * Batch 2.4 — PWA Install Prompt Hook
 * Manages beforeinstallprompt event for Windows + Android
 */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return false;
    const { outcome } = await prompt.prompt();
    if (outcome === 'accepted') setIsInstalled(true);
    setPrompt(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: !!prompt && !isInstalled,
    isInstalled,
    install,
  };
}

export default useInstallPrompt;
