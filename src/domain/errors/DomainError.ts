// Base class for all domain-layer errors.
// Concrete domain errors extend this class so the application layer can branch on `kind`
// without leaking infrastructure details (HTTP status codes, Firebase error codes, etc.).
export abstract class DomainError extends Error {
  abstract readonly kind: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = 'NotFound' as const;
}

export class ValidationError extends DomainError {
  readonly kind = 'Validation' as const;
}

export class UnauthorizedError extends DomainError {
  readonly kind = 'Unauthorized' as const;
}

export class UnexpectedError extends DomainError {
  readonly kind = 'Unexpected' as const;
}
