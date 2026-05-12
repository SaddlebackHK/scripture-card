import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { UnauthorizedError, UnexpectedError, ValidationError } from '@domain/errors';
import { mapFirestoreError } from './errors';

describe('mapFirestoreError', () => {
  it('maps permission-denied to UnauthorizedError', () => {
    const original = new FirebaseError('permission-denied', 'denied');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnauthorizedError);
    expect(mapped.cause).toBe(original);
  });

  it('maps invalid-argument to ValidationError', () => {
    const original = new FirebaseError('invalid-argument', 'bad input');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(ValidationError);
    expect(mapped.message).toBe('bad input');
  });

  it('maps other Firebase errors to UnexpectedError', () => {
    const original = new FirebaseError('unavailable', 'service down');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('service down');
  });

  it('wraps a non-Firebase Error as UnexpectedError', () => {
    const original = new Error('disk full');
    const mapped = mapFirestoreError(original);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('disk full');
    expect(mapped.cause).toBe(original);
  });

  it('handles non-Error values with the default message', () => {
    const mapped = mapFirestoreError(42);
    expect(mapped).toBeInstanceOf(UnexpectedError);
    expect(mapped.message).toBe('未知錯誤。');
  });
});
