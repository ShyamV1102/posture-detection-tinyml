import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_HISTORY = Array.from({ length: 48 }, (_, i) => ({
  time: new Date(Date.now() - (47 - i) * 30 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  temperature: +(22 + Math.sin(i / 5) * 4 + Math.random()).toFixed(1),
  humidity: +(55 + Math.cos(i / 6) * 12 + Math.random()).toFixed(1),
  pressure: +(1013 + Math.sin(i / 8) * 8 + Math.random() * 2).toFixed(1),
}));

const BLE_DEVICES = [
  { id: "nano-1", name: "Arduino Nano 33 BLE", rssi: -52, status: "available" },
  { id: "nano-2", name: "Nano Sensor #2", rssi: -71, status: "available" },
  { id: "nano-3", name: "BLE Device (Unknown)", rssi: -84, status: "available" },
];

const SCREENS = { AUTH: "auth", SCAN: "scan", DASHBOARD: "dashboard", HISTORY: "history", PROFILE: "profile" };

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080c10;
    --surface: #0d1520;
    --surface2: #111d2e;
    --border: #1a2d45;
    --cyan: #00e5ff;
    --cyan-dim: rgba(0,229,255,0.12);
    --amber: #ffab00;
    --amber-dim: rgba(255,171,0,0.12);
    --green: #00e676;
    --red: #ff1744;
    --text: #e2ecf8;
    --muted: #4a6680;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-display); }

  .app-shell {
    width: 390px;
    height: 844px;
    background: var(--bg);
    overflow: hidden;
    position: relative;
    border-radius: 44px;
    box-shadow: 0 0 0 1px var(--border), 0 40px 120px rgba(0,0,0,0.8), 0 0 80px rgba(0,229,255,0.05);
    display: flex;
    flex-direction: column;
  }

  .screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: fadeSlide 0.3s ease;
  }

  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── GRID NOISE BACKGROUND ── */
  .noise-bg {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 0 24px 24px; }

  /* ── AUTH SCREEN ── */
  .auth-hero {
    padding: 60px 24px 32px;
    position: relative;
    z-index: 1;
  }
  .auth-logo {
    width: 56px; height: 56px;
    border: 2px solid var(--cyan);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; margin-bottom: 20px;
    box-shadow: 0 0 24px rgba(0,229,255,0.3), inset 0 0 16px rgba(0,229,255,0.08);
  }
  .auth-title { font-size: 32px; font-weight: 800; line-height: 1.1; letter-spacing: -1px; }
  .auth-title span { color: var(--cyan); }
  .auth-sub { color: var(--muted); font-size: 13px; margin-top: 6px; font-family: var(--font-mono); }

  .tab-row {
    display: flex; gap: 4px; background: var(--surface2);
    border-radius: 12px; padding: 4px; margin-bottom: 28px;
  }
  .tab-btn {
    flex: 1; padding: 10px; border: none; border-radius: 9px;
    font-family: var(--font-display); font-weight: 700; font-size: 14px;
    cursor: pointer; transition: all 0.2s;
    background: transparent; color: var(--muted);
  }
  .tab-btn.active { background: var(--cyan); color: #000; }

  .field { margin-bottom: 16px; }
  .field label { font-size: 11px; font-family: var(--font-mono); color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; display: block; margin-bottom: 6px; }
  .field input {
    width: 100%; padding: 14px 16px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text);
    font-family: var(--font-mono); font-size: 14px;
    outline: none; transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,229,255,0.1); }

  .btn-primary {
    width: 100%; padding: 16px;
    background: var(--cyan); color: #000;
    border: none; border-radius: 14px;
    font-family: var(--font-display); font-weight: 800; font-size: 16px;
    cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em;
    margin-top: 8px;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,229,255,0.3); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* ── STATUS BAR ── */
  .status-bar {
    padding: 14px 24px 0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; font-family: var(--font-mono); color: var(--muted);
    position: relative; z-index: 1;
  }
  .ble-dot {
    width: 8px; height: 8px; border-radius: 50%;
    display: inline-block; margin-right: 6px;
    animation: pulse 2s infinite;
  }
  .ble-dot.connected { background: var(--green); box-shadow: 0 0 8px var(--green); }
  .ble-dot.scanning { background: var(--amber); box-shadow: 0 0 8px var(--amber); }
  .ble-dot.disconnected { background: var(--muted); }
  @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }

  /* ── SCAN SCREEN ── */
  .scan-header { padding: 20px 24px 16px; position: relative; z-index: 1; }
  .scan-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .scan-sub { color: var(--muted); font-size: 12px; font-family: var(--font-mono); margin-top: 4px; }

  .scan-radar {
    width: 160px; height: 160px;
    margin: 0 auto 28px;
    position: relative;
    display: flex; align-items: center; justify-content: center;
  }
  .radar-ring {
    position: absolute; border-radius: 50%; border: 1px solid;
    opacity: 0; animation: radarPing 2.4s ease-out infinite;
  }
  .radar-ring:nth-child(1) { width: 60px; height: 60px; border-color: rgba(0,229,255,0.6); animation-delay: 0s; }
  .radar-ring:nth-child(2) { width: 100px; height: 100px; border-color: rgba(0,229,255,0.4); animation-delay: 0.5s; }
  .radar-ring:nth-child(3) { width: 140px; height: 140px; border-color: rgba(0,229,255,0.2); animation-delay: 1s; }
  @keyframes radarPing {
    0% { opacity: 1; transform: scale(0.4); }
    100% { opacity: 0; transform: scale(1); }
  }
  .radar-core {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--cyan-dim); border: 2px solid var(--cyan);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; position: relative; z-index: 1;
    box-shadow: 0 0 20px rgba(0,229,255,0.4);
  }

  .device-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 16px; margin-bottom: 10px;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 14px;
  }
  .device-card:hover { border-color: var(--cyan); background: var(--surface2); transform: translateX(2px); }
  .device-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--cyan-dim); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 20px;
    flex-shrink: 0;
  }
  .device-name { font-weight: 700; font-size: 14px; }
  .device-meta { font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin-top: 3px; }
  .rssi-bar { display: flex; gap: 2px; align-items: flex-end; margin-left: auto; flex-shrink: 0; }
  .rssi-seg { width: 4px; border-radius: 1px; transition: background 0.3s; }

  .btn-scan {
    width: 100%; padding: 14px;
    background: var(--cyan-dim); color: var(--cyan);
    border: 1px solid var(--cyan); border-radius: 14px;
    font-family: var(--font-display); font-weight: 700; font-size: 14px;
    cursor: pointer; transition: all 0.2s; margin-bottom: 16px; letter-spacing: 0.04em;
  }
  .btn-scan:hover { background: rgba(0,229,255,0.2); }

  /* ── DASHBOARD ── */
  .dash-header {
    padding: 20px 24px 0; position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: space-between;
  }
  .dash-title { font-size: 22px; font-weight: 800; }
  .connected-badge {
    font-family: var(--font-mono); font-size: 10px; padding: 4px 10px;
    border-radius: 20px; background: rgba(0,230,118,0.1); color: var(--green);
    border: 1px solid rgba(0,230,118,0.3); letter-spacing: 0.06em;
  }

  .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .metric-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 18px; padding: 18px 16px; position: relative; overflow: hidden;
    transition: transform 0.2s;
  }
  .metric-card:hover { transform: scale(1.01); }
  .metric-card.wide { grid-column: span 2; }
  .metric-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    border-radius: 18px 18px 0 0;
  }
  .metric-label { font-size: 10px; font-family: var(--font-mono); color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
  .metric-value { font-size: 32px; font-weight: 800; line-height: 1.1; margin-top: 6px; font-family: var(--font-mono); }
  .metric-unit { font-size: 14px; font-weight: 400; color: var(--muted); }
  .metric-trend { font-size: 11px; font-family: var(--font-mono); margin-top: 6px; }
  .trend-up { color: var(--amber); }
  .trend-ok { color: var(--green); }

  .chart-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 18px; padding: 18px; margin-top: 10px; grid-column: span 2;
  }
  .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .chart-title { font-size: 12px; font-family: var(--font-mono); color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .chart-pills { display: flex; gap: 6px; }
  .chart-pill {
    font-size: 10px; padding: 3px 8px; border-radius: 20px;
    font-family: var(--font-mono); cursor: pointer; transition: all 0.15s;
    border: 1px solid var(--border); color: var(--muted); background: transparent;
  }
  .chart-pill.active { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }

  /* ── HISTORY ── */
  .history-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 0; border-bottom: 1px solid var(--border);
  }
  .history-time { font-family: var(--font-mono); font-size: 11px; color: var(--muted); min-width: 52px; }
  .history-vals { display: flex; gap: 10px; flex: 1; }
  .history-val { font-family: var(--font-mono); font-size: 12px; }
  .history-val span { color: var(--muted); font-size: 10px; }

  /* ── NAV BAR ── */
  .nav-bar {
    height: 80px; background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-around;
    padding-bottom: 10px; flex-shrink: 0; position: relative; z-index: 10;
  }
  .nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    cursor: pointer; transition: color 0.2s; color: var(--muted);
    padding: 6px 16px; border-radius: 12px;
  }
  .nav-item.active { color: var(--cyan); }
  .nav-item svg { width: 22px; height: 22px; }
  .nav-label { font-size: 10px; font-family: var(--font-mono); letter-spacing: 0.05em; }

  /* ── SECTION HEADER ── */
  .section-hdr {
    font-size: 11px; font-family: var(--font-mono); color: var(--muted);
    letter-spacing: 0.12em; text-transform: uppercase;
    margin: 20px 0 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  /* ── PROFILE ── */
  .profile-avatar {
    width: 72px; height: 72px; border-radius: 24px;
    background: linear-gradient(135deg, var(--cyan-dim), rgba(255,171,0,0.15));
    border: 2px solid var(--cyan); display: flex; align-items: center; justify-content: center;
    font-size: 32px; margin: 24px auto 12px;
    box-shadow: 0 0 32px rgba(0,229,255,0.2);
  }
  .profile-name { text-align: center; font-size: 22px; font-weight: 800; }
  .profile-email { text-align: center; font-size: 12px; font-family: var(--font-mono); color: var(--muted); margin-top: 4px; }

  .stat-row {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin: 20px 0;
  }
  .stat-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 10px; text-align: center;
  }
  .stat-num { font-size: 24px; font-weight: 800; font-family: var(--font-mono); color: var(--cyan); }
  .stat-lbl { font-size: 10px; font-family: var(--font-mono); color: var(--muted); margin-top: 4px; }

  .list-item {
    display: flex; align-items: center; gap: 14px; padding: 14px 0;
    border-bottom: 1px solid var(--border); cursor: pointer;
  }
  .list-icon {
    width: 38px; height: 38px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .list-text { flex: 1; font-size: 14px; font-weight: 600; }
  .list-sub { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-top: 2px; }
  .list-arrow { color: var(--muted); font-size: 18px; }

  /* ── LOADING SHIMMER ── */
  .shimmer {
    background: linear-gradient(90deg, var(--surface2) 25%, var(--surface) 50%, var(--surface2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px; height: 14px; margin-bottom: 8px;
  }
  @keyframes shimmer { 0%{ background-position:200% 0; } 100%{ background-position:-200% 0; } }

  /* ── CONNECTING OVERLAY ── */
  .overlay {
    position: absolute; inset: 0; background: rgba(8,12,16,0.9);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 50; border-radius: 44px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .spinner {
    width: 56px; height: 56px; border-radius: 50%;
    border: 3px solid var(--border); border-top-color: var(--cyan);
    animation: spin 0.8s linear infinite; margin-bottom: 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .overlay-title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
  .overlay-sub { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }

  /* scroll */
  .content::-webkit-scrollbar { width: 0; }

  /* tooltip */
  .custom-tooltip {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 8px 12px;
    font-family: var(--font-mono); font-size: 11px; color: var(--text);
  }
`;

// ─── ICONS ─────────────────────────────────────────────────────────────────
const Icon = {
  Dashboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
  BLE: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11M12 3v18M12 3l4 4M12 3l-4 4M12 21l4-4M12 21l-4-4"/></svg>,
  Profile: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  ChevronRight: () => <span>›</span>,
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function RssiBar({ rssi }) {
  const strength = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;
  return (
    <div className="rssi-bar">
      {[1,2,3,4].map(i => (
        <div key={i} className="rssi-seg" style={{
          height: 6 + i * 4,
          background: i <= strength ? (strength >= 3 ? "var(--green)" : "var(--amber)") : "var(--border)"
        }}/>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("demo@sensora.io");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);

  const handle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ email, name: "Alex Morgan" }); }, 1400);
  };

  return (
    <div className="screen">
      <div className="noise-bg"/>
      <div style={{ padding: "60px 24px 0", position: "relative", zIndex: 1 }}>
        <div className="auth-logo">📡</div>
        <div className="auth-title">SENSORA<br/><span>BLE Monitor</span></div>
        <div className="auth-sub">// Arduino Nano 33 BLE dashboard</div>
      </div>
      <div className="content" style={{ paddingTop: 32 }}>
        <div className="tab-row">
          <button className={`tab-btn ${tab==="login"?"active":""}`} onClick={()=>setTab("login")}>Sign In</button>
          <button className={`tab-btn ${tab==="register"?"active":""}`} onClick={()=>setTab("register")}>Register</button>
        </div>
        <div className="field"><label>Email Address</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></div>
        <div className="field"><label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password"/></div>
        {tab==="register" && <div className="field"><label>Display Name</label><input defaultValue="Alex Morgan" type="text"/></div>}
        <button className="btn-primary" onClick={handle} disabled={loading}>
          {loading ? "Authenticating…" : tab==="login" ? "Sign In" : "Create Account"}
        </button>
        <div style={{ textAlign:"center", marginTop:20, fontSize:12, fontFamily:"var(--font-mono)", color:"var(--muted)" }}>
          Secured with JWT · AES-256 encrypted
        </div>
      </div>
    </div>
  );
}

function ScanScreen({ onConnect }) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connecting, setConnecting] = useState(null);

  const startScan = () => {
    setScanning(true);
    setDevices([]);
    let i = 0;
    const t = setInterval(() => {
      if (i < BLE_DEVICES.length) { setDevices(d => [...d, BLE_DEVICES[i]]); i++; }
      else { clearInterval(t); setScanning(false); }
    }, 700);
  };

  const connect = (dev) => {
    setConnecting(dev.id);
    setTimeout(() => { setConnecting(null); onConnect(dev); }, 1800);
  };

  return (
    <div className="screen">
      <div className="noise-bg"/>
      <div className="scan-header">
        <div className="scan-title">BLE Scanner</div>
        <div className="scan-sub">// Find Arduino Nano 33 BLE devices nearby</div>
      </div>
      <div className="content" style={{ paddingTop: 8, alignItems: "center" }}>
        <div className="scan-radar" style={{ zIndex: 1 }}>
          {scanning && <><div className="radar-ring"/><div className="radar-ring"/><div className="radar-ring"/></>}
          <div className="radar-core">📡</div>
        </div>
        <button className="btn-scan" onClick={startScan} disabled={scanning}>
          {scanning ? "⟳  Scanning…" : "⊙  Start Scan"}
        </button>
        <div style={{ width:"100%" }}>
          {devices.length > 0 && <div className="section-hdr">Discovered Devices ({devices.length})</div>}
          {devices.map(d => (
            <div key={d.id} className="device-card" onClick={() => connect(d)}>
              <div className="device-icon">🔷</div>
              <div>
                <div className="device-name">{d.name}</div>
                <div className="device-meta">ID: {d.id.toUpperCase()} · {d.rssi} dBm</div>
              </div>
              <RssiBar rssi={d.rssi}/>
            </div>
          ))}
          {devices.length === 0 && !scanning && (
            <div style={{ textAlign:"center", color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, marginTop:16 }}>
              Press scan to discover nearby BLE devices
            </div>
          )}
        </div>
      </div>
      {connecting && (
        <div className="overlay">
          <div className="spinner"/>
          <div className="overlay-title">Connecting…</div>
          <div className="overlay-sub">Establishing BLE connection</div>
          <div className="overlay-sub" style={{ marginTop: 6 }}>Exchanging GATT services</div>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ device, live }) {
  const [activeMetric, setActiveMetric] = useState("temperature");
  const chartData = MOCK_HISTORY.slice(-24);

  const metricConfig = {
    temperature: { label:"Temperature", value: live.temperature, unit:"°C", color:"var(--cyan)", accent:"#00e5ff", trend:"+0.3°", trendClass:"trend-up" },
    humidity:    { label:"Humidity",    value: live.humidity,    unit:"%",  color:"var(--amber)", accent:"#ffab00", trend:"Optimal", trendClass:"trend-ok" },
    pressure:    { label:"Pressure",    value: live.pressure,    unit:"hPa",color:"#b388ff", accent:"#b388ff", trend:"Stable", trendClass:"trend-ok" },
  };

  return (
    <div className="screen">
      <div className="noise-bg"/>
      <div className="dash-header">
        <div>
          <div className="dash-title">Live Data</div>
          <div style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--muted)", marginTop:3 }}>{device.name}</div>
        </div>
        <div className="connected-badge">● LIVE</div>
      </div>
      <div className="content" style={{ paddingTop: 0 }}>
        <div className="metric-grid">
          {Object.entries(metricConfig).map(([key, m]) => (
            <div key={key} className="metric-card" onClick={()=>setActiveMetric(key)} style={{ cursor:"pointer", borderColor: activeMetric===key ? m.accent : "var(--border)" }}>
              <div className="metric-accent" style={{ background: m.color }}/>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: m.color, fontSize: key==="pressure"?22:32 }}>
                {m.value}<span className="metric-unit"> {m.unit}</span>
              </div>
              <div className={`metric-trend ${m.trendClass}`}>{m.trend}</div>
            </div>
          ))}
          <div className="metric-card" style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div className="metric-accent" style={{ background:"var(--green)" }}/>
            <div className="metric-label">Uptime</div>
            <div className="metric-value" style={{ color:"var(--green)", fontSize:26 }}>14h <span className="metric-unit">32m</span></div>
            <div className="metric-trend trend-ok">247 readings</div>
          </div>

          <div className="chart-card" style={{ gridColumn:"span 2" }}>
            <div className="chart-header">
              <div className="chart-title">{metricConfig[activeMetric].label} / 24h</div>
              <div className="chart-pills">
                {["temperature","humidity","pressure"].map(k => (
                  <button key={k} className={`chart-pill ${activeMetric===k?"active":""}`} onClick={()=>setActiveMetric(k)}>
                    {k.slice(0,4)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData} margin={{ top:4, right:0, bottom:0, left:-20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricConfig[activeMetric].accent} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={metricConfig[activeMetric].accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill:"#4a6680", fontSize:10, fontFamily:"Space Mono" }} tickLine={false} axisLine={false} interval={5}/>
                <YAxis tick={{ fill:"#4a6680", fontSize:10, fontFamily:"Space Mono" }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey={activeMetric} stroke={metricConfig[activeMetric].accent} strokeWidth={2} fill="url(#grad)" dot={false} name={metricConfig[activeMetric].label}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen() {
  return (
    <div className="screen">
      <div className="noise-bg"/>
      <div className="scan-header">
        <div className="scan-title">History</div>
        <div className="scan-sub">// Last 48 readings from your device</div>
      </div>
      <div className="content" style={{ paddingTop: 0 }}>
        <div className="chart-card" style={{ marginTop:0 }}>
          <div className="chart-title" style={{ marginBottom:14 }}>Temperature & Humidity — 24h</div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={MOCK_HISTORY.slice(-24)} margin={{ top:4, right:0, bottom:0, left:-24 }}>
              <XAxis dataKey="time" tick={{ fill:"#4a6680", fontSize:9, fontFamily:"Space Mono" }} tickLine={false} axisLine={false} interval={5}/>
              <YAxis tick={{ fill:"#4a6680", fontSize:9, fontFamily:"Space Mono" }} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="temperature" stroke="var(--cyan)" strokeWidth={2} dot={false} name="Temp (°C)"/>
              <Line type="monotone" dataKey="humidity" stroke="var(--amber)" strokeWidth={2} dot={false} name="Humidity (%)"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="section-hdr">All Readings</div>
        <div style={{ display:"grid", gridTemplateColumns:"52px 1fr 1fr 1fr", gap:0, fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", marginBottom:6 }}>
          <span>TIME</span><span>TEMP</span><span>HUM</span><span>PRESS</span>
        </div>
        {MOCK_HISTORY.slice().reverse().map((r, i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"52px 1fr 1fr 1fr", gap:0, padding:"10px 0", borderBottom:"1px solid var(--border)", fontFamily:"var(--font-mono)", fontSize:12 }}>
            <span style={{ color:"var(--muted)", fontSize:10 }}>{r.time}</span>
            <span style={{ color:"var(--cyan)" }}>{r.temperature}°</span>
            <span style={{ color:"var(--amber)" }}>{r.humidity}%</span>
            <span style={{ color:"#b388ff" }}>{r.pressure}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen({ user, onLogout, onScanMore }) {
  return (
    <div className="screen">
      <div className="noise-bg"/>
      <div className="content" style={{ paddingTop: 0 }}>
        <div className="profile-avatar">👤</div>
        <div className="profile-name">{user.name}</div>
        <div className="profile-email">{user.email}</div>
        <div className="stat-row">
          <div className="stat-box"><div className="stat-num">247</div><div className="stat-lbl">Readings</div></div>
          <div className="stat-box"><div className="stat-num">1</div><div className="stat-lbl">Devices</div></div>
          <div className="stat-box"><div className="stat-num" style={{ fontSize:18 }}>14h</div><div className="stat-lbl">Uptime</div></div>
        </div>

        <div className="section-hdr">Device & Connection</div>
        {[
          { icon:"🔷", label:"Manage BLE Devices", sub:"1 device paired", action: onScanMore },
          { icon:"📊", label:"Export CSV Data", sub:"Download all readings" },
          { icon:"🔔", label:"Alert Thresholds", sub:"Temp > 30°C · Humidity > 80%" },
        ].map((item, i) => (
          <div key={i} className="list-item" onClick={item.action}>
            <div className="list-icon" style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>{item.icon}</div>
            <div><div className="list-text">{item.label}</div><div className="list-sub">{item.sub}</div></div>
            <div className="list-arrow">›</div>
          </div>
        ))}

        <div className="section-hdr">Account</div>
        {[
          { icon:"🔐", label:"Security Settings", sub:"2FA, password" },
          { icon:"🗄️", label:"Data Storage", sub:"SQLite · 2.4 MB used" },
        ].map((item, i) => (
          <div key={i} className="list-item">
            <div className="list-icon" style={{ background:"var(--surface2)", border:"1px solid var(--border)" }}>{item.icon}</div>
            <div><div className="list-text">{item.label}</div><div className="list-sub">{item.sub}</div></div>
            <div className="list-arrow">›</div>
          </div>
        ))}

        <button onClick={onLogout} style={{ width:"100%", padding:14, background:"rgba(255,23,68,0.1)", color:"var(--red)", border:"1px solid rgba(255,23,68,0.3)", borderRadius:14, fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, cursor:"pointer", marginTop:24 }}>
          Sign Out
        </button>
        <div style={{ textAlign:"center", fontSize:11, fontFamily:"var(--font-mono)", color:"var(--muted)", marginTop:16, marginBottom:8 }}>
          SENSORA v1.0.0 · Arduino Nano 33 BLE
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("auth");
  const [user, setUser] = useState(null);
  const [device, setDevice] = useState(null);
  const [screen, setScreen] = useState(SCREENS.DASHBOARD);
  const [live, setLive] = useState({ temperature: 23.4, humidity: 58.2, pressure: 1013.5 });

  // Simulate live updates
  useEffect(() => {
    if (appState !== "app") return;
    const t = setInterval(() => {
      setLive(prev => ({
        temperature: +(prev.temperature + (Math.random() - 0.5) * 0.3).toFixed(1),
        humidity: +(prev.humidity + (Math.random() - 0.5) * 0.5).toFixed(1),
        pressure: +(prev.pressure + (Math.random() - 0.5) * 0.4).toFixed(1),
      }));
    }, 2000);
    return () => clearInterval(t);
  }, [appState]);

  const renderScreen = () => {
    if (screen === SCREENS.DASHBOARD) return <DashboardScreen device={device} live={live}/>;
    if (screen === SCREENS.HISTORY)   return <HistoryScreen/>;
    if (screen === SCREENS.BLE)       return <ScanScreen onConnect={d => { setDevice(d); setScreen(SCREENS.DASHBOARD); }}/>;
    if (screen === SCREENS.PROFILE)   return <ProfileScreen user={user} onLogout={() => { setAppState("auth"); setUser(null); setDevice(null); }} onScanMore={() => setScreen(SCREENS.BLE)}/>;
  };

  const bleStatus = device ? "connected" : "disconnected";

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#030608", padding:20 }}>
        <div className="app-shell">
          {appState === "auth" && <AuthScreen onLogin={u => { setUser(u); setAppState("scan"); }}/>}
          {appState === "scan" && <ScanScreen onConnect={d => { setDevice(d); setAppState("app"); setScreen(SCREENS.DASHBOARD); }}/>}
          {appState === "app" && (
            <>
              <div className="noise-bg"/>
              <div className="status-bar">
                <span style={{ fontWeight:700, letterSpacing:"0.08em", fontSize:13 }}>SENSORA</span>
                <span>
                  <span className={`ble-dot ${bleStatus}`}/>
                  {device?.name ?? "No device"}
                </span>
              </div>
              {renderScreen()}
              <nav className="nav-bar">
                {[
                  { id: SCREENS.DASHBOARD, icon: <Icon.Dashboard/>, label: "Live" },
                  { id: SCREENS.HISTORY,   icon: <Icon.History/>,   label: "History" },
                  { id: SCREENS.BLE,       icon: <Icon.BLE/>,       label: "BLE" },
                  { id: SCREENS.PROFILE,   icon: <Icon.Profile/>,   label: "Profile" },
                ].map(n => (
                  <div key={n.id} className={`nav-item ${screen===n.id?"active":""}`} onClick={()=>setScreen(n.id)}>
                    {n.icon}
                    <span className="nav-label">{n.label}</span>
                  </div>
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
    </>
  );
}
