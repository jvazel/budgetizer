import { useState, useRef, useCallback, CSSProperties } from 'react';

interface TiltOptions {
  maxTiltDeg?: number;
  glareOpacity?: number;
  scale?: number;
  speed?: number;
}

export const useTiltEffect = <T extends HTMLElement = HTMLDivElement>(options: TiltOptions = {}) => {
  const {
    maxTiltDeg = 12,
    glareOpacity = 0.35,
    scale = 1.03,
    speed = 400
  } = options;

  const cardRef = useRef<T | null>(null);
  const [style, setStyle] = useState<CSSProperties>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: `transform ${speed}ms cubic-bezier(.03,.98,.52,.99)`,
    transformStyle: 'preserve-3d',
  });

  const [glareStyle, setGlareStyle] = useState<CSSProperties>({
    opacity: 0,
    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)',
    transition: `opacity ${speed}ms ease`,
    pointerEvents: 'none',
  });

  const [isHovered, setIsHovered] = useState(false);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;

    // Check for reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate normalized relative coordinates from center [-0.5, 0.5]
    const relativeX = (clientX - rect.left) / width - 0.5;
    const relativeY = (clientY - rect.top) / height - 0.5;

    // Calculate tilt angles
    const rotateY = relativeX * maxTiltDeg * 2;
    const rotateX = -relativeY * maxTiltDeg * 2;

    // Calculate glare gradient position (0% - 100%)
    const glareX = (relativeX + 0.5) * 100;
    const glareY = (relativeY + 0.5) * 100;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: 'none', // Direct instant update during movement
      transformStyle: 'preserve-3d',
    });

    setGlareStyle({
      opacity: glareOpacity,
      background: `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 80%)`,
      transition: 'none',
      pointerEvents: 'none',
    });
  }, [maxTiltDeg, glareOpacity, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent<T>) => {
    setIsHovered(true);
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent<T>) => {
    if (e.touches.length > 0) {
      setIsHovered(true);
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  }, [handleMove]);

  const handleReset = useCallback(() => {
    setIsHovered(false);
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: `transform ${speed}ms cubic-bezier(.03,.98,.52,.99)`,
      transformStyle: 'preserve-3d',
    });

    setGlareStyle({
      opacity: 0,
      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)',
      transition: `opacity ${speed}ms ease`,
      pointerEvents: 'none',
    });
  }, [speed]);

  return {
    cardRef,
    style,
    glareStyle,
    isHovered,
    handleMouseMove,
    handleMouseLeave: handleReset,
    handleTouchMove,
    handleTouchEnd: handleReset,
  };
};

export default useTiltEffect;
