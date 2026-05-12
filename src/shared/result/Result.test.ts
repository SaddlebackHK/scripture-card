import { describe, expect, it } from 'vitest';
import { andThen, andThenAsync, err, isErr, isOk, map, mapErr, ok, type Result } from './Result';

describe('Result', () => {
  describe('isOk / isErr', () => {
    it('narrows to Ok via isOk', () => {
      const result: Result<number, string> = ok(42);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      } else {
        throw new Error('expected Ok');
      }
    });

    it('narrows to Err via isErr', () => {
      const result: Result<number, string> = err('boom');
      if (isErr(result)) {
        expect(result.error).toBe('boom');
      } else {
        throw new Error('expected Err');
      }
    });
  });

  describe('map', () => {
    it('transforms the Ok value', () => {
      const result: Result<number, string> = ok(2);
      expect(map(result, (n: number) => n * 3)).toEqual(ok(6));
    });

    it('passes through Err untouched', () => {
      const result: Result<number, string> = err('nope');
      expect(map(result, (n: number) => n * 3)).toEqual(err('nope'));
    });
  });

  describe('mapErr', () => {
    it('transforms the Err value', () => {
      const result: Result<number, string> = err('boom');
      expect(mapErr(result, (s: string) => s.length)).toEqual(err(4));
    });

    it('passes through Ok untouched', () => {
      const result: Result<number, string> = ok(7);
      expect(mapErr(result, (s: string) => s.length)).toEqual(ok(7));
    });
  });

  describe('andThen', () => {
    it('chains on Ok', () => {
      const halve = (n: number): Result<number, string> => (n % 2 === 0 ? ok(n / 2) : err('odd'));
      const eight: Result<number, string> = ok(8);
      const seven: Result<number, string> = ok(7);
      expect(andThen(eight, halve)).toEqual(ok(4));
      expect(andThen(seven, halve)).toEqual(err('odd'));
    });

    it('short-circuits on Err', () => {
      const initial: Result<number, string> = err('first');
      const result = andThen(initial, (n: number): Result<number, string> => ok(n * 2));
      expect(result).toEqual(err('first'));
    });
  });

  describe('andThenAsync', () => {
    it('chains an async Result-returning step on Ok', async () => {
      const initial: Result<number, string> = ok(3);
      const result = await andThenAsync(
        initial,
        (n: number): Promise<Result<number, string>> => Promise.resolve(ok(n + 1)),
      );
      expect(result).toEqual(ok(4));
    });

    it('short-circuits on Err without invoking fn', async () => {
      let called = false;
      const initial: Result<number, string> = err('boom');
      const result = await andThenAsync(initial, (n: number): Promise<Result<number, string>> => {
        called = true;
        return Promise.resolve(ok(n));
      });
      expect(result).toEqual(err('boom'));
      expect(called).toBe(false);
    });
  });
});
