// Africa's Talking SMS with a mock fallback (no API key => log to console).
import { cfg } from '../config';
export const outbox: { to: string; message: string; at: string }[] = [];

const URL = cfg.atUser === 'sandbox'
  ? 'https://api.sandbox.africastalking.com/version1/messaging'
  : 'https://api.africastalking.com/version1/messaging';

export async function sendSms(to: string | string[], message: string): Promise<void> {
  const recipients = Array.isArray(to) ? to.join(',') : to;
  if (!cfg.atKey) { console.log(`[SMS MOCK] -> ${recipients}: ${message}`); return; }
  (Array.isArray(to) ? to : [to]).forEach((t) => outbox.unshift({ to: t, message, at: new Date().toISOString() }));
outbox.length = Math.min(outbox.length, 200);
  const body = new URLSearchParams({ username: cfg.atUser, to: recipients, message });
  if (cfg.atSender) body.set('from', cfg.atSender);
  const res = await fetch(URL, {
    method: 'POST',
    headers: { apiKey: cfg.atKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) console.error('[SMS ERROR]', res.status, await res.text());
}

export const sendSmsReceipt = (phone: string, batchCode: string, crop: string, crateCount: number, pin: string, hubName: string) =>
  sendSms(phone, `ColdRoute: Confirmed! ${crateCount} crates of ${crop} stored at ${hubName}. Batch #${batchCode}. Fee: KSh ${cfg.feePerCrateDay}/day. Verification PIN: ${pin}.`);

export const sendDepartureSms = (phone: string, batchCode: string, plate: string) =>
  sendSms(phone, `ColdRoute Transit: Your batch #${batchCode} is loaded onto Canter ${plate} with ColdPod. Departs 05:00 AM to Marikiti.`);

export const sendCriticalAlert = (phone: string, hubName: string, temp: number) =>
  sendSms(phone, `ColdRoute ALERT: ${hubName} chamber is ${temp.toFixed(1)}C (limit ${cfg.alertTempC}C). Check door and cooling now.`);
