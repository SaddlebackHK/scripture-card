import type { Result } from '@shared/result';
import type { DomainError } from '@domain/errors';

// Input for enqueueing the "your scripture card" confirmation email after a
// successful claim. The use case is the only caller; the port hides the
// transport (Firestore `mail/` collection consumed by the Trigger Email
// extension) so we could swap it later without touching the use case.
export interface EnqueueCardEmailInput {
  readonly claimId: string;
  readonly to: string;
  readonly name: string;
  readonly dateLabel: string;
  readonly month: number;
  readonly day: number;
}

export interface EmailQueue {
  enqueueCardEmail(input: EnqueueCardEmailInput): Promise<Result<void, DomainError>>;
}
