import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

const OfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(false);
  const [statusType, setStatusType] = useState('offline'); // 'offline' | 'online-restored'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatusType('online-restored');
      setShow(true);
      
      // Auto-hide after 3 seconds when connection is restored
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusType('offline');
      setShow(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if we started offline, show the offline banner
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[380px] z-[9999] pointer-events-none"
        >
          <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border ${
            statusType === 'offline' 
              ? 'bg-danger-dim/90 border-danger/30 text-danger' 
              : 'bg-accent-dim/90 border-accent/30 text-accent'
          }`}>
            <div className={`p-1.5 rounded-lg ${
              statusType === 'offline' ? 'bg-danger/10' : 'bg-accent/10'
            }`}>
              {statusType === 'offline' ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <Wifi className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-sm font-medium">
              {statusType === 'offline' ? (
                <div>
                  <p className="font-semibold text-white">Mode hors ligne</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Connexion perdue. Données temporairement limitées.</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-white">Connexion rétablie</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Vous êtes de nouveau en ligne. Synchronisation réussie.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineStatus;
