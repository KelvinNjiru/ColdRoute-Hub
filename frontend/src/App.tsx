import { useCallback, useEffect, useState } from 'react';
import { Thermometer, Sun, BatteryMedium, Boxes, Truck, AlertTriangle } from 'lucide-react';
import { api, Batch, Summary } from './api';

const card = 'rounded-xl border border-slate-200 bg-white p-4';

function Stat({ icon, label, value, bad }: { icon: React.ReactNode; label: string; value: string; bad?: boolean }) {
  return (<div className={card}><div className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</div>
    <div className={`mt-1 text-3xl font-bold ${bad ? 'text-red-600' : 'text-slate-900'}`}>{value}</div></div>);
}

function Summaries({ s }: { s: Summary }) {
  const pct = Math.min(100, (s.occupiedCrates / s.totalCrateCapacity) * 100);
  const inZone = s.currentTempCelsius >= 4 && s.currentTempCelsius <= 8;
  return (<>
    {s.tempAlert && <div role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-100 p-3 font-semibold text-red-700"><AlertTriangle size={18} />Chamber above 10°C. Operator SMS alert has been sent.</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={<Thermometer size={16} />} label={inZone ? 'Chamber (green zone)' : 'Chamber'} value={`${s.currentTempCelsius.toFixed(1)}°C`} bad={s.tempAlert} />
      <Stat icon={<Sun size={16} />} label="Solar generation" value={`${Math.round(s.solarPowerWatts).toLocaleString()} W`} />
      <Stat icon={<BatteryMedium size={16} />} label={`Battery (PCM ${s.pcmHoursRemaining.toFixed(1)} h)`} value={`${s.batteryPercentage}%`} />
      <Stat icon={<Boxes size={16} />} label="Crates" value={`${s.occupiedCrates}/${s.totalCrateCapacity}`} />
    </div>
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} /></div>
  </>);
}

function BatchTable({ rows }: { rows: Batch[] }) {
  const days = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 864e5));
  return (<div className={`${card} overflow-x-auto`}><h2 className="mb-2 font-semibold">Live batches</h2>
    <table className="w-full text-left text-sm"><thead className="text-slate-500"><tr>{['Batch', 'Farmer', 'Phone', 'Crop', 'Crates', 'Days stored', 'Status'].map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead>
      <tbody>{rows.map((b) => (<tr key={b.id} className="border-t">
        <td className="py-1 pr-3 font-medium">{b.batchCode}</td><td className="pr-3">{b.farmer.fullName}</td><td className="pr-3">{b.farmer.phoneNumber}</td>
        <td className="pr-3">{b.cropType.replace(/_/g, ' ').toLowerCase()}</td><td className="pr-3">{b.crateCount}</td><td className="pr-3">{days(b.checkInTimestamp)}</td>
        <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === 'STORED' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>{b.status.replace('_', ' ')}</span></td></tr>))}
        {!rows.length && <tr><td colSpan={7} className="py-3 text-slate-500">No batches yet. Book one by USSD or walk-in check-in.</td></tr>}
      </tbody></table></div>);
}

function DispatchPanel({ s, onDone }: { s: Summary; onDone: () => void }) {
  const [f, setF] = useState({ vehiclePlate: 'KDA 391B', coolingPodId: 'POD-04', driverName: '', driverPhone: '' });
  const [msg, setMsg] = useState('');
  const go = async () => {
    try { const r = await api<{ notified: number }>('/dispatch', { method: 'POST', body: JSON.stringify({ hubId: s.id, ...f }) });
      setMsg(`Dispatched. ${r.notified} farmers notified by SMS.`); onDone(); } catch (e) { setMsg((e as Error).message); }
  };
  return (<div className={card}><h2 className="mb-2 flex items-center gap-2 font-semibold"><Truck size={18} />Shared dispatch</h2>
    <div className="grid grid-cols-2 gap-2">{(['vehiclePlate', 'coolingPodId', 'driverName', 'driverPhone'] as const).map((k) => (
      <input key={k} className="rounded border p-2 text-sm" placeholder={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />))}</div>
    <button disabled={!s.canDispatch || !f.driverName || !f.driverPhone} onClick={go} className="mt-3 w-full rounded-lg bg-teal-700 p-2 font-semibold text-white disabled:opacity-40">
      Trigger shared dispatch ({s.storedCrates} stored{s.canDispatch ? '' : ', needs 140'})</button>
    {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}</div>);
}

function Calculator() {
  const [n, setN] = useState(10), [d, setD] = useState(3);
  const broker = n * 350, cold = n * 900 - n * d * 30, delta = ((cold - broker) / broker) * 100;
  return (<div className={card}><h2 className="mb-2 font-semibold">Farmer net income uplift</h2>
    <label className="block text-sm">Crates: <b>{n}</b><input type="range" min={1} max={50} value={n} onChange={(e) => setN(+e.target.value)} className="w-full" /></label>
    <label className="block text-sm">Days stored: <b>{d}</b><input type="range" min={1} max={7} value={d} onChange={(e) => setD(+e.target.value)} className="w-full" /></label>
    <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div><div className="text-xs text-slate-500">Broker</div><b className="text-red-600">KSh {broker.toLocaleString()}</b></div>
      <div><div className="text-xs text-slate-500">ColdRoute</div><b className="text-green-700">KSh {cold.toLocaleString()}</b></div>
      <div><div className="text-xs text-slate-500">Margin delta</div><b>+{delta.toFixed(0)}%</b></div></div></div>);
}
function DemoControls({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (path: string) => {
    setBusy(true);
    try { await api(`/hubs/${id}/${path}`, { method: 'POST' }); } catch (e) { alert((e as Error).message); }
    setBusy(false); onDone();
  };
  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => run('demo-book')} className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-semibold text-teal-800 disabled:opacity-40">+30 crates (demo farmer)</button>
      <button disabled={busy} onClick={() => { if (confirm('Delete all demo data?')) run('demo-reset'); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40">Reset demo</button>
    </div>
  );
}
function PhoneSim({ onDone }: { onDone: () => void }) {
  const [phone] = useState(() => `+2547${Math.floor(10000000 + Math.random() * 89999999)}`);
  const [sid, setSid] = useState(''); const [parts, setParts] = useState<string[]>([]);
  const [screen, setScreen] = useState('Press Dial to start.'); const [live, setLive] = useState(false);
  const [input, setInput] = useState(''); const [sms, setSms] = useState<{ message: string; at: string }[]>([]);
  const ussd = async (id: string, p: string[]) => {
    const r = await fetch('/api/v1/ussd', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sessionId: id, serviceCode: '*384*254#', phoneNumber: phone, text: p.join('*') }) });
    const t = await r.text(); setScreen(t.slice(4)); const end = t.startsWith('END'); setLive(!end);
    if (end) { setParts([]); onDone(); }
  };
  const dial = () => { const id = 'web-' + Date.now(); setSid(id); setParts([]); ussd(id, []); };
  const send = () => { if (!input) return; const p = [...parts, input]; setParts(p); setInput(''); ussd(sid, p); };
  useEffect(() => { const t = setInterval(() => api<{ message: string; at: string }[]>(`/outbox?to=${encodeURIComponent(phone)}`).then(setSms).catch(() => {}), 2000); return () => clearInterval(t); }, [phone]);
  return (
    <div className={card}><h2 className="mb-1 font-semibold">Try it: farmer’s phone ({phone})</h2>
      <p className="mb-2 text-sm text-slate-500">Dial, then reply 2, 1, 10, 3, 1 to book 10 crates of tomatoes for 3 days.</p>
      <pre className="min-h-[120px] whitespace-pre-wrap rounded-lg bg-slate-900 p-3 font-mono text-sm text-emerald-300">{screen}</pre>
      {live ? (<div className="mt-2 flex gap-2"><input className="flex-1 rounded border p-2" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Your reply" /><button onClick={send} className="rounded-lg bg-teal-700 px-4 font-semibold text-white">Send</button></div>)
        : (<button onClick={dial} className="mt-2 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Dial *384*254#</button>)}
      <h3 className="mt-3 text-sm font-semibold">SMS inbox</h3>
      {sms.length ? sms.map((m) => <p key={m.at + m.message} className="mt-1 rounded bg-slate-100 p-2 text-sm">{m.message}</p>) : <p className="text-sm text-slate-500">No messages yet.</p>}
    </div>);
}
export default function App() {
  const [hubId, setHubId] = useState<string>(); const [s, setS] = useState<Summary>(); const [rows, setRows] = useState<Batch[]>([]); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { let id = hubId; if (!id) { id = (await api<{ id: string }[]>('/hubs'))[0]?.id; setHubId(id); }
      if (!id) return; const [sum, b] = await Promise.all([api<Summary>(`/hubs/${id}/summary`), api<Batch[]>(`/hubs/${id}/batches`)]); setS(sum); setRows(b); setErr('');
    } catch (e) { setErr((e as Error).message); }
  }, [hubId]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]); // polling; swap for SSE/WebSocket later
  return (<main className="mx-auto max-w-5xl space-y-4 p-4"><h1 className="text-2xl font-bold">{s?.name ?? 'ColdRoute hub'}</h1>
    {err && <p className="text-red-600">{err}</p>}
    {s && <><Summaries s={s} /><DemoControls id={s.id} onDone={load} /><PhoneSim onDone={load} /><BatchTable rows={rows} /><div className="grid gap-4 md:grid-cols-2"><DispatchPanel s={s} onDone={load} /><Calculator /></div></>}
  </main>);
}
