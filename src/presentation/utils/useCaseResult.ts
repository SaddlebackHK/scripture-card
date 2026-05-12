import type { Result } from '@shared/result';
import type { DomainError } from '@domain/errors';

const UNKNOWN_ERROR = '未知錯誤';

// Normalises any thrown / rejected value into a user-facing message. Used as
// the fallback when a use-case promise rejects unexpectedly (use cases by
// contract never throw across their boundary, so this is purely defensive).
export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : UNKNOWN_ERROR;

export type SettledUseCase<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

// Awaits a use-case execution and collapses both the Err arm of the Result
// and any rejection of the promise itself into a single string-typed error.
// Presentation-layer callers that only need to drive UI state want this —
// they branch on `r.ok` and consume `r.error` as a message, without caring
// about which DomainError kind it was.
export const settleUseCase = async <T>(
  promise: Promise<Result<T, DomainError>>,
): Promise<SettledUseCase<T>> => {
  try {
    const result = await promise;
    return result.ok
      ? { ok: true, value: result.value }
      : { ok: false, error: result.error.message };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
};

// Fire-and-forget wrapper: kicks off a use case and dispatches the settled
// outcome to `onSettled`. Avoids the no-floating-promises lint at every call
// site and removes the hand-rolled `.then(onResolve, onReject)` shape.
// For hook usage that needs cancellation, check the cancelled flag inside
// `onSettled` before calling setState.
export const dispatchUseCase = <T>(
  promise: Promise<Result<T, DomainError>>,
  onSettled: (result: SettledUseCase<T>) => void,
): void => {
  void settleUseCase(promise).then(onSettled);
};
