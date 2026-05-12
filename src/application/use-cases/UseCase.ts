import type { Result } from '@shared/result';
import type { DomainError } from '@domain/errors';

// All use cases conform to this single-method interface so the presentation layer
// can depend on `UseCase<I, O>` without knowing the concrete implementation.
export interface UseCase<Input, Output, E extends DomainError = DomainError> {
  execute(input: Input): Promise<Result<Output, E>>;
}
