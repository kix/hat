import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css';
import { theme } from './theme';
import { I18nProvider } from './i18n/i18n';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <I18nProvider>
        <App />
      </I18nProvider>
    </MantineProvider>
  </StrictMode>,
);
