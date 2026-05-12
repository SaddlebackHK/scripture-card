import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { Container } from '@infrastructure/di';
import { DIProvider } from './DIProvider';
import { ThemeProvider } from './ThemeProvider';

export interface AppProviderProps {
  readonly container: Container;
  readonly children: ReactNode;
}

export const AppProvider = ({ container, children }: AppProviderProps) => (
  <DIProvider container={container}>
    <ThemeProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </ThemeProvider>
  </DIProvider>
);
