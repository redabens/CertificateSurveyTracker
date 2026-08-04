'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * TvAutoScroll — Continuous smooth automatic scrolling for TV mode.
 */

export interface TvAutoScrollOptions {
  mode?: 'scroll' | 'paginate';
  scrollSpeed?: number;
  pageInterval?: number;
  pauseOnHover?: boolean;
}

export function useTvAutoScroll(
  itemCount: number,
  options: TvAutoScrollOptions = {},
) {
  const {
    scrollSpeed = 32,
    pauseOnHover = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const pauseAtBottomRef = useRef<number | null>(null);
  const subPixelRef = useRef<number>(0);
  const scrollTickRef = useRef<(timestamp: number) => void>(() => {});

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const scrollTick = useCallback(
    (timestamp: number) => {
      const el = containerRef.current;
      if (el) {
        if (!isPausedRef.current) {
          if (lastTimestampRef.current === null) {
            lastTimestampRef.current = timestamp;
          }
          const delta = timestamp - lastTimestampRef.current;
          lastTimestampRef.current = timestamp;

          // Only scroll if content is taller than container
          if (el.scrollHeight > el.clientHeight + 10) {
            const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

            if (isAtBottom) {
              if (pauseAtBottomRef.current === null) {
                pauseAtBottomRef.current = timestamp;
              } else if (timestamp - pauseAtBottomRef.current >= 2500) {
                el.scrollTop = 0;
                pauseAtBottomRef.current = null;
                subPixelRef.current = 0;
              }
            } else {
              pauseAtBottomRef.current = null;
              subPixelRef.current += (scrollSpeed * delta) / 1000;
              if (subPixelRef.current >= 1) {
                const px = Math.floor(subPixelRef.current);
                el.scrollTop += px;
                subPixelRef.current -= px;
              }
            }
          }
        } else {
          lastTimestampRef.current = null;
        }
      }

      animFrameRef.current = requestAnimationFrame((time) => scrollTickRef.current(time));
    },
    [scrollSpeed],
  );

  useEffect(() => {
    scrollTickRef.current = scrollTick;
  }, [scrollTick]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame((time) => scrollTickRef.current(time));
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  const onMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const onMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  return {
    containerRef,
    isPaused,
    onMouseEnter,
    onMouseLeave,
  };
}

export function TvScrollContainer({
  children,
  itemCount,
  mode = 'scroll',
  scrollSpeed = 32,
  pageInterval = 10000,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  itemCount: number;
  mode?: 'scroll' | 'paginate';
  scrollSpeed?: number;
  pageInterval?: number;
  pauseOnHover?: boolean;
}) {
  const { containerRef, onMouseEnter, onMouseLeave } = useTvAutoScroll(itemCount, {
    mode,
    scrollSpeed,
    pageInterval,
    pauseOnHover,
  });

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="tv-alerts-container scrollable"
      style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}
    >
      {children}
    </div>
  );
}
