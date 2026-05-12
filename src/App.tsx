import { AppProvider } from '@presentation/providers';
import { AppRouter } from '@presentation/routes';
import { UpdateToast } from '@presentation/components';
import type { Container } from '@infrastructure/di';

export interface AppProps {
  readonly container: Container;
}

// Root component. The container is injected from main.tsx so tests can substitute fakes.
export const App = ({ container }: AppProps) => (
  <AppProvider container={container}>
    <AppRouter />
    <UpdateToast />
  </AppProvider>
);
