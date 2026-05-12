import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  readonly theme: Theme;
  readonly toggle: () => void;
  readonly setTheme: (next: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
