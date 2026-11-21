import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export const InstallPwaPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone || isDismissed || !deferredPrompt) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-50 max-w-sm bg-slate-900/95 border border-bakwas-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-bakwas-500 to-cyan-400 p-0.5 flex-shrink-0">
          <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-bakwas-400" />
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate">Install BAKWAS App</h4>
          <p className="text-[11px] text-slate-400 truncate">Add to phone home screen</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-gradient-to-r from-bakwas-500 to-teal-400 hover:from-bakwas-600 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-bakwas-500/20 flex items-center gap-1 transition-transform active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
