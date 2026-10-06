import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css';
import './styles/liquidGlass.css';
import './styles/spatial3d.css';
import './styles/win95.css';
import { theme } from './theme';
import { I18nProvider } from './i18n/i18n';
import { LiquidGlassProvider } from './theme/LiquidGlassContext';
import { BackgroundEffects } from './components/shared/BackgroundEffects';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiquidGlassProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <I18nProvider>
          <BackgroundEffects />
          <App />
        </I18nProvider>
      </MantineProvider>
    </LiquidGlassProvider>
  </StrictMode>,
);
