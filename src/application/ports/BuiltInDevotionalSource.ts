import type { DevotionalProps } from '@domain/entities';
import type { DayKey } from '@domain/value-objects';

export interface BuiltInDevotionalSource {
  findByKey(key: DayKey): DevotionalProps | null;
}
