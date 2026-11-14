/**
 * Adding Deegee to the home screen.
 *
 * Android fires beforeinstallprompt and lets us install in one tap. iOS never does: the only route is
 * Safari's share sheet, so there we explain it instead of pretending there's a button. Either way this
 * is asked once and remembered, because an install banner that keeps coming back is an advert.
 */
import { useCallback, useEffect, useState } from 'react';
import type { InstallState } from './install';

export type { InstallState };

const DISMISSED = 'deegee.install.dismissed';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let saved: InstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's own bar away; we ask in our own words, in our own place
    saved = e as InstallPromptEvent;
    window.dispatchEvent(new Event('deegee:installable'));
  });
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

const isIosSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  return iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false; // private browsing: ask again rather than never
  }
};

export function useInstall(): InstallState {
  const [ready, setReady] = useState(() => saved !== null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const installed = isStandalone();

  useEffect(() => {
    const onReady = () => setReady(true);
    const onInstalled = () => setReady(false);
    window.addEventListener('deegee:installable', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('deegee:installable', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // Not remembering it is better than failing to close it.
    }
  }, []);

  const install = useCallback(() => {
    const prompt = saved;
    if (!prompt) return;
    saved = null;
    setReady(false);
    void prompt.prompt().catch(() => {});
  }, []);

  const hidden = installed || dismissed;
  return {
    canInstall: !hidden && ready,
    showIosHint: !hidden && !ready && isIosSafari(),
    installed,
    install,
    dismiss,
  };
}
