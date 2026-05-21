import React, { useState, useEffect } from 'react';
import { usePwa } from '../../context/PwaContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share, Plus, ChevronRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const InstallPromptBanner = () => {
  const { isInstallable, isStandalone, isIOS, installApp } = usePwa();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('pwa_install_banner_dismissed') === 'true';
    
    // We show the banner if:
    // 1. The app is not running in standalone mode (already installed)
    // 2. It hasn't been dismissed by the user recently
    // 3. It is either installable via Chrome/Android prompt OR it's an iOS device (to guide them)
    if (!isStandalone && !isDismissed && (isInstallable || isIOS)) {
      // Small delay for a premium entry animation after page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isStandalone, isIOS]);

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_banner_dismissed', 'true');
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await installApp();
      if (installed) {
        toast.success("Installation lancée !");
        setShowBanner(false);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="mb-6 w-full"
          >
            <div className="bg-gradient-to-r from-accent-dim/20 to-purple/10 border border-accent/20 rounded-[28px] p-5 relative overflow-hidden shadow-lg flex flex-col sm:flex-row items-center gap-4">
              {/* Background Glow */}
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -top-10 w-24 h-24 bg-purple/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-base/50 text-muted hover:text-primary transition-colors border border-border/20 z-10"
              >
                <X size={14} />
              </button>

              {/* App Icon Glow */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple to-accent flex items-center justify-center shadow-md shadow-accent/15 flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <Smartphone className="w-6 h-6 text-white relative z-10" />
              </div>

              {/* Text Information */}
              <div className="flex-1 text-center sm:text-left pr-4 space-y-1">
                <h3 className="text-sm font-extrabold text-primary flex items-center justify-center sm:justify-start gap-1.5">
                  Installer l'application
                </h3>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Ajoutez Budgetizer à votre écran d'accueil pour un accès instantané et une expérience fluide sans barre de navigation.
                </p>
              </div>

              {/* Install Call to Action */}
              <button
                onClick={handleInstallClick}
                className="bg-accent text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-accent/20 hover:scale-103 active:scale-97 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <Download size={14} />
                {isIOS ? "Installer sur iPhone" : "Installer maintenant"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instruction Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000]"
            />

            {/* Instruction Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[10001] flex justify-center pointer-events-none"
            >
              <div className="bg-surface w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl pointer-events-auto border-t border-border flex flex-col p-6 max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-border/40">
                  <div>
                    <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
                      <Smartphone className="text-accent" size={18} />
                      Ajouter Budgetizer sur iPhone
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5">Suivez ces étapes simples depuis Safari pour l'installer :</p>
                  </div>
                  <button 
                    onClick={() => setShowIOSModal(false)}
                    className="p-1.5 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
                  >
                    <X size={16} className="text-secondary" />
                  </button>
                </div>

                {/* Steps List */}
                <div className="py-6 space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      1
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        Appuyez sur le bouton de partage
                      </p>
                      <p className="text-[11px] text-muted">
                        Cliquez sur l'icône <span className="inline-flex items-center justify-center p-1 bg-surface-2 rounded border border-border mx-0.5"><Share size={12} className="text-accent" /></span> tout en bas ou en haut de votre écran Safari.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      2
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary">
                        Faites défiler vers le bas
                      </p>
                      <p className="text-[11px] text-muted">
                        Faites glisser le menu et sélectionnez l'option <span className="font-semibold text-primary">"Sur l'écran d'accueil"</span> avec l'icône <span className="inline-flex items-center justify-center p-1 bg-surface-2 rounded border border-border mx-0.5"><Plus size={12} className="text-accent" /></span>.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      3
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary">
                        Confirmez l'ajout
                      </p>
                      <p className="text-[11px] text-muted">
                        Renommez l'application si nécessaire, puis appuyez sur <span className="font-semibold text-accent">"Ajouter"</span> dans le coin supérieur droit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confirm / Close Button */}
                <button
                  onClick={() => {
                    setShowIOSModal(false);
                    handleDismiss();
                  }}
                  className="w-full bg-surface-2 border border-border py-3 rounded-2xl text-xs font-bold text-primary hover:bg-border/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  <Check size={14} className="text-accent" />
                  J'ai compris, merci !
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPromptBanner;
