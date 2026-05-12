import type { Result } from '@shared/result';
import { err, isErr, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import { DayKey } from '@domain/value-objects';
import type { BuiltInDevotionalSource } from '@application/ports';
import type { DevotionalDTO } from '@application/dto';
import { buildPlaceholderDTO, toDevotionalDTO } from '@application/mappers/devotionalMapper';
import type { UseCase } from './UseCase';

export interface GetDevotionalInput {
  readonly month: number;
  readonly day: number;
}

export class GetDevotional implements UseCase<GetDevotionalInput, DevotionalDTO> {
  private readonly builtIn: BuiltInDevotionalSource;

  constructor(builtIn: BuiltInDevotionalSource) {
    this.builtIn = builtIn;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- synchronous by design; async for interface compat
  async execute(input: GetDevotionalInput): Promise<Result<DevotionalDTO, DomainError>> {
    const keyResult = DayKey.create(input.month, input.day);
    if (isErr(keyResult)) return err(keyResult.error);

    const builtIn = this.builtIn.findByKey(keyResult.value);
    if (builtIn !== null) {
      return ok(toDevotionalDTO(builtIn));
    }

    return ok(buildPlaceholderDTO(input.month, input.day));
  }
}
