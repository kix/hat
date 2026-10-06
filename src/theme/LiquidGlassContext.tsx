import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type DesignThemeMode = 'classic' | 'glass' | '3d';

interface DesignThemeContextType {
  designTheme: DesignThemeMode;
  setDesignTheme: (theme: DesignThemeMode) => void;
  isLiquidGlass: boolean;
  is3D: boolean;
  ecoMode: boolean;
  toggleLiquidGlass: () => void;
  setLiquidGlass: (val: boolean) => void;
  toggle3D: () => void;
  set3D: (val: boolean) => void;
  toggleEcoMode: () => void;
  setEcoMode: (val: boolean) => void;
  glassUrl: string;
  threeDUrl: string;
  copyGlassUrl: () => Promise<boolean>;
  copy3DUrl: () => Promise<boolean>;
}

const DesignThemeContext = createContext<DesignThemeContextType | undefined>(undefined);

const STORAGE_KEY_DESIGN = 'hat-design-theme-mode';
const STORAGE_KEY_ECO = 'hat-theme-liquid-glass-eco';

export function LiquidGlassProvider({ children }: { children: React.ReactNode }) {
  const [designTheme, setDesignThemeState] = useState<DesignThemeMode>(() => {
    // 1. Check URL path
    if (window.location.pathname.includes('/3d')) {
      return '3d';
    }
    if (window.location.pathname.includes('/glass')) {
      return 'glass';
    }
    // 2. Check query parameter
    const params = new URLSearchParams(window.location.search);
    const uiParam = params.get('ui') || params.get('theme');
    if (uiParam === '3d' || uiParam === 'three') {
      return '3d';
    }
    if (uiParam === 'glass' || uiParam === 'liquid-glass') {
      return 'glass';
    }
    // 3. Fallback to localStorage
    const saved = localStorage.getItem(STORAGE_KEY_DESIGN);
    if (saved === '3d' || saved === 'glass' || saved === 'classic') {
      return saved;
    }
    // Legacy key fallback
    if (localStorage.getItem('hat-theme-liquid-glass') === 'true') {
      return 'glass';
    }
    return 'classic';
  });

  const [ecoMode, setEcoModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ECO);
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Calculate separate URLs
  const getGlassUrl = useCallback(() => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL || '/hat/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${origin}${normalizedBase}glass/`;
  }, []);

  const get3DUrl = useCallback(() => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL || '/hat/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${origin}${normalizedBase}3d/`;
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

  const copy3DUrl = useCallback(async () => {
    const url = get3DUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }, [get3DUrl]);

  // Apply attributes to DOM
  useEffect(() => {
    if (designTheme === '3d') {
      document.documentElement.setAttribute('data-theme', '3d');
      localStorage.setItem(STORAGE_KEY_DESIGN, '3d');
      localStorage.setItem('hat-theme-liquid-glass', 'false');
    } else if (designTheme === 'glass') {
      document.documentElement.setAttribute('data-theme', 'liquid-glass');
      localStorage.setItem(STORAGE_KEY_DESIGN, 'glass');
      localStorage.setItem('hat-theme-liquid-glass', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY_DESIGN, 'classic');
      localStorage.setItem('hat-theme-liquid-glass', 'false');
    }
  }, [designTheme]);

  useEffect(() => {
    if (ecoMode) {
      document.documentElement.setAttribute('data-eco-mode', 'true');
      localStorage.setItem(STORAGE_KEY_ECO, 'true');
    } else {
      document.documentElement.removeAttribute('data-eco-mode');
      localStorage.setItem(STORAGE_KEY_ECO, 'false');
    }
  }, [ecoMode]);

  const setDesignTheme = useCallback((mode: DesignThemeMode) => {
    setDesignThemeState(mode);
  }, []);

  const toggleLiquidGlass = useCallback(() => {
    setDesignThemeState((prev) => (prev === 'glass' ? 'classic' : 'glass'));
  }, []);

  const setLiquidGlass = useCallback((val: boolean) => {
    setDesignThemeState(val ? 'glass' : 'classic');
  }, []);

  const toggle3D = useCallback(() => {
    setDesignThemeState((prev) => (prev === '3d' ? 'classic' : '3d'));
  }, []);

  const set3D = useCallback((val: boolean) => {
    setDesignThemeState(val ? '3d' : 'classic');
  }, []);

  const toggleEcoMode = useCallback(() => {
    setEcoModeState((prev) => !prev);
  }, []);

  const setEcoMode = useCallback((val: boolean) => {
    setEcoModeState(val);
  }, []);

  return (
    <DesignThemeContext.Provider
      value={{
        designTheme,
        setDesignTheme,
        isLiquidGlass: designTheme === 'glass',
        is3D: designTheme === '3d',
        ecoMode,
        toggleLiquidGlass,
        setLiquidGlass,
        toggle3D,
        set3D,
        toggleEcoMode,
        setEcoMode,
        glassUrl: getGlassUrl(),
        threeDUrl: get3DUrl(),
        copyGlassUrl,
        copy3DUrl,
      }}
    >
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useLiquidGlass() {
  const context = useContext(DesignThemeContext);
  if (!context) {
    throw new Error('useLiquidGlass must be used within a LiquidGlassProvider');
  }
  return context;
}

export function useDesignTheme() {
  const context = useContext(DesignThemeContext);
  if (!context) {
    throw new Error('useDesignTheme must be used within a LiquidGlassProvider');
  }
  return context;
}
