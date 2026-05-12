import type { Result } from '@shared/result';
import { err, ok } from '@shared/result';
import { ValidationError } from '@domain/errors';

export interface ClaimRequestProps {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly month: number;
  readonly day: number;
  readonly createdAt: Date;
}

const trim = (s: string) => s.trim();

const NAME_MAX = 60;
const EMAIL_MAX = 254;
const PHONE_MIN = 5;
const PHONE_MAX = 20;
const PHONE_ALLOWED = /^[\d\s+()-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ClaimRequest = {
  create(input: {
    name: string;
    email: string;
    phone?: string | null;
    month: number;
    day: number;
    createdAt?: Date;
  }): Result<ClaimRequestProps, ValidationError> {
    const name = trim(input.name);
    if (name.length === 0) return err(new ValidationError('請填寫姓名'));
    if (name.length > NAME_MAX) return err(new ValidationError('姓名過長'));

    const email = trim(input.email);
    if (email.length === 0) return err(new ValidationError('請填寫電郵地址'));
    if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
      return err(new ValidationError('請輸入有效的電郵地址'));
    }

    let phone: string | null = null;
    const rawPhone = input.phone ? trim(input.phone) : '';
    if (rawPhone.length > 0) {
      if (
        rawPhone.length < PHONE_MIN ||
        rawPhone.length > PHONE_MAX ||
        !PHONE_ALLOWED.test(rawPhone)
      ) {
        return err(new ValidationError('請輸入有效的聯絡電話'));
      }
      phone = rawPhone;
    }

    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      return err(new ValidationError('日期月份不正確'));
    }
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
      return err(new ValidationError('日期日子不正確'));
    }

    return ok({
      name,
      email,
      phone,
      month: input.month,
      day: input.day,
      createdAt: input.createdAt ?? new Date(),
    });
  },
};

export type ClaimRequest = ClaimRequestProps;
