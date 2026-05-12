import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import { type DomainError, UnexpectedError } from '@domain/errors';
import type { VersionSource } from '@application/ports';

interface VersionDoc {
  readonly version: string;
}

const isVersionDoc = (value: unknown): value is VersionDoc =>
  typeof value === 'object' &&
  value !== null &&
  'version' in value &&
  typeof value.version === 'string';

export class HttpVersionSource implements VersionSource {
  private readonly url: string;

  constructor(url = '/version.json') {
    this.url = url;
  }

  async getDeployedVersion(): Promise<Result<string, DomainError>> {
    try {
      // `cache: 'no-store'` keeps the browser HTTP cache out of the loop;
      // Firebase Hosting separately serves *.json with `Cache-Control: no-cache`,
      // so intermediate proxies revalidate too.
      const response = await fetch(this.url, { cache: 'no-store' });
      if (!response.ok) {
        return err(new UnexpectedError(`version.json HTTP ${String(response.status)}`));
      }
      const body: unknown = await response.json();
      if (!isVersionDoc(body)) {
        return err(new UnexpectedError('version.json missing string `version` field'));
      }
      return ok(body.version);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to fetch version.json';
      return err(new UnexpectedError(message, { cause: error }));
    }
  }
}
