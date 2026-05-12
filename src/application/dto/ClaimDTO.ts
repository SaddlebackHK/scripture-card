export interface ClaimRequestInputDTO {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly month: number;
  readonly day: number;
}

export interface ClaimRequestDTO {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly month: number;
  readonly day: number;
  readonly createdAt: string;
}
