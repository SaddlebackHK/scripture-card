import { CheckForUpdate, GetDevotional, SubmitClaim } from '@application/use-cases';
import { firestore } from '@infrastructure/firebase';
import { FirestoreClaimRepository, FirestoreEmailQueue } from '@infrastructure/repositories';
import { InMemoryBuiltInDevotionalSource } from '@infrastructure/data/builtInDevotionals';
import { HttpVersionSource } from '@infrastructure/version/HttpVersionSource';

export interface UseCases {
  readonly getDevotional: GetDevotional;
  readonly submitClaim: SubmitClaim;
  readonly checkForUpdate: CheckForUpdate;
}

export interface Container {
  readonly useCases: UseCases;
}

export const buildContainer = (): Container => {
  const claimRepo = new FirestoreClaimRepository(firestore);
  const emailQueue = new FirestoreEmailQueue(firestore);
  const builtInDevotionals = new InMemoryBuiltInDevotionalSource();
  const versionSource = new HttpVersionSource();

  const useCases: UseCases = {
    getDevotional: new GetDevotional(builtInDevotionals),
    submitClaim: new SubmitClaim(claimRepo, emailQueue),
    checkForUpdate: new CheckForUpdate(versionSource, __APP_VERSION__),
  };

  return { useCases };
};
