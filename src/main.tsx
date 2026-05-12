import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { buildContainer } from '@infrastructure/di';
import '@presentation/styles/global.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found in index.html');
}

const container = buildContainer();

createRoot(rootElement).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
