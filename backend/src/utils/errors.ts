import { Response } from 'express';

export function badRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

export function unauthorized(res: Response, message = 'Authentication required'): void {
  res.status(401).json({ error: message });
}

export function forbidden(res: Response, message = 'Access denied'): void {
  res.status(403).json({ error: message });
}

export function notFound(res: Response, message = 'Resource not found'): void {
  res.status(404).json({ error: message });
}

export function tooMany(res: Response, message = 'Rate limit exceeded'): void {
  res.status(429).json({ error: message });
}

export function serverError(res: Response, message = 'Internal server error'): void {
  res.status(500).json({ error: message });
}
