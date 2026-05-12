import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { MotionValue, PanInfo } from 'framer-motion';

export interface DrumPickerProps<T extends number | string> {
  readonly items: readonly T[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly width?: number;
  readonly itemHeight?: number;
  readonly visibleItems?: number;
  readonly formatter?: (item: T) => string;
  readonly ariaLabel?: string;
}

const DEFAULT_ITEM_HEIGHT = 48;
const DEFAULT_VISIBLE = 5;
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface WheelItemProps {
  readonly index: number;
  readonly label: string;
  readonly y: MotionValue<number>;
  readonly itemHeight: number;
  readonly visibleItems: number;
  readonly active: boolean;
  readonly onClick: () => void;
}

const WheelItem = ({
  index,
  label,
  y,
  itemHeight,
  visibleItems,
  active,
  onClick,
}: WheelItemProps) => {
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;
  const itemY = useTransform(y, (latest) => index * itemHeight + latest + centerOffset);
  const rotateX = useTransform(itemY, [0, centerOffset, itemHeight * visibleItems], [55, 0, -55]);
  const scale = useTransform(itemY, [0, centerOffset, itemHeight * visibleItems], [0.78, 1, 0.78]);
  const opacity = useTransform(
    itemY,
    [0, centerOffset * 0.5, centerOffset, centerOffset * 1.5, itemHeight * visibleItems],
    [0.25, 0.55, 1, 0.55, 0.25],
  );

  return (
    <motion.button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      className={`drum-picker-item${active ? ' drum-picker-item--active' : ''}`}
      style={{
        height: itemHeight,
        rotateX,
        scale,
        opacity,
        transformStyle: 'preserve-3d',
        transformOrigin: `center center -${itemHeight * 2}px`,
      }}
    >
      {label}
    </motion.button>
  );
};

export const DrumPicker = <T extends number | string>({
  items,
  value,
  onChange,
  width = 88,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  visibleItems = DEFAULT_VISIBLE,
  formatter,
  ariaLabel,
}: DrumPickerProps<T>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rawIndex = items.indexOf(value);
  const safeIndex = rawIndex >= 0 ? rawIndex : 0;
  const y = useMotionValue(-safeIndex * itemHeight);
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  const indexRef = useRef(safeIndex);
  const itemsRef = useRef<readonly T[]>(items);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    indexRef.current = safeIndex;
    itemsRef.current = items;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const controls = animate(y, -safeIndex * itemHeight, SPRING);
    return () => {
      controls.stop();
    };
  }, [safeIndex, itemHeight, y]);

  const dragConstraints = useMemo(
    () => ({
      top: -(items.length - 1) * itemHeight,
      bottom: 0,
    }),
    [items.length, itemHeight],
  );

  const settleTo = (nextIndex: number) => {
    const target = itemsRef.current[nextIndex];
    if (target === undefined) return;
    if (target !== value) {
      onChange(target);
    } else {
      animate(y, -nextIndex * itemHeight, SPRING);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.2;
    const raw = Math.round(-projected / itemHeight);
    const next = Math.max(0, Math.min(items.length - 1, raw));
    settleTo(next);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const dir = event.deltaY > 0 ? 1 : -1;
      const current = indexRef.current;
      const max = itemsRef.current.length - 1;
      const next = Math.max(0, Math.min(max, current + dir));
      if (next === current) return;
      const target = itemsRef.current[next];
      if (target !== undefined) onChangeRef.current(target);
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const max = items.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        next = Math.max(0, safeIndex - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        next = Math.min(max, safeIndex + 1);
        break;
      case 'Home':
        event.preventDefault();
        next = 0;
        break;
      case 'End':
        event.preventDefault();
        next = max;
        break;
      case 'PageUp':
        event.preventDefault();
        next = Math.max(0, safeIndex - 5);
        break;
      case 'PageDown':
        event.preventDefault();
        next = Math.min(max, safeIndex + 5);
        break;
      default:
        return;
    }
    if (next !== safeIndex) {
      const target = items[next];
      if (target !== undefined) onChange(target);
    }
  };

  const containerHeight = itemHeight * visibleItems;
  const currentItem = items[safeIndex];
  const valueText =
    formatter && currentItem !== undefined ? formatter(currentItem) : String(currentItem ?? '');
  const numericValue = typeof currentItem === 'number' ? currentItem : safeIndex;
  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  const valueMin = typeof firstItem === 'number' ? firstItem : 0;
  const valueMax = typeof lastItem === 'number' ? lastItem : items.length - 1;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      aria-valuenow={numericValue}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuetext={valueText}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="drum-picker"
      // eslint-disable-next-line no-restricted-syntax -- dimensions come from props
      style={{ width, height: containerHeight }}
    >
      <div
        aria-hidden
        className="drum-picker-highlight"
        // eslint-disable-next-line no-restricted-syntax -- highlight band height tracks itemHeight prop
        style={{ top: centerOffset, height: itemHeight }}
      />

      <motion.div
        style={{ y, paddingTop: centerOffset, cursor: 'grab', touchAction: 'none' }}
        whileTap={{ cursor: 'grabbing' }}
        drag="y"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {items.map((item, index) => (
          <WheelItem
            key={String(item)}
            index={index}
            label={formatter ? formatter(item) : String(item)}
            y={y}
            itemHeight={itemHeight}
            visibleItems={visibleItems}
            active={index === safeIndex}
            onClick={() => onChange(item)}
          />
        ))}
      </motion.div>
    </div>
  );
};
