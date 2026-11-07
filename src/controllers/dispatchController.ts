import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { cfg } from '../config';
import { sendDepartureSms } from '../services/sms';

const schema = z.object({
  hubId: z.string().uuid(), vehiclePlate: z.string().min(3), coolingPodId: z.string().default('POD-04'),
  driverName: z.string().min(2), driverPhone: z.string().min(8),
  destinationMarket: z.string().default('Wakulima / Marikiti Nairobi'),
});

export async function createDispatch(req: Request, res: Response) {
  const t = schema.safeParse(req.body);
  if (!t.success) return res.status(400).json(t.error.flatten());
  const d = t.data;

  const result = await prisma.$transaction(async (tx) => {
    const batches = await tx.crateBatch.findMany({ where: { hubId: d.hubId, status: 'STORED' }, include: { farmer: true } });
    const crates = batches.reduce((s, b) => s + b.crateCount, 0);
    if (crates < cfg.dispatchMinCrates) return { error: `Need at least ${cfg.dispatchMinCrates} stored crates (have ${crates}).` };
    const n = (await tx.transitDispatch.count()) + 1;
    const dispatch = await tx.transitDispatch.create({ data: {
      tripCode: `TRIP-NAI-${String(n).padStart(3, '0')}`, vehiclePlate: d.vehiclePlate, coolingPodId: d.coolingPodId,
      driverName: d.driverName, driverPhone: d.driverPhone, destinationMarket: d.destinationMarket,
      aggregatedCrates: crates, departedAt: new Date(), status: 'DISPATCHED',
    }});
    await tx.crateBatch.updateMany({ where: { id: { in: batches.map((b) => b.id) } }, data: { status: 'IN_TRANSIT', transitDispatchId: dispatch.id } });
    await tx.hub.update({ where: { id: d.hubId }, data: { occupiedCrates: { decrement: crates } } });
    return { dispatch, batches };
  });

  if ('error' in result) return res.status(409).json({ error: result.error });
  // Fire SMS after commit so a gateway failure never rolls back the dispatch.
  await Promise.allSettled(result.batches.map((b) => sendDepartureSms(b.farmer.phoneNumber, b.batchCode, d.vehiclePlate)));
  res.status(201).json({ dispatch: result.dispatch, notified: result.batches.length });
}

export async function listDispatches(_req: Request, res: Response) {
  res.json(await prisma.transitDispatch.findMany({ orderBy: { departedAt: 'desc' }, take: 20 }));
}
