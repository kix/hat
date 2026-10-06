import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface LiquidGlassContextType {
  isLiquidGlass: boolean;
  ecoMode: boolean;
  toggleLiquidGlass: () => void;
  setLiquidGlass: (val: boolean) => void;
  toggleEcoMode: () => void;
  setEcoMode: (val: boolean) => void;
  glassUrl: string;
  copyGlassUrl: () => Promise<boolean>;
}

const LiquidGlassContext = createContext<LiquidGlassContextType | undefined>(undefined);

const STORAGE_KEY_GLASS = 'hat-theme-liquid-glass';
const STORAGE_KEY_ECO = 'hat-theme-liquid-glass-eco';

export function LiquidGlassProvider({ children }: { children: React.ReactNode }) {
  const [isLiquidGlass, setIsLiquidGlassState] = useState<boolean>(() => {
    // 1. Check URL path (e.g. /hat/glass/ or /glass/)
    if (window.location.pathname.includes('/glass')) {
      return true;
    }
    // 2. Check query parameter (?ui=glass or ?theme=liquid-glass or ?theme=glass)
    const params = new URLSearchParams(window.location.search);
    if (params.get('ui') === 'glass' || params.get('theme') === 'glass' || params.get('theme') === 'liquid-glass') {
      return true;
    }
    // 3. Fallback to localStorage
    const saved = localStorage.getItem(STORAGE_KEY_GLASS);
    return saved === 'true';
  });

  const [ecoMode, setEcoModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ECO);
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Calculate separate direct glass URL
  const getGlassUrl = useCallback(() => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL || '/hat/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${origin}${normalizedBase}glass/`;
  }, []);

  const copyGlassUrl = useCallback(async () => {
    const url = getGlassUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }, [getGlassUrl]);

  // Apply attributes to DOM
  useEffect(() => {
    if (isLiquidGlass) {
      document.documentElement.setAttribute('data-theme', 'liquid-glass');
      localStorage.setItem(STORAGE_KEY_GLASS, 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY_GLASS, 'false');
    }
  }, [isLiquidGlass]);

  useEffect(() => {
    if (ecoMode) {
      document.documentElement.setAttribute('data-eco-mode', 'true');
      localStorage.setItem(STORAGE_KEY_ECO, 'true');
    } else {
      document.documentElement.removeAttribute('data-eco-mode');
      localStorage.setItem(STORAGE_KEY_ECO, 'false');
    }
  }, [ecoMode]);

  const toggleLiquidGlass = useCallback(() => {
    setIsLiquidGlassState((prev) => !prev);
  }, []);

  const setLiquidGlass = useCallback((val: boolean) => {
    setIsLiquidGlassState(val);
  }, []);

  const toggleEcoMode = useCallback(() => {
    setEcoModeState((prev) => !prev);
  }, []);

  const setEcoMode = useCallback((val: boolean) => {
    setEcoModeState(val);
  }, []);

  return (
    <LiquidGlassContext.Provider
      value={{
        isLiquidGlass,
        ecoMode,
        toggleLiquidGlass,
        setLiquidGlass,
        toggleEcoMode,
        setEcoMode,
        glassUrl: getGlassUrl(),
        copyGlassUrl,
      }}
    >
      {children}
    </LiquidGlassContext.Provider>
  );
}

export function useLiquidGlass() {
  const context = useContext(LiquidGlassContext);
  if (!context) {
    throw new Error('useLiquidGlass must be used within a LiquidGlassProvider');
  }
  return context;
}
