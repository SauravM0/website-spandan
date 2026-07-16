import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const accepted =
    incoming &&
    (/^[a-f0-9]{32}$/i.test(incoming) ||
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(incoming));
  const id = accepted ? incoming : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
