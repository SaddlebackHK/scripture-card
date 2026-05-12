import type { Result } from '@shared/result';
import { err, isErr, map } from '@shared/result';
import type { DomainError } from '@domain/errors';
import { ClaimRequest, type ClaimRequestProps } from '@domain/entities';
import type { ClaimRepository } from '@domain/repositories';
import type { ClaimRequestDTO, ClaimRequestInputDTO } from '@application/dto';

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

  constructor(repo: ClaimRepository) {
    this.repo = repo;
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
    return map(saved, toClaimRequestDTO);
  }
}
