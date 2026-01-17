import { useState, useEffect, useCallback } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

export function usePullToRefresh({
  threshold = 80,
  onRefresh,
  disabled = false
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);

    // Only allow pulling when at the top of the scrollable area
    if (window.scrollY === 0 && distance > 0) {
      setPullDistance(Math.min(distance * 0.5, threshold * 2)); // Dampen the pull
    }
  }, [disabled, isRefreshing, isPulling, startY, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  // Calculate progress for UI feedback
  const progress = Math.min(pullDistance / threshold, 1);

  return {
    isRefreshing,
    isPulling,
    pullDistance,
    progress,
    canRefresh: pullDistance >= threshold
  };
}