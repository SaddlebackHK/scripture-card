import { createContext } from 'react';
import type { Container } from '@infrastructure/di';

// Context lives in its own file so the provider component can be hot-reloaded without
// invalidating consumers (react-refresh/only-export-components).
export const DIContext = createContext<Container | null>(null);
