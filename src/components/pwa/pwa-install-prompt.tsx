'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle, Sparkles, MoreVertical, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // Check if dismissed previously in this session
    const wasDismissed = sessionStorage.getItem('dakhni_pwa_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // Detect in-app webviews (Instagram, Facebook, Twitter, WhatsApp browser)
    const inApp = /fban|fbav|instagram|threads|line|micromessenger|twitter/.test(ua);
    setIsInAppBrowser(inApp);

    // Android / Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!wasDismissed) {
        setShowBanner(true);
      }
    };

    // Show automatic banner after 3 seconds on iOS if not dismissed
    if (isIosDevice && !wasDismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Custom event listener triggered by "Install Mobile App" button anywhere
    const handleOpenInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt().then(() => {
          return deferredPrompt.userChoice;
        }).then((choice) => {
          if (choice.outcome === 'accepted') {
            setShowBanner(false);
            setDeferredPrompt(null);
          }
        }).catch(() => {
          setShowAndroidGuide(true);
        });
      } else if (isIosDevice) {
        setShowIosGuide(true);
      } else {
        setShowAndroidGuide(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleOpenInstall);

    // Show banner on Android if deferred prompt is already available
    if (deferredPrompt && !wasDismissed) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleOpenInstall);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowBanner(false);
          setDeferredPrompt(null);
        }
      } catch {
        setShowAndroidGuide(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      setShowAndroidGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('dakhni_pwa_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Bottom App Install Banner on Mobile */}
      {showBanner && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:max-w-md md:left-auto md:right-6 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#111111] text-white p-4 rounded-xl shadow-2xl border border-neutral-800 flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              {/* Mini App Icon */}
              <div className="w-11 h-11 rounded-lg bg-[#1a1a1a] border border-neutral-700 flex items-center justify-center shrink-0 relative overflow-hidden">
                <div className="w-full h-1 bg-[#D71920] absolute top-0 left-0 right-0"></div>
                <span className="font-display font-black text-sm text-white tracking-wider">DV</span>
              </div>
              <div>
                <h4 className="text-xs font-bold font-display text-white flex items-center gap-1.5">
                  Dakhni Verse App
                  <span className="bg-[#D71920]/20 text-[#D71920] text-[9px] px-1.5 py-0.2 rounded font-bold border border-[#D71920]/30">
                    PWA
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                  Install on home screen for full-screen studio experience
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="text-xs bg-[#D71920] hover:bg-[#b0141a] text-white font-semibold h-8 px-3 shadow-md"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Install
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-6 text-neutral-900 space-y-4 shadow-2xl border border-neutral-200 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#111111] text-[#D71920] flex items-center justify-center font-display font-black text-xs">
                  DV
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-neutral-950">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-neutral-500">Run full-screen without Safari browser bars</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isInAppBrowser && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <Globe className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Open in Safari:</span> You are currently viewing inside an in-app browser. Tap the menu and choose <span className="font-semibold">Open in Safari</span> to install to your home screen.
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs text-neutral-700">
              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  1
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Tap the Share button</span>
                  In Safari&apos;s bottom toolbar, tap the Share icon (<Share className="h-3 w-3 inline text-blue-600 mb-0.5" />).
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  2
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Select &ldquo;Add to Home Screen&rdquo;</span>
                  Scroll down the options list and tap <span className="font-semibold text-neutral-900">&ldquo;Add to Home Screen&rdquo;</span> (<PlusSquare className="h-3 w-3 inline text-neutral-700 mb-0.5" />).
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#D71920] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  3
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Confirm &amp; Launch</span>
                  Tap <span className="font-semibold text-neutral-900">&ldquo;Add&rdquo;</span> in the top right. Open Dakhni Verse directly from your home screen!
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-medium mt-2"
            >
              Got It
            </Button>
          </div>
        </div>
      )}

      {/* Android & Desktop Chrome Installation Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-6 text-neutral-900 space-y-4 shadow-2xl border border-neutral-200 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#111111] text-[#D71920] flex items-center justify-center font-display font-black text-xs">
                  DV
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-neutral-950">Install Dakhni Verse</h3>
                  <p className="text-[11px] text-neutral-500">Add to your device as a standalone app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isInAppBrowser && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <Globe className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Open in Chrome:</span> Tap the menu (<MoreVertical className="h-3 w-3 inline" />) and choose <span className="font-semibold">Open in Chrome</span> to install.
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs text-neutral-700">
              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  1
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Tap the Browser Menu</span>
                  In Chrome or Edge, tap the 3-dots menu (<MoreVertical className="h-3 w-3 inline text-neutral-800" />) in the top-right corner.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  2
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;</span>
                  Look for <span className="font-semibold text-neutral-900">&ldquo;Install app&rdquo;</span> or <span className="font-semibold text-neutral-900">&ldquo;Add to Home screen&rdquo;</span>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
                <div className="w-6 h-6 rounded-full bg-[#D71920] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                  3
                </div>
                <div>
                  <span className="font-semibold text-neutral-900 block">Launch App</span>
                  Confirm the prompt. Dakhni Verse will install with the icon and open full-screen!
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowAndroidGuide(false)}
              className="w-full text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-medium mt-2"
            >
              Got It
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Trigger function that other components (like sidebar or header) can call to prompt installation
 */
export function triggerPwaInstall() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install'));
  }
}
