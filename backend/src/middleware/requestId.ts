import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
