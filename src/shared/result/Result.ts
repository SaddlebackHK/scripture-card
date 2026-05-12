// Result type for explicit, type-safe error handling across the codebase.
// Use cases return Result<T, E> instead of throwing — callers must handle both arms.

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

// Transform the Ok value, leaving Err untouched.
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

// Transform the Err value, leaving Ok untouched.
export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(fn(result.error));

// Chain a Result-returning function. Short-circuits on the first Err.
export const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? fn(result.value) : result);

// Async equivalent of `andThen` — useful when the next step in a use case is itself async.
export const andThenAsync = async <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> => (result.ok ? fn(result.value) : result);
