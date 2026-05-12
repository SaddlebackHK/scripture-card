import type { ReactNode } from 'react';
import type { Container } from '@infrastructure/di';
import { DIContext } from './DIContext';

export interface DIProviderProps {
  readonly container: Container;
  readonly children: ReactNode;
}

export const DIProvider = ({ container, children }: DIProviderProps) => (
  <DIContext.Provider value={container}>{children}</DIContext.Provider>
);
