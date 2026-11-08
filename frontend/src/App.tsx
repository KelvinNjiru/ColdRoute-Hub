import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sprout, Sun, BatteryMedium, Truck, Smartphone, RotateCcw, Plus, AlertTriangle } from 'lucide-react';
import { api, Batch, Summary } from './api';

// Palette: spruce (cold room), meadow (healthy), frost (page), harvest (action), alert (too warm)
const C = { spruce: '#12372f', meadow: '#5aa469', frost: '#eaf3ef', harvest: '#f2b134', alert: '#d64533', ink: '#14261f', soft: '#5d7268', line: '#d3e2db' };
const head = { fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" };
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b134]';
const CROPS: Record<string, { label: string; color: string }> = {
  TOMATOES: { label: 'Tomatoes', color: '#d64533' }, SUKUMA_WIKI_KALES: { label: 'Sukuma/Kales', color: '#3f8f4f' },
  EVENING_MILK: { label: 'Evening milk', color: '#6aa6d6' }, MANGOES: { label: 'Mangoes', color: '#f2b134' },
};

function Header({ s, onDone }: { s?: Summary; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (path: string) => {
    if (!s) return; setBusy(true);
    try { await api(`/hubs/${s.id}/${path}`, { method: 'POST' }); } catch (e) { alert((e as Error).message); }
    setBusy(false); onDone();
  };
  const pill = `rounded-full border border-white/25 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40 ${focus}`;
  return (
    <header style={{ background: C.spruce }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.harvest }}><Sprout size={20} color={C.spruce} /></span>
          <div><div className="text-xl font-extrabold leading-none text-white" style={head}>ColdRoute</div>
            <div className="text-xs text-white/60">Cold storage for Kenyan farms</div></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-2 flex items-center gap-2 text-sm text-white/70"><i className="h-2 w-2 rounded-full motion-reduce:animate-none animate-pulse" style={{ background: C.meadow }} />Live</span>
          <button className={pill} disabled={busy || !s} onClick={() => run('demo-book')}><Plus size={14} className="mr-1 inline" />30 crates</button>
          <button className={pill} disabled={busy || !s} onClick={() => { if (confirm('Delete all demo data?')) run('demo-reset'); }}><RotateCcw size={14} className="mr-1 inline" />Reset demo</button>
        </div>
      </div>
    </header>
  );
}

function Hero({ s }: { s: Summary }) {
  const t = s.currentTempCelsius, pos = Math.max(0, Math.min(100, (t / 15) * 100)), hot = s.tempAlert, safe = t >= 4 && t <= 8;
  const used = Math.min(s.totalCrateCapacity, s.occupiedCrates);
  const Read = ({ icon, v, l }: { icon: ReactNode; v: string; l: string }) => (
    <div className="flex items-center gap-2">{icon}<div><div className="font-bold leading-none text-white">{v}</div><div className="text-xs text-white/60">{l}</div></div></div>);
  return (<>
    {hot && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-white" style={{ background: C.alert }}><AlertTriangle size={18} />The chamber is above 10°C. The hub operator has been sent an SMS alert.</div>}
    <section className="grid gap-8 rounded-[28px] p-6 md:grid-cols-[1.1fr_1fr] md:p-9" style={{ background: C.spruce, color: C.frost }}>
      <div>
        <p className="text-sm text-white/70">{s.name}</p>
        <div className="mt-1 flex items-end gap-2">
          <span style={{ ...head, fontSize: 'clamp(64px,12vw,104px)', lineHeight: 1, fontWeight: 800, color: hot ? '#ff9b8d' : '#fff' }}>{t.toFixed(1)}</span>
          <span className="pb-3 text-2xl text-white/70">°C</span>
        </div>
        <p className="mt-1 text-white/80">{hot ? 'Too warm. Check the door and the cooling.' : safe ? 'Inside the safe range of 4 to 8°C.' : 'Outside the safe range of 4 to 8°C.'}</p>
        <div className="relative mt-6 h-3 rounded-full" style={{ background: 'linear-gradient(90deg,#7fb7d9 0 26.7%,#5aa469 26.7% 53.3%,#f2b134 53.3% 66.7%,#d64533 66.7% 100%)' }}>
          <div className="absolute -top-1.5 h-6 w-1.5 rounded-full bg-white shadow" style={{ left: `calc(${pos}% - 3px)` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/55"><span>0°</span><span>safe 4 to 8°</span><span>15°</span></div>
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
          <Read icon={<Sun size={22} color={C.harvest} />} v={`${Math.round(s.solarPowerWatts).toLocaleString()} W`} l="Solar power" />
          <Read icon={<BatteryMedium size={22} color={C.meadow} />} v={`${s.batteryPercentage}%`} l="Battery" />
          <Read icon={<Sprout size={22} color={C.meadow} />} v={`${s.pcmHoursRemaining.toFixed(1)} h`} l="Cooling reserve" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between"><span className="text-3xl font-extrabold text-white" style={head}>{used}<span className="text-base font-semibold text-white/60"> of {s.totalCrateCapacity} crates</span></span></div>
        <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(20,1fr)' }} role="img" aria-label={`${used} of ${s.totalCrateCapacity} crate spaces used`}>
          {Array.from({ length: s.totalCrateCapacity }, (_, i) => (
            <span key={i} className="aspect-square rounded-[3px]" style={{ background: i < used ? C.meadow : 'rgba(255,255,255,.12)' }} />))}
        </div>
        <p className="mt-3 text-sm text-white/70">{s.totalCrateCapacity - used} spaces free. Each square is one crate.</p>
      </div>
    </section>
  </>);
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
    <section>
      <h2 className="text-xl font-bold" style={head}>Try the farmer’s phone</h2>
      <p className="mb-3 mt-1 text-sm" style={{ color: C.soft }}>Dial, then reply 2, 1, 10, 3, 1 to store 10 crates of tomatoes for 3 days.</p>
      <div className="rounded-[2.5rem] p-3 pb-4" style={{ background: '#0c2822' }}>
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/20" />
        <pre className="min-h-[170px] whitespace-pre-wrap rounded-2xl p-4 font-mono text-sm" style={{ background: '#081a16', color: '#9ff0c6' }}>{screen}</pre>
        {live ? (
          <div className="mt-3 flex gap-2">
            <input aria-label="Your reply" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-white placeholder:text-white/40" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Your reply" />
            <button onClick={send} className={`rounded-full px-5 font-bold ${focus}`} style={{ background: C.harvest, color: C.ink }}>Send</button>
          </div>) : (
          <button onClick={dial} className={`mx-auto mt-3 flex items-center gap-2 rounded-full px-6 py-2.5 font-bold ${focus}`} style={{ background: C.harvest, color: C.ink }}><Smartphone size={18} />Dial *384*254#</button>)}
      </div>
      <h3 className="mb-2 mt-5 font-bold" style={head}>Messages to {phone}</h3>
      {sms.length ? sms.map((m) => <p key={m.at + m.message} className="mb-2 rounded-2xl rounded-bl-sm bg-white p-3 text-sm shadow-sm">{m.message}</p>) : <p className="text-sm" style={{ color: C.soft }}>No messages yet. Book a crate and your receipt appears here.</p>}
    </section>);
}

function Batches({ rows }: { rows: Batch[] }) {
  const days = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 864e5));
  return (
    <section>
      <h2 className="text-xl font-bold" style={head}>Crates in the cold room</h2>
      <ul className="mt-2">
        {rows.map((b) => { const c = CROPS[b.cropType] ?? { label: b.cropType, color: C.soft }; const stored = b.status === 'STORED'; return (
          <li key={b.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b py-3" style={{ borderColor: C.line }}>
            <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
            <div><div><b>{b.batchCode}</b> {b.farmer.fullName}</div><div className="text-sm" style={{ color: C.soft }}>{c.label}, day {days(b.checkInTimestamp) + 1}, {b.farmer.phoneNumber}</div></div>
            <div className="text-right"><div className="font-bold">{b.crateCount} crates</div>
              {b.litres ? <div className="text-xs" style={{ color: C.soft }}>{b.litres} litres of milk</div> : null}
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: stored ? '#d5eddc' : '#fde8b8', color: stored ? '#1f5c36' : '#7a5200' }}>{stored ? 'In cold room' : 'On the truck'}</span></div>
          </li>); })}
        {!rows.length && <li className="py-6" style={{ color: C.soft }}>Nothing stored yet. Book crates from the phone, or press 30 crates at the top.</li>}
      </ul>
    </section>);
}

function Dispatch({ s, onDone }: { s: Summary; onDone: () => void }) {
  const [f, setF] = useState({ vehiclePlate: 'KDA 391B', coolingPodId: 'POD-04', driverName: '', driverPhone: '' });
  const [msg, setMsg] = useState('');
  const labels = { vehiclePlate: 'Vehicle plate', coolingPodId: 'Cooling pod', driverName: 'Driver name', driverPhone: 'Driver phone' } as const;
  const go = async () => {
    try { const r = await api<{ notified: number }>('/dispatch', { method: 'POST', body: JSON.stringify({ hubId: s.id, ...f }) });
      setMsg(`The truck is on its way. ${r.notified} farmers were sent an SMS.`); onDone(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <section className="rounded-3xl p-5" style={{ background: '#fff3d3' }}>
      <h2 className="flex items-center gap-2 text-xl font-bold" style={head}><Truck size={20} />Send the shared truck</h2>
      <p className="mt-1 text-sm" style={{ color: '#6d5516' }}>{s.canDispatch ? `${s.storedCrates} crates are ready to go.` : `${s.storedCrates} crates stored. The truck can leave at 140.`}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <label key={k} className="text-xs" style={{ color: '#6d5516' }}>{labels[k]}
            <input className="mt-1 w-full rounded-lg border bg-white p-2 text-sm text-black" style={{ borderColor: '#ecd9a3' }} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>))}
      </div>
      <button disabled={!s.canDispatch || !f.driverName || !f.driverPhone} onClick={go} className={`mt-4 w-full rounded-full py-3 font-bold disabled:opacity-40 ${focus}`} style={{ background: C.harvest, color: C.ink }}>Send the truck</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>);
}

function Calculator() {
  const [n, setN] = useState(10), [d, setD] = useState(3);
  const broker = n * 350, cold = n * 900 - n * d * 30;
  return (
    <section>
      <h2 className="text-xl font-bold" style={head}>What the farmer earns</h2>
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm">Crates of tomatoes: <b>{n}</b><input type="range" min={1} max={50} value={n} onChange={(e) => setN(+e.target.value)} className="w-full accent-[#3f8f4f]" /></label>
          <label className="mt-3 block text-sm">Days in cold storage: <b>{d}</b><input type="range" min={1} max={7} value={d} onChange={(e) => setD(+e.target.value)} className="w-full accent-[#3f8f4f]" /></label>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#e2efe7' }}>
          <div className="flex justify-between text-sm"><span>Sell to a broker today</span><b style={{ color: C.alert }}>KSh {broker.toLocaleString()}</b></div>
          <div className="mt-1 flex justify-between text-sm"><span>Store, then sell at market</span><b style={{ color: '#1f6a3a' }}>KSh {cold.toLocaleString()}</b></div>
          <div className="mt-3 text-4xl font-extrabold" style={{ ...head, color: C.spruce }}>{(cold / broker).toFixed(1)}x <span className="text-base font-semibold">more income</span></div>
        </div>
      </div>
    </section>);
}

export default function App() {
  const [hubId, setHubId] = useState<string>(); const [s, setS] = useState<Summary>(); const [rows, setRows] = useState<Batch[]>([]); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { let id = hubId; if (!id) { id = (await api<{ id: string }[]>('/hubs'))[0]?.id; setHubId(id); }
      if (!id) return; const [sum, b] = await Promise.all([api<Summary>(`/hubs/${id}/summary`), api<Batch[]>(`/hubs/${id}/batches`)]); setS(sum); setRows(b); setErr('');
    } catch (e) { setErr((e as Error).message); }
  }, [hubId]);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
  return (
    <div className="min-h-screen" style={{ background: C.frost, color: C.ink, fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <Header s={s} onDone={load} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {err && <p className="mb-3 font-semibold" style={{ color: C.alert }}>{err}</p>}
        {!s && !err && <p style={{ color: C.soft }}>Waking up the hub. The first load can take a minute.</p>}
        {s && <>
          <Hero s={s} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[340px_1fr]">
            <div className="lg:sticky lg:top-6 lg:self-start"><PhoneSim onDone={load} /></div>
            <div className="space-y-8"><Batches rows={rows} /><Dispatch s={s} onDone={load} /><Calculator /></div>
          </div>
        </>}
      </main>
    </div>);
}