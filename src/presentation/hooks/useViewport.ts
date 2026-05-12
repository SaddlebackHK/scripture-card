import { useEffect, useState } from 'react';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

// Live viewport dimensions for components that need numeric values
// (e.g., DrumPicker whose width/itemHeight props drive motion math).
// CSS-side scaling should prefer `vmin`/`cqi` units directly; only reach
// for this hook when a numeric prop is unavoidable.
export const useViewport = (): Viewport => {
  const [size, setSize] = useState<Viewport>(() => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return size;
};
