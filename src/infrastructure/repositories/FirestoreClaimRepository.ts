import {
  type Firestore,
  type Timestamp,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import type { ClaimRequestProps } from '@domain/entities';
import type { ClaimRepository } from '@domain/repositories';
import { mapFirestoreError } from '@infrastructure/firebase/errors';

const COLLECTION = 'claims';

interface ClaimDoc {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly month: number;
  readonly day: number;
  readonly createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export class FirestoreClaimRepository implements ClaimRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async create(claim: ClaimRequestProps): Promise<Result<ClaimRequestProps, DomainError>> {
    try {
      const ref = collection(this.db, COLLECTION);
      const payload: ClaimDoc = {
        name: claim.name,
        email: claim.email,
        phone: claim.phone,
        month: claim.month,
        day: claim.day,
        createdAt: serverTimestamp(),
      };
      await addDoc(ref, payload);
      // Server timestamp resolves on the server; for the returned entity we keep
      // the local Date so the caller can echo it back to the user without a re-read.
      return ok(claim);
    } catch (error) {
      return err(mapFirestoreError(error));
    }
  }
}
