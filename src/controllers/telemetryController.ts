import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { cfg } from '../config';
import { setOnce } from '../services/kv';
import { sendCriticalAlert } from '../services/sms';

const hubSchema = z.object({
  hub_id: z.string().uuid(), current_temp: z.number(), solar_power: z.number().min(0),
  battery_pct: z.number().int().min(0).max(100), door_open_events: z.number().int().min(0).default(0),
  pcm_hours_remaining: z.number().optional(),
});
const transitSchema = z.object({
  dispatch_id: z.string().uuid(), vehicle_lat: z.number(), vehicle_lng: z.number(), pod_temp: z.number(),
});

export async function hubTelemetry(req: Request, res: Response) {
  const t = hubSchema.safeParse(req.body);
  if (!t.success) return res.status(400).json(t.error.flatten());
  const d = t.data;
  const hub = await prisma.hub.update({ where: { id: d.hub_id }, data: {
    currentTempCelsius: d.current_temp, solarPowerWatts: d.solar_power, batteryPercentage: d.battery_pct,
    doorOpenEvents: { increment: d.door_open_events },
    ...(d.pcm_hours_remaining !== undefined && { pcmHoursRemaining: d.pcm_hours_remaining }),
  }});
  let alerted = false;
  if (d.current_temp > cfg.alertTempC && (await setOnce(`alert:hub:${hub.id}`, 15 * 60))) { // max 1 SMS / 15 min
    await sendCriticalAlert(hub.operatorPhone, hub.name, d.current_temp);
    alerted = true;
  }
  res.json({ ok: true, alerted });
}

export async function transitTelemetry(req: Request, res: Response) {
  const t = transitSchema.safeParse(req.body);
  if (!t.success) return res.status(400).json(t.error.flatten());
  const d = t.data;
  await prisma.transitDispatch.update({ where: { id: d.dispatch_id }, data: {
    lastLat: d.vehicle_lat, lastLng: d.vehicle_lng, internalTransitTemp: d.pod_temp,
  }});
  res.json({ ok: true });
}
