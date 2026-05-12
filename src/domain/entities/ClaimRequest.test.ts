import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '@shared/result';
import { ClaimRequest } from './ClaimRequest';

const baseInput = {
  name: '張三',
  email: 'reader@example.com',
  month: 8,
  day: 7,
};

describe('ClaimRequest.create', () => {
  it('accepts valid input and trims whitespace', () => {
    const result = ClaimRequest.create({
      ...baseInput,
      name: '  張三  ',
      email: '  reader@example.com  ',
    });
    if (!isOk(result)) throw new Error('expected Ok');
    expect(result.value.name).toBe('張三');
    expect(result.value.email).toBe('reader@example.com');
    expect(result.value.phone).toBeNull();
    expect(result.value.createdAt).toBeInstanceOf(Date);
  });

  it('uses the supplied createdAt when provided', () => {
    const fixed = new Date('2026-05-02T00:00:00Z');
    const result = ClaimRequest.create({ ...baseInput, createdAt: fixed });
    expect(isOk(result) && result.value.createdAt).toEqual(fixed);
  });

  describe('name', () => {
    it('rejects empty', () => {
      expect(isErr(ClaimRequest.create({ ...baseInput, name: '   ' }))).toBe(true);
    });

    it('rejects > 60 chars', () => {
      expect(isErr(ClaimRequest.create({ ...baseInput, name: 'x'.repeat(61) }))).toBe(true);
    });
  });

  describe('email', () => {
    it('rejects empty', () => {
      expect(isErr(ClaimRequest.create({ ...baseInput, email: '   ' }))).toBe(true);
    });

    it.each(['no-at-sign', 'missing@dot', '@nohostpart.com', 'spaces in@email.com'])(
      'rejects malformed: %s',
      (email) => {
        expect(isErr(ClaimRequest.create({ ...baseInput, email }))).toBe(true);
      },
    );

    it('rejects > 254 chars', () => {
      const huge = `${'x'.repeat(250)}@y.co`;
      expect(isErr(ClaimRequest.create({ ...baseInput, email: huge }))).toBe(true);
    });
  });

  describe('phone', () => {
    it('treats undefined as no phone', () => {
      const result = ClaimRequest.create(baseInput);
      expect(isOk(result) && result.value.phone).toBeNull();
    });

    it('treats whitespace-only as no phone', () => {
      const result = ClaimRequest.create({ ...baseInput, phone: '   ' });
      expect(isOk(result) && result.value.phone).toBeNull();
    });

    it('accepts digits, spaces, +, (), -', () => {
      const result = ClaimRequest.create({ ...baseInput, phone: '+852 9123 4567' });
      expect(isOk(result) && result.value.phone).toBe('+852 9123 4567');
    });

    it('rejects letters', () => {
      expect(isErr(ClaimRequest.create({ ...baseInput, phone: '12abc34' }))).toBe(true);
    });

    it('rejects too short / too long', () => {
      expect(isErr(ClaimRequest.create({ ...baseInput, phone: '12' }))).toBe(true);
      expect(isErr(ClaimRequest.create({ ...baseInput, phone: '1'.repeat(21) }))).toBe(true);
    });
  });

  describe('date', () => {
    it.each([0, 13, 1.5, Number.NaN])('rejects month %s', (month) => {
      expect(isErr(ClaimRequest.create({ ...baseInput, month }))).toBe(true);
    });

    it.each([0, 32, 1.5, Number.NaN])('rejects day %s', (day) => {
      expect(isErr(ClaimRequest.create({ ...baseInput, day }))).toBe(true);
    });
  });
});
