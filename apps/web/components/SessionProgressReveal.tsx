'use client';

import { useEffect, useState } from 'react';
import { crossedIntoHigherBand } from '@adaptive-tutor/core';
import { useLanguage } from './LanguageProvider';

export interface SessionProgress {
  startingScore: number;
  endingScore: number;
  startingBand: string;
  endingBand: string;
}

// End-of-session progress: the bar slides from where the skill started to where
// it ended. If it crossed into a higher band, a short "level up" ring-burst plays.
// If it did not move up, the wording stays neutral — never negative. Only real,
// recorded scores are shown; reduced-motion users just see the final state.
export function SessionProgressReveal({ progress }: { progress: SessionProgress }) {
  const { t } = useLanguage();
  const tt = t as (k: string, v?: Record<string, string | number>) => string;
  const [shown, setShown] = useState(progress.startingScore);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(progress.endingScore), 250);
    return () => window.clearTimeout(id);
  }, [progress.endingScore]);

  const levelUp = crossedIntoHigherBand(progress.startingScore, progress.endingScore);
  const improved = progress.endingScore > progress.startingScore;

  return (
    <section className="progress-reveal" aria-live="polite" style={{ marginTop: 'var(--space-3)' }}>
      <div className="progress-reveal__track" aria-hidden="true">
        <div className="progress-reveal__fill" style={{ width: `${Math.max(3, Math.min(100, shown))}%` }} />
        {levelUp && <span className="progress-reveal__burst" />}
      </div>
      <p style={{ margin: '0.4rem 0 0', fontWeight: levelUp ? 700 : 500 }}>
        {levelUp
          ? tt('anim.levelUp', { from: tt(`anim.band.${progress.startingBand}`), to: tt(`anim.band.${progress.endingBand}`) })
          : improved
            ? tt('anim.progressUp', { from: progress.startingScore, to: progress.endingScore })
            : tt('anim.progressSteady')}
      </p>
    </section>
  );
}
