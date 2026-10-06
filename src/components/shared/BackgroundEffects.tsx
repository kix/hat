import { memo } from 'react';
import { useDesignTheme } from '../../theme/LiquidGlassContext';
import { LiquidGlassBackground } from '../liquidGlass/LiquidGlassBackground';
import { Spatial3DCanvas } from '../3d/Spatial3DCanvas';

export const BackgroundEffects = memo(function BackgroundEffects() {
  const { designTheme } = useDesignTheme();

  if (designTheme === 'glass') {
    return <LiquidGlassBackground />;
  }

  if (designTheme === '3d') {
    return <Spatial3DCanvas />;
  }

  return null;
});
