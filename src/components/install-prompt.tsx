'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if device is iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if already installed
    // @ts-ignore
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Listen for Chrome install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowPrompt(true);
      }
    });

    // Show custom prompt for iOS after a short delay if not installed
    if (iOS && !standalone) {
      const timer = setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
        if (!hasSeenPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // It's iOS, user needs to manually use the share menu, so we just dismiss the prompt
      // or optionally show a toast explaining how to do it. Here we just close it for simplicity.
      dismissPrompt();
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-start gap-4 mx-auto max-w-md relative">
        <button 
          onClick={dismissPrompt}
          className="absolute -top-2 -right-2 bg-slate-800 rounded-full p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="bg-slate-800 p-3 rounded-xl">
          <Download className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Installer l'application</h3>
          <p className="text-sm text-slate-400 mb-3">
            {isIOS 
              ? "Installez Pointeuse sur votre iPhone : appuyez sur le bouton Partager puis sur 'Sur l'écran d'accueil'."
              : "Ajoutez l'application à votre écran d'accueil pour une meilleure expérience et un accès hors ligne."}
          </p>
          
          <button 
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {isIOS ? "J'ai compris" : "Installer maintenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
