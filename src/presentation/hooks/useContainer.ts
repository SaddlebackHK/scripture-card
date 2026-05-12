import { useContext } from 'react';
import type { Container } from '@infrastructure/di';
import { DIContext } from '@presentation/providers/DIContext';

export const useContainer = (): Container => {
  const container = useContext(DIContext);
  if (container === null) {
    throw new Error('useContainer must be used within a <DIProvider>');
  }
  return container;
};
