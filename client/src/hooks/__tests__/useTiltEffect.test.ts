import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTiltEffect } from '../useTiltEffect';

describe('useTiltEffect Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default flat transform style', () => {
    const { result } = renderHook(() => useTiltEffect());

    expect(result.current.style.transform).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    expect(result.current.glareStyle.opacity).toBe(0);
    expect(result.current.isHovered).toBe(false);
  });

  it('updates transform and glare style on mouse movement when element ref is set', () => {
    const { result } = renderHook(() => useTiltEffect({ maxTiltDeg: 10, scale: 1.05 }));

    const dummyElement = document.createElement('div');
    vi.spyOn(dummyElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    (result.current.cardRef as any).current = dummyElement;

    act(() => {
      result.current.handleMouseMove({ clientX: 150, clientY: 25 } as any);
    });

    expect(result.current.isHovered).toBe(true);
    expect(result.current.style.transform).toContain('rotateX(');
    expect(result.current.style.transform).toContain('rotateY(');
    expect(result.current.style.transform).toContain('scale3d(1.05, 1.05, 1.05)');
    expect(result.current.glareStyle.opacity).toBe(0.35);
  });

  it('resets to flat position when mouse leaves or touch ends', () => {
    const { result } = renderHook(() => useTiltEffect());

    act(() => {
      result.current.handleMouseLeave();
    });

    expect(result.current.isHovered).toBe(false);
    expect(result.current.style.transform).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    expect(result.current.glareStyle.opacity).toBe(0);
  });
});
