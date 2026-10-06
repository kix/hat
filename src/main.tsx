import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css';
import './styles/liquidGlass.css';
import { theme } from './theme';
import { I18nProvider } from './i18n/i18n';
import { LiquidGlassProvider } from './theme/LiquidGlassContext';
import { LiquidGlassBackground } from './components/liquidGlass/LiquidGlassBackground';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiquidGlassProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <I18nProvider>
          <LiquidGlassBackground />
          <App />
        </I18nProvider>
      </MantineProvider>
    </LiquidGlassProvider>
  </StrictMode>,
);
