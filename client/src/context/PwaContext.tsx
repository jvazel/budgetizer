import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const PwaContext = createContext();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PwaProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Push notifications state
  const [pushPermission, setPushPermission] = useState('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  const checkPushSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushPermission('unsupported');
      return;
    }

    setPushPermission(Notification.permission);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsPushSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription status:', error);
    }
  };

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator && window.navigator.standalone === true); // for iOS Safari
      setIsStandalone(!!isStandaloneMode);
    };

    checkStandalone();

    // Check if OS is iOS
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setIsIOS(isIOSDevice);
    };
    checkIOS();

    // Listen for beforeinstallprompt event (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA installation prompt is available');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
      console.log('PWA was installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check push status on mount
    checkPushSubscriptionStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
      return true;
    } else {
      console.log('User dismissed the PWA install prompt');
      return false;
    }
  };

  // Push notifications functions
  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Notifications push non supportées sur ce navigateur.');
    }

    try {
      setIsPushLoading(true);
      
      // 1. Request permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission !== 'granted') {
        throw new Error('Permission de notification refusée.');
      }

      // 2. Fetch VAPID public key from backend
      const res = await api.get('/notifications/vapid-key');
      const vapidPublicKey = res.data.publicKey;

      // 3. Register push subscription with browser push service
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // 4. Save subscription on backend
      await api.post('/notifications/subscribe', { subscription });
      setIsPushSubscribed(true);
      
      return true;
    } catch (err) {
      console.error('Subscription to push failed:', err);
      throw err;
    } finally {
      setIsPushLoading(false);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      setIsPushLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // 1. Unsubscribe on browser
        await subscription.unsubscribe();
        
        // 2. Remove subscription on backend
        await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
      }
      
      setIsPushSubscribed(false);
      return true;
    } catch (err) {
      console.error('Unsubscription from push failed:', err);
      throw err;
    } finally {
      setIsPushLoading(false);
    }
  };

  const sendTestPush = async () => {
    try {
      await api.post('/notifications/test');
      return true;
    } catch (err) {
      console.error('Failed to trigger test notification:', err);
      throw err;
    }
  };

  return (
    <PwaContext.Provider value={{ 
      isInstallable, 
      isStandalone, 
      isIOS, 
      installApp,
      pushPermission,
      isPushSubscribed,
      isPushLoading,
      subscribeToPushNotifications,
      unsubscribeFromPushNotifications,
      sendTestPush
    }}>
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => useContext(PwaContext);
