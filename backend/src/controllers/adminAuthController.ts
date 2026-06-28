import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { findStaffUserByEmail } from '../models';
import { badRequest, unauthorized } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    badRequest(res, 'Email and password are required');
    return;
  }

  const user = await findStaffUserByEmail(email);

  if (!user) {
    unauthorized(res, 'Invalid credentials');
    return;
  }

  if (!user.is_active) {
    unauthorized(res, 'Account is disabled');
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    unauthorized(res, 'Invalid credentials');
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, doctor_id: user.doctor_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      doctor_id: user.doctor_id,
    },
  });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    unauthorized(res);
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      doctor_id: req.user.doctor_id,
    },
  });
}
