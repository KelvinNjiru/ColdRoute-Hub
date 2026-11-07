const KEY = import.meta.env.VITE_API_KEY ?? 'dev-key';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-api-key': KEY, ...init?.headers } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? 'Request failed');
  return body as T;
}
export type Summary = { id: string; name: string; totalCrateCapacity: number; occupiedCrates: number; currentTempCelsius: number;
  solarPowerWatts: number; batteryPercentage: number; pcmHoursRemaining: number; storedCrates: number; canDispatch: boolean; tempAlert: boolean };
export type Batch = { id: string; batchCode: string; cropType: string; crateCount: number; status: 'STORED' | 'IN_TRANSIT' | string;
  checkInTimestamp: string; farmer: { fullName: string; phoneNumber: string } };
