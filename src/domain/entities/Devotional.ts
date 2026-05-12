import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import { ValidationError } from '@domain/errors';
import type { DayKey } from '@domain/value-objects';

export interface DevotionalProps {
  readonly key: DayKey;
  readonly dateLabel: string;
  readonly title: string;
  readonly verseRef: string;
  readonly verseTrans: string;
  readonly verse: string;
}

const trim = (s: string) => s.trim();

export const Devotional = {
  create(input: {
    key: DayKey;
    dateLabel: string;
    title: string;
    verseRef: string;
    verseTrans: string;
    verse: string;
  }): Result<DevotionalProps, ValidationError> {
    const required: Array<[string, string]> = [
      ['dateLabel', input.dateLabel],
      ['title', input.title],
      ['verseRef', input.verseRef],
      ['verse', input.verse],
    ];
    for (const [field, value] of required) {
      if (typeof value !== 'string' || trim(value).length === 0) {
        return err(new ValidationError(`Field "${field}" is required`));
      }
    }
    return ok({
      key: input.key,
      dateLabel: trim(input.dateLabel),
      title: trim(input.title),
      verseRef: trim(input.verseRef),
      verseTrans: trim(input.verseTrans),
      verse: trim(input.verse),
    });
  },
};

export type Devotional = DevotionalProps;
