import type { Result } from '@shared/result';
import { err, isErr, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import { ClaimRequest, type ClaimRequestProps } from '@domain/entities';
import type { ClaimRepository } from '@domain/repositories';
import type { EmailQueue } from '@application/ports';
import type { ClaimRequestDTO, ClaimRequestInputDTO } from '@application/dto';
import { formatChineseDate } from '@shared/date';

const toClaimRequestDTO = (claim: ClaimRequestProps): ClaimRequestDTO => ({
  name: claim.name,
  email: claim.email,
  phone: claim.phone,
  month: claim.month,
  day: claim.day,
  createdAt: claim.createdAt.toISOString(),
});

export class SubmitClaim {
  private readonly repo: ClaimRepository;
  private readonly emailQueue: EmailQueue;

  constructor(repo: ClaimRepository, emailQueue: EmailQueue) {
    this.repo = repo;
    this.emailQueue = emailQueue;
  }

  async execute(input: ClaimRequestInputDTO): Promise<Result<ClaimRequestDTO, DomainError>> {
    const entity = ClaimRequest.create({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      month: input.month,
      day: input.day,
    });
    if (isErr(entity)) return err(entity.error);

    const saved = await this.repo.create(entity.value);
    if (isErr(saved)) return err(saved.error);

    // Best-effort: queue the confirmation email after the claim has persisted.
    // If queueing fails we still return success — the claim is recorded and the
    // ministry can follow up manually; failing the whole submission would
    // tempt the user to re-submit and create a duplicate claim.
    const queued = await this.emailQueue.enqueueCardEmail({
      claimId: saved.value.id,
      to: saved.value.claim.email,
      name: saved.value.claim.name,
      dateLabel: formatChineseDate(saved.value.claim.month, saved.value.claim.day),
      month: saved.value.claim.month,
      day: saved.value.claim.day,
    });
    if (isErr(queued)) {
      console.warn('Failed to enqueue scripture-card email', saved.value.id, queued.error);
    }

    return ok(toClaimRequestDTO(saved.value.claim));
  }
}
