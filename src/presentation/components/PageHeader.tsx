import { type ReactNode } from 'react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export interface PageHeaderProps {
  readonly leading?: ReactNode;
  // When provided, replaces the default trailing nav (theme toggle).
  // Pass `null` to hide trailing entirely.
  readonly trailing?: ReactNode;
}

export const PageHeader = ({ leading, trailing }: PageHeaderProps) => (
  <header className="top-bar">
    {leading ?? <Brand />}
    <nav className="top-bar-tools" aria-label="primary">
      {trailing ?? <ThemeToggle />}
    </nav>
  </header>
);
