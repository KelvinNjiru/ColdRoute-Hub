import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { cfg } from '../config';
import { createBooking, NoCapacityError } from '../services/booking';
import { randomInt } from 'crypto';

export const listHubs = async (_: Request, res: Response) => res.json(await prisma.hub.findMany());

export async function hubSummary(req: Request, res: Response) {
  const hub = await prisma.hub.findUnique({ where: { id: req.params.id } });
  if (!hub) return res.status(404).json({ error: 'Hub not found' });
  const agg = await prisma.crateBatch.aggregate({ where: { hubId: hub.id, status: 'STORED' }, _sum: { crateCount: true } });
  const stored = agg._sum.crateCount ?? 0;
  res.json({ ...hub, storedCrates: stored, canDispatch: stored >= cfg.dispatchMinCrates, tempAlert: hub.currentTempCelsius > cfg.alertTempC });
}

export async function hubBatches(req: Request, res: Response) {
  const batches = await prisma.crateBatch.findMany({
    where: { hubId: req.params.id, status: { in: ['STORED', 'IN_TRANSIT'] } },
    include: { farmer: { select: { fullName: true, phoneNumber: true } } },
    orderBy: { checkInTimestamp: 'desc' }, take: 100,
  });
  res.json(batches);
}

const checkinSchema = z.object({
  phone: z.string().regex(/^\+254\d{9}$/, 'Use E.164, e.g. +254712345678'), name: z.string().min(2),
  crop: z.enum(['TOMATOES', 'SUKUMA_WIKI_KALES', 'EVENING_MILK', 'MANGOES']),
  crates: z.number().int().min(1).max(30), days: z.number().int().min(1).max(7),
});

export async function walkInCheckin(req: Request, res: Response) {
  const t = checkinSchema.safeParse(req.body);
  if (!t.success) return res.status(400).json(t.error.flatten());
  try { res.status(201).json(await createBooking({ hubId: req.params.id, ...t.data })); }
  catch (e) { if (e instanceof NoCapacityError) return res.status(409).json({ error: 'Not enough free crates' }); throw e; }
}
// Demo helpers: disabled when NODE_ENV=production.
export async function demoReset(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') return res.status(403).json({ error: 'Disabled in production' });
  await prisma.$transaction([
    prisma.crateBatch.deleteMany(),
    prisma.transitDispatch.deleteMany(),
    prisma.farmer.deleteMany(),
    prisma.hub.update({ where: { id: req.params.id }, data: { occupiedCrates: 0, currentTempCelsius: 5.4 } }),
  ]);
  res.json({ ok: true });
}

export async function demoBook(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') return res.status(403).json({ error: 'Disabled in production' });
  try {
    const b = await createBooking({ hubId: req.params.id, phone: `+2547${randomInt(10000000, 99999999)}`,
      name: 'Demo farmer', crop: 'TOMATOES', crates: 30, days: 3 });
    res.status(201).json(b);
  } catch (e) {
    if (e instanceof NoCapacityError) return res.status(409).json({ error: 'Hub is full' });
    throw e;
  }
}