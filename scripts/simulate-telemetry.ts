// Usage: HUB_ID=<uuid> npm run simulate   (set DOOR=1 to push temp above 10C)
const base = process.env.API ?? 'http://localhost:3000/api/v1';
const key = process.env.OPERATOR_API_KEY ?? 'dev-key';
const hub = process.env.HUB_ID!;
setInterval(async () => {
  const hot = process.env.DOOR === '1';
  const body = { hub_id: hub, current_temp: hot ? 11.5 : 5.4 + Math.random() * 1.2, solar_power: 3600 + Math.random() * 500,
    battery_pct: 85, door_open_events: hot ? 1 : 0 };
  const r = await fetch(`${base}/telemetry/hub`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key }, body: JSON.stringify(body) });
  console.log(r.status, body.current_temp.toFixed(1));
}, 3000);
