'use client';

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { statsContent, type StatsContentItem } from '@/content/statsContent';

const ANIM_MS = 1800;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function formatValue(item: StatsContentItem, n: number) {
  const v = Math.round(n);
  return `${v}${item.suffix}`;
}

export function StatsBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const [values, setValues] = useState(() => statsContent.items.map(() => 0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    if (mq.matches) {
      setValues(statsContent.items.map((i) => i.target));
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      setReduceMotion(mq.matches);
      if (mq.matches) {
        setValues(statsContent.items.map((i) => i.target));
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const runCountUp = useCallback(() => {
    if (hasAnimatedRef.current || reduceMotion) return;
    hasAnimatedRef.current = true;
    const targets = statsContent.items.map((i) => i.target);
    const t0 = performance.now();

    const step = (now: number) => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / ANIM_MS);
      const eased = easeOutCubic(t);
      setValues(targets.map((target) => target * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setValues(targets);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const el = sectionRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            runCountUp();
            obs.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion, runCountUp]);

  return (
    <section
      ref={sectionRef}
      className="stats-banner"
      aria-label="Ключевые показатели платформы"
    >
      <div className="container-page">
        <div className="stats-grid" role="list">
          {statsContent.items.map((item, i) => (
            <div key={item.id} className="stats-item" role="listitem">
              <span
                className="stats-value"
                aria-label={`${formatValue(item, item.target)} — ${item.label}`}
              >
                {formatValue(item, values[i] ?? 0)}
              </span>
              <span className="stats-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
