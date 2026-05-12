import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import type { VersionSource } from '@application/ports';
import type { UseCase } from './UseCase';

// Resolves to true when the deployed version differs from the version baked
// into the running bundle — i.e. the user is on a stale tab and a refresh
// would load new code.
export class CheckForUpdate implements UseCase<void, boolean> {
  private readonly source: VersionSource;
  private readonly currentVersion: string;

  constructor(source: VersionSource, currentVersion: string) {
    this.source = source;
    this.currentVersion = currentVersion;
  }

  async execute(): Promise<Result<boolean, DomainError>> {
    const result = await this.source.getDeployedVersion();
    if (!result.ok) return err(result.error);
    return ok(result.value !== this.currentVersion);
  }
}
