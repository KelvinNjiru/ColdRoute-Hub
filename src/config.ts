import 'dotenv/config';
export const cfg = {
  port: Number(process.env.PORT ?? 3000),
  atUser: process.env.AT_USERNAME ?? 'sandbox',
  atKey: process.env.AT_API_KEY ?? '',
  atSender: process.env.AT_SENDER_ID ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  apiKey: process.env.OPERATOR_API_KEY ?? 'dev-key',
  feePerCrateDay: 30,
  litresPerCrate: 20,
  dispatchMinCrates: 140,
  podCapacity: 160,
  alertTempC: 10,
};
