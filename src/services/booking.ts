import { randomInt } from 'crypto';
import { CropType } from '@prisma/client';
import { prisma } from '../db';
import { cfg } from '../config';
import { sendSmsReceipt } from './sms';

export class NoCapacityError extends Error {}

export const CROPS: { key: CropType; label: string }[] = [
  { key: 'TOMATOES', label: 'Tomatoes' },
  { key: 'SUKUMA_WIKI_KALES', label: 'Sukuma/Kales' },
  { key: 'EVENING_MILK', label: 'Evening Milk' },
  { key: 'MANGOES', label: 'Mangoes' },
];

export async function createBooking(a: { hubId: string; phone: string; name?: string; crop: CropType; crates: number; litres?: number; days: number }) {
  const total = a.crates * a.days * cfg.feePerCrateDay;
  const { batch, hub } = await prisma.$transaction(async (tx) => {
    // Atomic capacity guard: only succeeds if there is room.
    const updated = await tx.$executeRaw`UPDATE "Hub" SET "occupiedCrates" = "occupiedCrates" + ${a.crates}
      WHERE id = ${a.hubId}::uuid AND "occupiedCrates" + ${a.crates} <= "totalCrateCapacity"`;
    if (updated === 0) throw new NoCapacityError();
    const hub = await tx.hub.findUniqueOrThrow({ where: { id: a.hubId } });
    const farmer = await tx.farmer.upsert({
      where: { phoneNumber: a.phone }, update: {},
      create: { phoneNumber: a.phone, fullName: a.name ?? 'ColdRoute farmer', locationCounty: hub.county },
    });
    const created = await tx.crateBatch.create({ data: {
      batchCode: `TMP-${Date.now()}-${randomInt(1e6)}`, farmerId: farmer.id, hubId: hub.id, cropType: a.crop,
      crateCount: a.crates, litres: a.litres ?? null,
      feePerCrateDay: cfg.feePerCrateDay, durationDays: a.days, totalStorageFee: total,
      collectionPin: String(randomInt(1000, 10000)),
    }});
    const batch = await tx.crateBatch.update({ where: { id: created.id }, data: { batchCode: `CR-${created.seq}` } });
    return { batch, hub };
  });
  const label = CROPS.find((c) => c.key === a.crop)!.label;
  const quantity = a.litres ? `${a.litres} litres (${a.crates} crates)` : `${a.crates} crates`;
  sendSmsReceipt(a.phone, batch.batchCode, label, quantity, batch.collectionPin, hub.name).catch(console.error);
  return batch;
}
