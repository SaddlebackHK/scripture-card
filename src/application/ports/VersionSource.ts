import type { Result } from '@shared/result';
import type { DomainError } from '@domain/errors';

// Reads the version of the app currently deployed to the host. Implementations
// fetch a small static file (e.g. /version.json) emitted alongside the bundle
// at build time. The application layer compares this against the version
// baked into the running bundle to decide whether the user should refresh.
export interface VersionSource {
  getDeployedVersion(): Promise<Result<string, DomainError>>;
}
