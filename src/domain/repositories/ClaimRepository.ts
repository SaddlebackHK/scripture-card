import type { Result } from '@shared/result';
import type { ClaimRequestProps } from '@domain/entities';
import type { DomainError } from '@domain/errors';

export interface ClaimRepository {
  create(claim: ClaimRequestProps): Promise<Result<ClaimRequestProps, DomainError>>;
}
