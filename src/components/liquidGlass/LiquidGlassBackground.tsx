import { memo } from 'react';

export const LiquidGlassBackground = memo(function LiquidGlassBackground() {
  return (
    <div id="liquid-glass-background" aria-hidden="true">
      <div className="liquid-ambient-orb orb-1" />
      <div className="liquid-ambient-orb orb-2" />
      <div className="liquid-ambient-orb orb-3" />
      <div className="liquid-ambient-orb orb-4" />
    </div>
  );
});
