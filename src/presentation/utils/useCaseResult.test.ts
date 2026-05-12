import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@shared/result';
import { UnexpectedError, ValidationError } from '@domain/errors';
import { dispatchUseCase, messageOf, settleUseCase } from './useCaseResult';

describe('messageOf', () => {
  it('returns an Error instance message', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
  });

  it('returns the Chinese fallback for non-Error values', () => {
    expect(messageOf('string')).toBe('未知錯誤');
    expect(messageOf(null)).toBe('未知錯誤');
    expect(messageOf(undefined)).toBe('未知錯誤');
    expect(messageOf({ message: 'not a real Error' })).toBe('未知錯誤');
  });
});

describe('settleUseCase', () => {
  it('passes Ok through', async () => {
    const settled = await settleUseCase(Promise.resolve(ok(42)));
    expect(settled).toEqual({ ok: true, value: 42 });
  });

  it('flattens an Err Result into a string error', async () => {
    const settled = await settleUseCase(Promise.resolve(err(new ValidationError('bad'))));
    expect(settled).toEqual({ ok: false, error: 'bad' });
  });

  it('catches a rejected promise and surfaces its message', async () => {
    const settled = await settleUseCase(Promise.reject(new UnexpectedError('exploded')));
    expect(settled).toEqual({ ok: false, error: 'exploded' });
  });

  it('uses the Chinese fallback when the rejection is not an Error', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercising the non-Error fallback path
    const settled = await settleUseCase(Promise.reject(undefined));
    expect(settled).toEqual({ ok: false, error: '未知錯誤' });
  });
});

describe('dispatchUseCase', () => {
  it('invokes the callback with the Ok branch', async () => {
    const cb = vi.fn();
    dispatchUseCase(Promise.resolve(ok('hello')), cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb).toHaveBeenCalledWith({ ok: true, value: 'hello' });
  });

  it('invokes the callback with the Err branch', async () => {
    const cb = vi.fn();
    dispatchUseCase(Promise.resolve(err(new ValidationError('nope'))), cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb).toHaveBeenCalledWith({ ok: false, error: 'nope' });
  });

  it('catches rejections so the consumer never has to', async () => {
    const cb = vi.fn();
    dispatchUseCase(Promise.reject(new Error('crash')), cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb).toHaveBeenCalledWith({ ok: false, error: 'crash' });
  });
});
