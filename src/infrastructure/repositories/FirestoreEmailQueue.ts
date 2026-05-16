import { type Firestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import type { DomainError } from '@domain/errors';
import type { EmailQueue, EnqueueCardEmailInput } from '@application/ports';
import { mapFirestoreError } from '@infrastructure/firebase/errors';

const COLLECTION = 'mail';
const TEMPLATE_NAME = 'scripture-card';

// Pre-generated PNGs are published by scripts/generate-card-images.mjs to
// /cards/MM-DD.png under Firebase Hosting. The Trigger Email extension
// fetches this URL at send time and inlines the bytes via the `cid` ref.
// Locking the prefix here (and matching it in firestore.rules) prevents a
// malicious client from making the extension fetch arbitrary URLs.
const HOSTING_ORIGIN = 'https://scripture-card.web.app';

const pad2 = (n: number): string => String(n).padStart(2, '0');

interface MailDoc {
  readonly to: string;
  readonly claimId: string;
  readonly template: {
    readonly name: string;
    readonly data: {
      readonly name: string;
      readonly dateLabel: string;
      readonly month: number;
      readonly day: number;
    };
  };
  readonly attachments: ReadonlyArray<{
    readonly filename: string;
    readonly path: string;
    readonly cid: string;
  }>;
  readonly createdAt: ReturnType<typeof serverTimestamp>;
}

export class FirestoreEmailQueue implements EmailQueue {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async enqueueCardEmail(input: EnqueueCardEmailInput): Promise<Result<void, DomainError>> {
    try {
      const filename = `${pad2(input.month)}-${pad2(input.day)}.png`;
      const path = `${HOSTING_ORIGIN}/cards/${filename}`;
      const payload: MailDoc = {
        to: input.to,
        claimId: input.claimId,
        template: {
          name: TEMPLATE_NAME,
          data: {
            name: input.name,
            dateLabel: input.dateLabel,
            month: input.month,
            day: input.day,
          },
        },
        attachments: [
          {
            filename: `scripture-card-${filename}`,
            path,
            cid: 'cardImage',
          },
        ],
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(this.db, COLLECTION), payload);
      return ok(undefined);
    } catch (error) {
      return err(mapFirestoreError(error));
    }
  }
}
