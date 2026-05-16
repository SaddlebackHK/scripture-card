import type { Result } from '@shared/result';
import type { ClaimRequestProps } from '@domain/entities';
import type { DomainError } from '@domain/errors';

// Returned by `create` so callers can reference the persisted doc — used by
// SubmitClaim to bind the follow-up email to the originating claim, and by
// Firestore rules to validate the mail/ doc against the claims/ doc.
export interface CreatedClaim {
  readonly id: string;
  readonly claim: ClaimRequestProps;
}

export interface ClaimRepository {
  create(claim: ClaimRequestProps): Promise<Result<CreatedClaim, DomainError>>;
}
