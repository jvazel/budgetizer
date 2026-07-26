import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic } from '../hapticHelper';

describe('hapticHelper', () => {
  const originalNavigator = { ...window.navigator };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
  });

  it('should call window.navigator.vibrate with correct arguments for each type', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(window, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true
    });

    // Test default / light
    triggerHaptic();
    expect(vibrateMock).toHaveBeenLastCalledWith(10);

    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenLastCalledWith(10);

    // Test medium
    triggerHaptic('medium');
    expect(vibrateMock).toHaveBeenLastCalledWith(20);

    // Test heavy
    triggerHaptic('heavy');
    expect(vibrateMock).toHaveBeenLastCalledWith([30, 20, 30]);

    // Test error
    triggerHaptic('error');
    expect(vibrateMock).toHaveBeenLastCalledWith([50, 40, 50, 40, 50]);

    // Test expense
    triggerHaptic('expense');
    expect(vibrateMock).toHaveBeenLastCalledWith(25);

    // Test income
    triggerHaptic('income');
    expect(vibrateMock).toHaveBeenLastCalledWith([15, 60, 15]);

    // Test unknown type defaults to light
    triggerHaptic('unknown_type' as any);
    expect(vibrateMock).toHaveBeenLastCalledWith(10);
  });

  it('should fail silently and not throw when window.navigator.vibrate is undefined', () => {
    Object.defineProperty(window, 'navigator', {
      value: { vibrate: undefined },
      writable: true,
      configurable: true
    });

    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('should fail silently and not throw when window.navigator is undefined', () => {
    Object.defineProperty(window, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true
    });

    expect(() => triggerHaptic('light')).not.toThrow();
  });
});
