'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * TvAutoScroll — Gestion du défilement automatique pour le Mode TV.
 *
 * SRP: Ce hook NE fait QUE gérer la logique de défilement/pagination.
 *      Aucune donnée métier, aucun appel API.
 *
 * Deux modes:
 *   'scroll'   → Défilement pixel par pixel continu (smooth scrolling)
 *   'paginate' → Saut de page toutes les N secondes avec transition CSS
 *
 * Comportement:
 *   - Inactif si le contenu ne dépasse pas la hauteur de l'écran
 *   - Pause automatique au hover (pour lecture manuelle en salle de contrôle)
 *   - Retour au début en fin de liste
 */

export interface TvAutoScrollOptions {
  /** Mode de défilement: 'scroll' (continu) ou 'paginate' (par pages) */
  mode?: 'scroll' | 'paginate';
  /** Pixels défilés par seconde (mode scroll uniquement) */
  scrollSpeed?: number;
  /** Millisecondes entre chaque changement de page (mode paginate uniquement) */
  pageInterval?: number;
  /** Mettre en pause au hover (pour lecture manuelle) */
  pauseOnHover?: boolean;
}

export interface TvAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPaused: boolean;
  currentPage: number;
  totalPages: number;
  needsScroll: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function useTvAutoScroll(
  itemCount: number,
  options: TvAutoScrollOptions = {},
): TvAutoScrollReturn {
  const {
    mode = 'scroll',
    scrollSpeed = 35,
    pageInterval = 12000,
    pauseOnHover = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [needsScroll, setNeedsScroll] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Sync ref pour éviter les closures stales dans requestAnimationFrame
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Détecte si le contenu dépasse la hauteur du conteneur
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const checkOverflow = () => {
      setNeedsScroll(el.scrollHeight > el.clientHeight + 20);
      if (mode === 'paginate') {
        const pages = Math.ceil(el.scrollHeight / el.clientHeight);
        setTotalPages(Math.max(1, pages));
      }
    };
    // Délai pour laisser le DOM se rendre
    const timeout = setTimeout(checkOverflow, 200);
    return () => clearTimeout(timeout);
  }, [itemCount, mode]);

  const scrollTickRef = useRef<(timestamp: number) => void>(() => {});

  // MODE SCROLL — Défilement continu pixel par pixel
  const scrollTick = useCallback(
    (timestamp: number) => {
      const el = containerRef.current;
      if (!el) return;

      if (!isPausedRef.current) {
        if (lastTimestampRef.current === null) {
          lastTimestampRef.current = timestamp;
        }
        const delta = timestamp - lastTimestampRef.current;
        el.scrollTop += (scrollSpeed * delta) / 1000;

        // Retour au début quand on atteint le bas
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
          el.scrollTop = 0;
        }
        lastTimestampRef.current = timestamp;
      } else {
        // Reset pour éviter un saut brusque lors de la reprise
        lastTimestampRef.current = null;
      }

      animFrameRef.current = requestAnimationFrame(scrollTickRef.current);
    },
    [scrollSpeed],
  );

  useEffect(() => {
    scrollTickRef.current = scrollTick;
  }, [scrollTick]);

  useEffect(() => {
    if (mode !== 'scroll' || !needsScroll) return;

    animFrameRef.current = requestAnimationFrame(scrollTick);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [mode, needsScroll, scrollTick]);

  // MODE PAGINATE — Changement de page par intervalles
  useEffect(() => {
    if (mode !== 'paginate' || !needsScroll) return;

    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      const el = containerRef.current;
      if (!el) return;

      const maxPage = Math.ceil(el.scrollHeight / el.clientHeight) - 1;

      setCurrentPage((prev) => {
        const next = prev >= maxPage ? 0 : prev + 1;
        el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' });
        return next;
      });
    }, pageInterval);

    return () => clearInterval(interval);
  }, [mode, needsScroll, pageInterval, itemCount]);

  const onMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const onMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  return {
    containerRef,
    isPaused,
    currentPage,
    totalPages,
    needsScroll,
    onMouseEnter,
    onMouseLeave,
  };
}

export function TvScrollContainer({
  children,
  itemCount,
  mode = 'scroll',
  scrollSpeed = 35,
  pageInterval = 12000,
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
      style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}
    >
      {children}
    </div>
  );
}

