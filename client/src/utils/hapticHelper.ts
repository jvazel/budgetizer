/**
 * Utility helper to trigger haptic feedback vibrations on supported mobile devices.
 * Uses the standard Web Vibrate API (navigator.vibrate).
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'error' | 'expense' | 'income';

export const triggerHaptic = (type: HapticType = 'light'): void => {
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
        // 3 impulsions courtes — erreur
        window.navigator.vibrate([50, 40, 50, 40, 50]);
        break;
      case 'expense':
        // 1 impulsion courte — dépense validée
        window.navigator.vibrate(25);
        break;
      case 'income':
        // 2 impulsions légères — revenu validé (signal positif)
        window.navigator.vibrate([15, 60, 15]);
        break;
      default:
        window.navigator.vibrate(10);
        break;
    }
  }
};
