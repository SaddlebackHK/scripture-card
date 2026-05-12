import { FirebaseError } from 'firebase/app';
import {
  type DomainError,
  UnauthorizedError,
  UnexpectedError,
  ValidationError,
} from '@domain/errors';

export const mapFirestoreError = (error: unknown): DomainError => {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return new UnauthorizedError('沒有權限執行此操作。', { cause: error });
    }
    if (error.code === 'invalid-argument') {
      return new ValidationError(error.message, { cause: error });
    }
    return new UnexpectedError(error.message, { cause: error });
  }
  if (error instanceof Error) {
    return new UnexpectedError(error.message, { cause: error });
  }
  return new UnexpectedError('未知錯誤。');
};
