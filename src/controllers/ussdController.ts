// Africa's Talking USSD webhook: POST /api/v1/ussd  (form-encoded: sessionId, serviceCode, phoneNumber, text)
import { Request, Response } from 'express';
import { prisma } from '../db';
import { cfg } from '../config';
import { setOnce } from '../services/kv';
import { createBooking, CROPS, NoCapacityError } from '../services/booking';

const ROOT = `CON Welcome to ColdRoute Kenya
1. Check Hub Space
2. Book Cold Crate Storage
3. Check Shared Transit Schedule
4. Wholesale Market Spot Prices`;

async function route(sessionId: string, phone: string, text: string): Promise<string> {
  const p = text ? text.split('*') : [];
  if (!p.length) return ROOT;
  const hub = await prisma.hub.findFirst();
  if (!hub) return 'END Service not configured. Try later.';
  const free = hub.totalCrateCapacity - hub.occupiedCrates;

  switch (p[0]) {
    case '1': {
      const solar = hub.solarPowerWatts > 500 ? 'Optimal' : 'Low';
      return `END Hub Kiambu: ${free}/${hub.totalCrateCapacity} crates available. Chamber: ${hub.currentTempCelsius.toFixed(1)}°C. Solar: ${solar}. Dial *384*254# to book.`;
    }
    case '2': {
      if (p.length === 1) return `CON Select Crop:\n${CROPS.map((c, i) => `${i + 1}. ${c.label}`).join('\n')}`;
      const crop = CROPS[Number(p[1]) - 1];
      if (!crop) return 'END Invalid crop. Dial *384*254# to retry.';
      const isMilk = crop.key === 'EVENING_MILK';
      if (p.length === 2) return isMilk ? 'CON Enter litres of milk (1-600):' : 'CON Enter number of crates (1-30):';
      const qty = Number(p[2]);
      const crates = isMilk ? Math.ceil(qty / cfg.litresPerCrate) : qty;
      if (!Number.isInteger(qty) || qty < 1 || crates < 1 || crates > 30)
      return isMilk ? 'END Litres must be 1 to 600. Please retry.' : 'END Crates must be 1 to 30. Please retry.';
      if (crates > free) return `END Only ${free} crates free at Kiambu Hub.`;
      if (p.length === 3) return 'CON Enter storage days (1-7 days):';
      const days = Number(p[3]);
      if (!Number.isInteger(days) || days < 1 || days > 7) return 'END Days must be 1 to 7. Please retry.';
      const fee = crates * days * cfg.feePerCrateDay;
     const what = isMilk ? `${qty} litres (${crates} crates)` : `${crates} crates`;
      if (p.length === 4) return `CON Confirm booking of ${what} of ${crop.label} for ${days} days at KSh ${fee}?\n1. Yes\n2. Cancel`;
      if (p[4] !== '1') return 'END Booking cancelled.';
      // Idempotency: a network retry of the same session must not double-book.
      if (!(await setOnce(`ussd:confirm:${sessionId}`, 300))) return 'END Booking already processed. Check your SMS.';
      try {
        const b = await createBooking({ hubId: hub.id, phone, crop: crop.key, crates, days });
        return `END Booking Confirmed! Batch: ${b.batchCode}. PIN: ${b.collectionPin}. Check your SMS for receipt.`;
      } catch (e) {
        if (e instanceof NoCapacityError) return 'END Hub just filled up. Please try another hub or later.';
        throw e;
      }
    }
    case '3': {
      const agg = await prisma.crateBatch.aggregate({ where: { hubId: hub.id, status: 'STORED' }, _sum: { crateCount: true } });
      return `END Next pooled truck pod departs at 05:00 AM to Marikiti. Current fill: ${agg._sum.crateCount ?? 0}/${cfg.podCapacity} crates. Space confirmed.`;
    }
    case '4':
      return 'END Today at Marikiti: Tomatoes: KSh 920/crate | Sukuma: KSh 600/bag | Fresh Milk: KSh 52/L. Dial 2 to book storage.';
    default:
      return 'END Invalid choice. Dial *384*254# to retry.';
  }
}

export async function ussdHandler(req: Request, res: Response) {
  const { sessionId = '', phoneNumber = '', text = '' } = req.body ?? {};
  res.type('text/plain');
  try { res.send(await route(sessionId, phoneNumber, text)); }
  catch (e) { console.error('[USSD]', e); res.send('END Service busy. Please try again.'); }
}
