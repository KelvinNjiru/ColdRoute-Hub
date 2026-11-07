import { Request, Response, NextFunction } from 'express';
import { cfg } from '../config';
// MVP auth: shared operator key. Replace with real login (JWT/Supabase Auth) before scaling.
export function requireKey(req: Request, res: Response, next: NextFunction) {
  if (req.header('x-api-key') !== cfg.apiKey) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
