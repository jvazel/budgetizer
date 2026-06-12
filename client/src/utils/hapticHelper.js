/**
 * Utility helper to trigger haptic feedback vibrations on supported mobile devices.
 * Uses the standard Web Vibrate API (navigator.vibrate).
 */
export const triggerHaptic = (type = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        window.navigator.vibrate([30, 20, 30]);
        break;
      case 'error':
        window.navigator.vibrate([50, 50]);
        break;
      default:
        window.navigator.vibrate(10);
        break;
    }
  }
};
