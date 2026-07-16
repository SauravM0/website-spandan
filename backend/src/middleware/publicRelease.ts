import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export type PublicCommerceMode = 'disabled' | 'staff_pilot' | 'public';

function secretsMatch(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function publicCommerceDecision(
  mode: PublicCommerceMode,
  candidatePilotToken = '',
  expectedPilotToken = ''
): 'allow' | 'disabled' | 'pilot_token_required' {
  if (mode === 'public') return 'allow';
  if (mode === 'disabled') return 'disabled';
  return expectedPilotToken && secretsMatch(candidatePilotToken, expectedPilotToken)
    ? 'allow'
    : 'pilot_token_required';
}

/** Fail-closed gate for new public bookings, orders, and payment starts. */
export function requirePublicCommerceAccess(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const suppliedToken = request.get('x-staff-pilot-token') || '';
  const decision = publicCommerceDecision(
    config.publicRelease.commerceMode,
    suppliedToken,
    config.publicRelease.staffPilotToken
  );
  if (decision === 'allow') {
    next();
    return;
  }
  response.status(503).json({
    error: 'PUBLIC_COMMERCE_UNAVAILABLE',
    message:
      decision === 'disabled'
        ? 'Online booking is temporarily unavailable.'
        : 'Online booking is currently limited to the staff pilot.',
  });
}
