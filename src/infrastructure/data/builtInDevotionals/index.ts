import { Devotional, type DevotionalProps } from '@domain/entities';
import { DayKey } from '@domain/value-objects';
import type { BuiltInDevotionalSource } from '@application/ports';
import { isErr } from '@shared/result';
import { januarySeeds } from './01-january';
import { februarySeeds } from './02-february';
import { marchSeeds } from './03-march';
import { aprilSeeds } from './04-april';
import { maySeeds } from './05-may';
import { juneSeeds } from './06-june';
import { julySeeds } from './07-july';
import { augustSeeds } from './08-august';
import { septemberSeeds } from './09-september';
import { octoberSeeds } from './10-october';
import { novemberSeeds } from './11-november';
import { decemberSeeds } from './12-december';
import type { BuiltInDevotionalSeed } from './types';

const allSeeds: readonly BuiltInDevotionalSeed[] = [
  ...januarySeeds,
  ...februarySeeds,
  ...marchSeeds,
  ...aprilSeeds,
  ...maySeeds,
  ...juneSeeds,
  ...julySeeds,
  ...augustSeeds,
  ...septemberSeeds,
  ...octoberSeeds,
  ...novemberSeeds,
  ...decemberSeeds,
];

const buildIndex = (): ReadonlyMap<DayKey, DevotionalProps> => {
  const map = new Map<DayKey, DevotionalProps>();
  for (const seed of allSeeds) {
    const keyResult = DayKey.create(seed.month, seed.day);
    if (isErr(keyResult)) {
      // Skip malformed seeds rather than crash startup; they'll fall through to placeholder.
      continue;
    }
    const entityResult = Devotional.create({
      key: keyResult.value,
      dateLabel: seed.dateLabel,
      title: seed.title,
      verseRef: seed.verseRef,
      verseTrans: seed.verseTrans,
      verse: seed.verse,
    });
    if (isErr(entityResult)) continue;
    map.set(keyResult.value, entityResult.value);
  }
  return map;
};

export class InMemoryBuiltInDevotionalSource implements BuiltInDevotionalSource {
  private readonly index: ReadonlyMap<DayKey, DevotionalProps>;

  constructor() {
    this.index = buildIndex();
  }

  findByKey(key: DayKey): DevotionalProps | null {
    return this.index.get(key) ?? null;
  }
}
