import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getOutbox } from '../../utils/idbHelper';

const OfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(false);
  const [statusType, setStatusType] = useState('offline'); // 'offline' | 'online-restored' | 'syncing' | 'sync-error'
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initial fetch of outbox count
    getOutbox().then(outbox => {
      setPendingCount(outbox.length);
      if (outbox.length > 0) {
        setShow(true);
      }
    });

    const handleOnline = () => {
      setIsOnline(true);
      setStatusType('online-restored');
      setShow(true);
      
      // Auto-hide after 3 seconds when connection is restored and queue is synced
      const timer = setTimeout(() => {
        // Only hide if we aren't currently syncing or haven't run into a sync error
        getOutbox().then(outbox => {
          if (outbox.length === 0) {
            setShow(false);
          }
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusType('offline');
      setShow(true);
    };

    const handleOutboxUpdate = (e) => {
      const count = e.detail?.count ?? 0;
      setPendingCount(count);
    };

    const handleSyncStatusChange = (e) => {
      const { status, count } = e.detail;
      if (status === 'syncing') {
        setStatusType('syncing');
        setShow(true);
      } else if (status === 'success') {
        setStatusType('online-restored');
        setPendingCount(0);
        setShow(true);
        const timer = setTimeout(() => {
          setShow(false);
        }, 3000);
        return () => clearTimeout(timer);
      } else if (status === 'error') {
        setStatusType('sync-error');
        setPendingCount(count);
        setShow(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('outbox-updated', handleOutboxUpdate);
    window.addEventListener('sync-status-changed', handleSyncStatusChange);

    // Initial check: if we started offline, show the offline banner
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('outbox-updated', handleOutboxUpdate);
      window.removeEventListener('sync-status-changed', handleSyncStatusChange);
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
            statusType === 'offline' || statusType === 'sync-error'
              ? 'bg-danger-dim/90 border-danger/30 text-danger' 
              : statusType === 'syncing'
              ? 'bg-warning-dim/90 border-warning/30 text-warning'
              : 'bg-accent-dim/90 border-accent/30 text-accent'
          }`}>
            <div className={`p-1.5 rounded-lg ${
              statusType === 'offline' || statusType === 'sync-error'
                ? 'bg-danger/10' 
                : statusType === 'syncing'
                ? 'bg-warning/10'
                : 'bg-accent/10'
            }`}>
              {statusType === 'offline' || statusType === 'sync-error' ? (
                <WifiOff className="w-5 h-5" />
              ) : statusType === 'syncing' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Wifi className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-sm font-medium">
              {statusType === 'offline' && (
                <div>
                  <p className="font-semibold text-white">Mode hors ligne</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {pendingCount > 0 
                      ? `${pendingCount} modification(s) en attente de synchronisation.` 
                      : 'Connexion perdue. Données temporairement limitées.'}
                  </p>
                </div>
              )}
              {statusType === 'sync-error' && (
                <div>
                  <p className="font-semibold text-white">Erreur de synchronisation</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {pendingCount > 0
                      ? `${pendingCount} modification(s) non envoyée(s). Réessai automatique.`
                      : "Impossible de synchroniser les modifications."}
                  </p>
                </div>
              )}
              {statusType === 'syncing' && (
                <div>
                  <p className="font-semibold text-white">Synchronisation en cours</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Envoi de {pendingCount} modification(s) en arrière-plan...
                  </p>
                </div>
              )}
              {statusType === 'online-restored' && (
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

