import { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useI18n } from '../../i18n/i18n';
import { useDesignTheme } from '../../theme/LiquidGlassContext';
import { Interactive3DHat } from '../3d/Interactive3DHat';
import { vibrate } from '../../utils/haptics';
import { useGameSounds } from '../../sounds/useGameSounds';
import styles from './AnimatedHatEmoji.module.css';

interface AnimatedHatEmojiProps {
  size?: number;
  onClick?: () => void;
  interactive?: boolean;
}

const EASTER_EGGS = ['🐰', '✨', '🌟', '🪄', '🎉', '🔥', '👑', '🎩', '💎', '🚀'];

export function AnimatedHatEmoji({ size = 44, onClick, interactive = true }: AnimatedHatEmojiProps) {
  const { t } = useI18n();
  const { is3D } = useDesignTheme();
  const sounds = useGameSounds();
  const [animType, setAnimType] = useState<'flip' | 'wobble' | null>(null);
  const [popupItem, setPopupItem] = useState<{ id: number; emoji: string } | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    if (!interactive) return;

      clickCountRef.current += 1;
      const count = clickCountRef.current;

      // Play joyful sound & haptics
      sounds.playGuessed();
      vibrate([15, 25, 20]);

      // Choose animation type
      const nextAnim = count % 2 === 0 ? 'flip' : 'wobble';
      setAnimType(nextAnim);

      // Spawn floating easter egg emoji
      const randomEmoji = EASTER_EGGS[(count - 1) % EASTER_EGGS.length];
      setPopupItem({ id: Date.now(), emoji: randomEmoji });

      // Trigger colorful mini confetti
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        try {
          confetti({
            particleCount: 16,
            spread: 55,
            startVelocity: 18,
            ticks: 45,
            origin: { x, y },
            colors: ['#ae3ec9', '#4dabf7', '#fcc419', '#38d9a9', '#ff8787'],
            disableForReducedMotion: true,
          });
        } catch {
          // Fallback
        }
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setAnimType(null);
      }, 800);

      onClick?.();
    },
    [interactive, onClick, sounds]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (is3D) {
    return (
      <div style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '-6px 0' }}>
        <Interactive3DHat size={size + 14} showParticles={false} onHatClick={onClick} />
      </div>
    );
  }

  const hatClass = [
    styles.hat,
    animType === 'flip' ? styles.animatingFlip : '',
    animType === 'wobble' ? styles.animatingWobble : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapperRef}
      className={styles.hatWrapper}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={t('hatEmoji.aria')}
      title={interactive ? t('hatEmoji.clickHint') || 'Нажми на шляпу! ✨' : undefined}
    >
      <span className={hatClass} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
        🎩
      </span>
      {popupItem && (
        <span key={popupItem.id} className={styles.floatingPopup}>
          {popupItem.emoji}
        </span>
      )}
    </div>
  );
}
