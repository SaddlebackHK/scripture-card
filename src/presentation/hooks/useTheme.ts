import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@presentation/providers/ThemeContext';

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
};
