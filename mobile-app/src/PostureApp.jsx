import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,300&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --bg:       #0a0c10;
    --surface:  #111520;
    --panel:    #161b27;
    --border:   #1e2535;
    --teal:     #00d4c8;
    --teal-dim: #00877f;
    --amber:    #f5a623;
    --red:      #ff4757;
    --green:    #2ed573;
    --muted:    #4a5568;
    --text:     #e2e8f0;
    --subtext:  #718096;
    --mono:     'Space Mono', monospace;
    --sans:     'DM Sans', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  .app-shell {
    width: 390px;
    height: 844px;
    background: var(--bg);
    border-radius: 44px;
    border: 1.5px solid var(--border);
    overflow: hidden;
    position: relative;
    box-shadow: 0 0 80px rgba(0,212,200,0.07), 0 40px 120px rgba(0,0,0,0.8);
  }

  .screen {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Status bar */
  .status-bar {
    height: 50px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px;
    font-family: var(--mono); font-size: 11px; color: var(--subtext);
  }

  .scrollable { overflow-y: auto; flex: 1; }
  .scrollable::-webkit-scrollbar { width: 0; }

  /* ── Auth Screen ── */
  .auth-bg {
    position: absolute; inset: 0; z-index: 0;
    background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,212,200,0.12) 0%, transparent 70%),
                radial-gradient(ellipse 60% 40% at 80% 110%, rgba(0,135,127,0.08) 0%, transparent 60%);
  }
  .auth-content {
    position: relative; z-index: 1;
    padding: 0 32px; flex: 1;
    display: flex; flex-direction: column; justify-content: center; gap: 0;
  }
  .auth-logo {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.3em;
    color: var(--teal); text-transform: uppercase; margin-bottom: 40px;
    display: flex; align-items: center; gap: 10px;
  }
  .logo-dot { width: 8px; height: 8px; background: var(--teal); border-radius: 50%;
    box-shadow: 0 0 12px var(--teal); animation: pulse 2s ease infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

  .auth-title { font-size: 30px; font-weight: 700; line-height: 1.15; margin-bottom: 8px; }
  .auth-title span { color: var(--teal); }
  .auth-sub { font-size: 14px; color: var(--subtext); font-weight: 300; margin-bottom: 40px; }

  .input-group { margin-bottom: 16px; }
  .input-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em;
    color: var(--subtext); text-transform: uppercase; margin-bottom: 8px; display: block; }
  .input-field {
    width: 100%; padding: 14px 16px;
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-family: var(--sans);
    font-size: 15px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-field:focus { border-color: var(--teal-dim); box-shadow: 0 0 0 3px rgba(0,212,200,0.08); }
  .input-field::placeholder { color: var(--muted); }

  .btn-primary {
    width: 100%; padding: 15px; margin-top: 8px;
    background: var(--teal); border: none; border-radius: 12px;
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.12em;
    color: #000; font-weight: 700; cursor: pointer; text-transform: uppercase;
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn-primary:active { transform: scale(0.98); }

  .auth-switch { margin-top: 24px; text-align: center;
    font-size: 13px; color: var(--subtext); }
  .auth-switch span { color: var(--teal); cursor: pointer; font-weight: 500; }

  /* ── BLE Screen ── */
  .ble-header {
    padding: 16px 24px 12px;
    border-bottom: 1px solid var(--border);
  }
  .ble-screen-title { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
  .ble-screen-sub { font-size: 12px; color: var(--subtext); font-family: var(--mono); }

  .scan-button-area { padding: 20px 24px 8px; }
  .btn-scan {
    width: 100%; padding: 14px;
    background: transparent; border: 1px solid var(--teal);
    border-radius: 12px; color: var(--teal);
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.15em;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 8px; text-transform: uppercase; transition: background 0.2s;
  }
  .btn-scan:hover { background: rgba(0,212,200,0.06); }
  .btn-scan.scanning { animation: scanPulse 1.4s ease infinite; }
  @keyframes scanPulse { 0%,100% { border-color: var(--teal); color: var(--teal); }
    50% { border-color: var(--teal-dim); color: var(--teal-dim); } }

  .devices-list { padding: 0 24px; flex: 1; }
  .section-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em;
    color: var(--muted); text-transform: uppercase; padding: 16px 0 10px; }

  .device-card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px; margin-bottom: 10px;
    display: flex; align-items: center; gap: 14px; cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .device-card:hover { border-color: var(--teal-dim); background: rgba(0,212,200,0.04); }
  .device-card.connected { border-color: var(--teal); background: rgba(0,212,200,0.06); }

  .device-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .device-info { flex: 1; min-width: 0; }
  .device-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  .device-meta { font-family: var(--mono); font-size: 10px; color: var(--subtext); }

  .signal-bars { display: flex; align-items: flex-end; gap: 2px; }
  .bar { width: 3px; background: var(--muted); border-radius: 1px; }
  .bar.active { background: var(--teal); }

  .rssi-badge {
    font-family: var(--mono); font-size: 10px;
    padding: 3px 8px; border-radius: 6px;
    background: rgba(0,212,200,0.1); color: var(--teal); margin-left: auto;
  }

  /* ── Dashboard ── */
  .dash-header {
    padding: 12px 24px 0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .dash-greeting { font-size: 13px; color: var(--subtext); font-weight: 300; }
  .dash-user { font-size: 17px; font-weight: 700; }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--teal-dim), var(--teal));
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #000;
  }

  .ble-status-chip {
    margin: 12px 24px 0;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 20px;
    background: rgba(46,213,115,0.1); border: 1px solid rgba(46,213,115,0.2);
    font-family: var(--mono); font-size: 10px; color: var(--green);
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .ble-dot { width: 6px; height: 6px; border-radius: 50%;
    background: var(--green); animation: pulse 1.5s ease infinite; }

  .posture-card {
    margin: 14px 24px 0;
    background: var(--panel); border: 1px solid var(--border); border-radius: 20px;
    padding: 20px; position: relative; overflow: hidden;
  }
  .posture-card::before {
    content: ''; position: absolute; top: -40px; right: -40px;
    width: 120px; height: 120px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,212,200,0.12), transparent 70%);
    pointer-events: none;
  }
  .posture-card.bad::before {
    background: radial-gradient(circle, rgba(255,71,87,0.14), transparent 70%);
  }

  .posture-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em;
    color: var(--subtext); text-transform: uppercase; margin-bottom: 12px; }
  .posture-status { font-size: 28px; font-weight: 700; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .posture-status.good { color: var(--green); }
  .posture-status.bad  { color: var(--red); }

  .prob-bar-track {
    height: 6px; background: var(--surface); border-radius: 3px; margin-bottom: 6px; overflow: hidden;
  }
  .prob-bar-fill {
    height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s;
  }
  .prob-numbers {
    display: flex; justify-content: space-between;
    font-family: var(--mono); font-size: 10px; color: var(--muted);
  }
  .prob-value { font-family: var(--mono); font-size: 34px; font-weight: 700; letter-spacing: -2px; }

  .metrics-row { margin: 14px 24px 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .metric-tile {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 12px;
  }
  .metric-icon { font-size: 18px; margin-bottom: 8px; }
  .metric-val { font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--text); line-height: 1; }
  .metric-unit { font-size: 10px; color: var(--muted); display: inline; margin-left: 2px; }
  .metric-lbl { font-size: 10px; color: var(--subtext); margin-top: 4px; }

  .chart-section { margin: 14px 24px 0; }
  .chart-title { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em;
    color: var(--subtext); text-transform: uppercase; margin-bottom: 10px; }
  .chart-wrap {
    background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 16px 8px 8px;
  }

  /* ── History Screen ── */
  .history-header { padding: 12px 24px 16px; border-bottom: 1px solid var(--border); }
  .history-title { font-size: 22px; font-weight: 700; }
  .history-sub { font-size: 12px; color: var(--subtext); font-family: var(--mono); margin-top: 2px; }

  .session-card {
    margin: 0 24px 10px;
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 16px; padding: 16px; cursor: pointer;
    transition: border-color 0.2s;
  }
  .session-card:hover { border-color: var(--teal-dim); }
  .session-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .session-date { font-size: 14px; font-weight: 600; }
  .session-time { font-size: 11px; color: var(--subtext); font-family: var(--mono); margin-top: 2px; }
  .session-score {
    font-family: var(--mono); font-size: 20px; font-weight: 700;
    padding: 4px 10px; border-radius: 8px;
  }
  .score-good { background: rgba(46,213,115,0.12); color: var(--green); }
  .score-bad  { background: rgba(255,71,87,0.12);  color: var(--red); }
  .score-mid  { background: rgba(245,166,35,0.12); color: var(--amber); }

  .session-bar-track { height: 4px; background: var(--surface); border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
  .session-bar-fill { height: 100%; border-radius: 2px; }
  .session-stats { display: flex; gap: 16px; }
  .session-stat { font-size: 11px; color: var(--subtext); }
  .session-stat strong { color: var(--text); font-weight: 600; }

  /* ── Bottom Nav ── */
  .bottom-nav {
    height: 72px; flex-shrink: 0;
    display: flex; border-top: 1px solid var(--border);
    background: var(--surface);
  }
  .nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 4px; cursor: pointer; border: none;
    background: transparent; color: var(--muted); transition: color 0.2s;
    font-family: var(--sans); font-size: 10px;
  }
  .nav-item.active { color: var(--teal); }
  .nav-icon { font-size: 20px; }

  /* ── Connecting overlay ── */
  .connecting-overlay {
    position: absolute; inset: 0; z-index: 50;
    background: rgba(10,12,16,0.9); backdrop-filter: blur(8px);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  }
  .connecting-ring {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--teal);
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .connecting-text { font-family: var(--mono); font-size: 12px; color: var(--subtext); letter-spacing: 0.1em; }

  /* ── Profile ── */
  .profile-header { padding: 12px 24px 20px; }
  .profile-avatar {
    width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 12px;
    background: linear-gradient(135deg, var(--teal-dim), var(--teal));
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 700; color: #000;
    border: 3px solid rgba(0,212,200,0.3);
  }
  .profile-name { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .profile-email { text-align: center; font-size: 12px; color: var(--subtext); font-family: var(--mono); }

  .stats-grid { margin: 0 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px;
  }
  .stat-big { font-family: var(--mono); font-size: 26px; font-weight: 700; color: var(--teal); line-height: 1; }
  .stat-lbl { font-size: 11px; color: var(--subtext); margin-top: 4px; }

  .settings-section { margin: 16px 24px 0; }
  .settings-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; margin-bottom: 8px; cursor: pointer;
  }
  .settings-row-left { display: flex; align-items: center; gap: 12px; }
  .settings-icon { width: 32px; height: 32px; border-radius: 8px;
    background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .settings-label { font-size: 14px; font-weight: 500; }
  .settings-chevron { color: var(--muted); font-size: 14px; }

  .btn-logout {
    margin: 16px 24px; width: calc(100% - 48px); padding: 14px;
    background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.25);
    border-radius: 12px; color: var(--red);
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
    cursor: pointer; text-transform: uppercase; transition: background 0.2s;
  }
  .btn-logout:hover { background: rgba(255,71,87,0.18); }

  .notification-banner {
    position: absolute; top: 56px; left: 16px; right: 16px; z-index: 99;
    padding: 12px 16px; border-radius: 14px;
    backdrop-filter: blur(12px);
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 500;
    animation: slideDown 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .banner-bad  { background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.3); color: var(--red); }
  .banner-good { background: rgba(46,213,115,0.12); border: 1px solid rgba(46,213,115,0.25); color: var(--green); }

  .empty-state { padding: 40px 24px; text-align: center; color: var(--muted); }
  .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.5; }
  .empty-text { font-size: 14px; }

  .tab-bar { display: flex; margin: 16px 24px 0; gap: 8px; }
  .tab {
    flex: 1; padding: 9px 0; border-radius: 10px; text-align: center;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; cursor: pointer; border: 1px solid var(--border);
    background: transparent; color: var(--muted); transition: all 0.2s;
  }
  .tab.active { background: var(--teal); color: #000; border-color: var(--teal); font-weight: 700; }
`;

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const generateReading = (prev) => {
  const drift = (Math.random() - 0.5) * 0.18;
  const prob = Math.max(0, Math.min(1, (prev ?? 0.35) + drift));
  return parseFloat(prob.toFixed(3));
};

const mockSessions = [
  { id: 1, date: "Today", startTime: "09:14", duration: "47m", avgProb: 0.31, readings: 1410, slouches: 3 },
  { id: 2, date: "Yesterday", startTime: "14:22", duration: "1h 12m", avgProb: 0.58, readings: 2160, slouches: 14 },
  { id: 3, date: "Mar 4", startTime: "10:05", duration: "2h 01m", avgProb: 0.24, readings: 3630, slouches: 5 },
  { id: 4, date: "Mar 3", startTime: "08:45", duration: "55m", avgProb: 0.72, readings: 1650, slouches: 28 },
  { id: 5, date: "Mar 2", startTime: "13:30", duration: "1h 30m", avgProb: 0.44, readings: 2700, slouches: 11 },
];

const THRESHOLD = 0.7;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function StatusBar({ time }) {
  return (
    <div className="status-bar">
      <span>{time}</span>
      <span>● ● ●</span>
    </div>
  );
}

function BottomNav({ active, onNav, showNav }) {
  if (!showNav) return null;
  const items = [
    { id: "dashboard", icon: "⬡", label: "Monitor" },
    { id: "history",   icon: "◈", label: "History" },
    { id: "profile",   icon: "◎", label: "Profile" },
  ];
  return (
    <div className="bottom-nav">
      {items.map(i => (
        <button key={i.id} className={`nav-item ${active === i.id ? "active" : ""}`} onClick={() => onNav(i.id)}>
          <span className="nav-icon">{i.icon}</span>
          <span>{i.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!email || !password) return;
    onAuth({ name: name || email.split("@")[0], email });
  };

  return (
    <div className="screen">
      <div className="auth-bg" />
      <StatusBar time="9:41" />
      <div className="auth-content">
        <div className="auth-logo">
          <div className="logo-dot" />
          PostureSense
        </div>
        <h1 className="auth-title">
          {mode === "login" ? <>Monitor your<br /><span>posture</span> in<br />real-time.</> : <>Create your<br /><span>account</span> to<br />get started.</>}
        </h1>
        <p className="auth-sub">Arduino Nano 33 BLE · TFLite Inference</p>

        {mode === "register" && (
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input className="input-field" placeholder="Alex Chen" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="input-group">
          <label className="input-label">Email</label>
          <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Password</label>
          <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleSubmit}>
          {mode === "login" ? "→ Sign In" : "→ Create Account"}
        </button>

        <div className="auth-switch">
          {mode === "login" ? (
            <p>No account? <span onClick={() => setMode("register")}>Register free</span></p>
          ) : (
            <p>Already registered? <span onClick={() => setMode("login")}>Sign in</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BLE Scanner ───────────────────────────────────────────────────────────────
function BLEScreen({ onConnect, user }) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connecting, setConnecting] = useState(null);

  const mockDevices = [
    { id: "d1", name: "PostureSense-NB33", mac: "E4:5F:01:AB:CD:12", rssi: -52, bars: 4 },
    { id: "d2", name: "Arduino-BLE-A2F1",  mac: "C2:11:44:EE:88:5A", rssi: -74, bars: 2 },
  ];

  const startScan = () => {
    setScanning(true);
    setDevices([]);
    setTimeout(() => setDevices([mockDevices[0]]), 900);
    setTimeout(() => setDevices(mockDevices), 1700);
    setTimeout(() => setScanning(false), 3000);
  };

  const connectDevice = (device) => {
    setConnecting(device);
    setTimeout(() => {
      setConnecting(null);
      onConnect(device);
    }, 2200);
  };

  return (
    <div className="screen">
      <StatusBar time="9:41" />
      <div className="ble-header">
        <div className="ble-screen-title">Connect Device</div>
        <div className="ble-screen-sub">BLE · Nano 33 · POSTURE_SVC</div>
      </div>

      <div className="scan-button-area">
        <button className={`btn-scan ${scanning ? "scanning" : ""}`} onClick={startScan}>
          <span>{scanning ? "◌" : "◎"}</span>
          <span>{scanning ? "Scanning for devices…" : "Scan for BLE Devices"}</span>
        </button>
      </div>

      <div className="devices-list scrollable">
        {devices.length > 0 && (
          <>
            <div className="section-label">Nearby Devices</div>
            {devices.map(d => (
              <div key={d.id} className="device-card" onClick={() => connectDevice(d)}>
                <div className="device-icon">📡</div>
                <div className="device-info">
                  <div className="device-name">{d.name}</div>
                  <div className="device-meta">{d.mac}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div className="signal-bars">
                    {[1,2,3,4].map(b => (
                      <div key={b} className={`bar ${b <= d.bars ? "active" : ""}`}
                        style={{ height: 4 + b * 3 }} />
                    ))}
                  </div>
                  <div className="rssi-badge">{d.rssi} dBm</div>
                </div>
              </div>
            ))}
          </>
        )}
        {!scanning && devices.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-text">Press scan to discover nearby Arduino Nano 33 BLE devices</div>
          </div>
        )}
      </div>

      {connecting && (
        <div className="connecting-overlay">
          <div className="connecting-ring" />
          <div className="connecting-text">Pairing with {connecting.name}…</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
            Subscribing to POSTURE_CHAR
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardScreen({ user, device }) {
  const [prob, setProb] = useState(0.28);
  const [readings, setReadings] = useState([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [slouchCount, setSlouch] = useState(0);
  const [banner, setBanner] = useState(null);
  const prevProb = useRef(0.28);
  const sessionStart = useRef(Date.now());

  // Simulate BLE notification every ~2s (matches Arduino window)
  useEffect(() => {
    const interval = setInterval(() => {
      const newProb = generateReading(prevProb.current);
      prevProb.current = newProb;
      setProb(newProb);
      setReadings(prev => {
        const updated = [...prev, { t: prev.length, p: newProb }];
        return updated.length > 40 ? updated.slice(-40) : updated;
      });
      if (newProb > THRESHOLD) {
        setSlouch(s => s + 1);
        setBanner({ type: "bad", msg: "⚠  Slouching detected! Adjust your posture." });
        setTimeout(() => setBanner(null), 2800);
      } else if (newProb < 0.25 && Math.random() > 0.85) {
        setBanner({ type: "good", msg: "✓  Great posture! Keep it up." });
        setTimeout(() => setBanner(null), 2000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const isGood = prob <= THRESHOLD;
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  const avgProb = readings.length ? (readings.reduce((a, r) => a + r.p, 0) / readings.length).toFixed(2) : "--";
  const score = readings.length ? Math.round((1 - parseFloat(avgProb)) * 100) : "--";

  return (
    <div className="screen">
      <StatusBar time="9:41" />

      {banner && (
        <div className={`notification-banner ${banner.type === "bad" ? "banner-bad" : "banner-good"}`}>
          {banner.msg}
        </div>
      )}

      <div className="scrollable">
        <div className="dash-header">
          <div>
            <div className="dash-greeting">Good morning,</div>
            <div className="dash-user">{user.name}</div>
          </div>
          <div className="avatar">{user.name[0].toUpperCase()}</div>
        </div>

        <div style={{ padding: "0 24px" }}>
          <div className="ble-status-chip">
            <div className="ble-dot" />
            {device?.name || "PostureSense-NB33"} · Live
          </div>
        </div>

        {/* Main posture card */}
        <div className={`posture-card ${isGood ? "" : "bad"}`}>
          <div className="posture-label">Current Status · 2s window</div>
          <div className={`posture-status ${isGood ? "good" : "bad"}`}>
            <span>{isGood ? "✓" : "⚠"}</span>
            <span>{isGood ? "Good Posture" : "Slouching"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <div className="prob-value" style={{ color: isGood ? "var(--green)" : "var(--red)" }}>
              {(prob * 100).toFixed(1)}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--subtext)" }}>
              % bad prob
            </div>
          </div>
          <div className="prob-bar-track">
            <div className="prob-bar-fill" style={{
              width: `${prob * 100}%`,
              background: isGood
                ? `linear-gradient(90deg, var(--teal-dim), var(--green))`
                : `linear-gradient(90deg, var(--amber), var(--red))`
            }} />
          </div>
          <div className="prob-numbers">
            <span>0%</span>
            <span style={{ color: "var(--amber)" }}>70% threshold</span>
            <span>100%</span>
          </div>
        </div>

        {/* Metrics row */}
        <div className="metrics-row">
          <div className="metric-tile">
            <div className="metric-icon">⏱</div>
            <div className="metric-val">{fmtTime(sessionTime)}</div>
            <div className="metric-lbl">Session</div>
          </div>
          <div className="metric-tile">
            <div className="metric-icon">📊</div>
            <div className="metric-val">{score}<span className="metric-unit">%</span></div>
            <div className="metric-lbl">Score</div>
          </div>
          <div className="metric-tile">
            <div className="metric-icon">⚠</div>
            <div className="metric-val" style={{ color: slouchCount > 5 ? "var(--red)" : "var(--text)" }}>{slouchCount}</div>
            <div className="metric-lbl">Alerts</div>
          </div>
        </div>

        {/* Live chart */}
        <div className="chart-section" style={{ marginBottom: 16 }}>
          <div className="chart-title">Bad Posture Probability · Live</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={readings} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 1]} tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "Space Mono" }} />
                <Tooltip
                  contentStyle={{ background: "#161b27", border: "1px solid #1e2535", borderRadius: 8, fontSize: 11, fontFamily: "Space Mono" }}
                  formatter={v => [`${(v*100).toFixed(1)}%`, "Bad Prob"]}
                  labelFormatter={() => ""}
                />
                <ReferenceLine y={0.7} stroke="#f5a623" strokeDasharray="4 4" strokeWidth={1} />
                <Line type="monotoneX" dataKey="p" stroke="#00d4c8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function HistoryScreen({ user }) {
  const [tab, setTab] = useState("sessions");
  const [expanded, setExpanded] = useState(null);

  const getScoreColor = (prob) => {
    if (prob < 0.35) return "score-good";
    if (prob < 0.6)  return "score-mid";
    return "score-bad";
  };

  const weekData = [
    { day: "Mon", score: 82 }, { day: "Tue", score: 61 },
    { day: "Wed", score: 78 }, { day: "Thu", score: 45 },
    { day: "Fri", score: 88 }, { day: "Sat", score: 72 }, { day: "Sun", score: 90 },
  ];

  return (
    <div className="screen">
      <StatusBar time="9:41" />
      <div className="history-header">
        <div className="history-title">Session History</div>
        <div className="history-sub">{user.email} · {mockSessions.length} sessions</div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}>Sessions</button>
        <button className={`tab ${tab === "weekly" ? "active" : ""}`} onClick={() => setTab("weekly")}>Weekly</button>
      </div>

      <div className="scrollable" style={{ paddingTop: 12 }}>
        {tab === "sessions" && mockSessions.map(s => (
          <div key={s.id} className="session-card" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
            <div className="session-top">
              <div>
                <div className="session-date">{s.date}</div>
                <div className="session-time">{s.startTime} · {s.duration}</div>
              </div>
              <div className={`session-score ${getScoreColor(s.avgProb)}`}>
                {Math.round((1 - s.avgProb) * 100)}
              </div>
            </div>
            <div className="session-bar-track">
              <div className="session-bar-fill" style={{
                width: `${s.avgProb * 100}%`,
                background: s.avgProb < 0.35 ? "var(--green)" : s.avgProb < 0.6 ? "var(--amber)" : "var(--red)"
              }} />
            </div>
            <div className="session-stats">
              <div className="session-stat"><strong>{s.readings.toLocaleString()}</strong> readings</div>
              <div className="session-stat"><strong>{s.slouches}</strong> alerts</div>
              <div className="session-stat"><strong>{(s.avgProb * 100).toFixed(0)}%</strong> avg prob</div>
            </div>

            {expanded === s.id && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div className="chart-title" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--subtext)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                  Session Overview
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={Array.from({ length: 20 }, (_, i) => ({ t: i, p: Math.max(0, Math.min(1, s.avgProb + (Math.random() - 0.5) * 0.3)) }))}
                    margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                    <YAxis domain={[0, 1]} tick={{ fill: "#4a5568", fontSize: 8 }} />
                    <ReferenceLine y={0.7} stroke="#f5a623" strokeDasharray="3 3" strokeWidth={1} />
                    <Line type="monotone" dataKey="p" stroke="#00d4c8" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}

        {tab === "weekly" && (
          <div style={{ padding: "0 24px" }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 8px 8px", marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--subtext)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 8 }}>
                Posture Score · This Week
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weekData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                  <XAxis dataKey="day" tick={{ fill: "#718096", fontSize: 10, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "Space Mono" }} />
                  <Tooltip contentStyle={{ background: "#161b27", border: "1px solid #1e2535", borderRadius: 8, fontSize: 11, fontFamily: "Space Mono" }}
                    formatter={v => [`${v}%`, "Score"]} />
                  <ReferenceLine y={70} stroke="#f5a623" strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="score" stroke="#00d4c8" strokeWidth={2} dot={{ fill: "#00d4c8", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["79%","Avg Score"],["4.3h","Avg Session"],["12","Total Alerts"],["5","Sessions"]].map(([v, l]) => (
                <div key={l} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--teal)", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileScreen({ user, onLogout, onDisconnect }) {
  return (
    <div className="screen">
      <StatusBar time="9:41" />
      <div className="scrollable">
        <div className="profile-header">
          <div className="profile-avatar">{user.name[0].toUpperCase()}</div>
          <div className="profile-name">{user.name}</div>
          <div className="profile-email">{user.email}</div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-big">74%</div>
            <div className="stat-lbl">Overall Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-big">12h</div>
            <div className="stat-lbl">Total Monitored</div>
          </div>
          <div className="stat-card">
            <div className="stat-big">5</div>
            <div className="stat-lbl">Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-big">61</div>
            <div className="stat-lbl">Total Alerts</div>
          </div>
        </div>

        <div className="settings-section">
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.2em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
            Settings
          </div>

          {[
            { icon: "🔔", label: "Alert Threshold" },
            { icon: "📡", label: "BLE Device" },
            { icon: "☁️",  label: "Data Sync" },
            { icon: "📤", label: "Export CSV" },
          ].map(row => (
            <div key={row.label} className="settings-row">
              <div className="settings-row-left">
                <div className="settings-icon">{row.icon}</div>
                <span className="settings-label">{row.label}</span>
              </div>
              <span className="settings-chevron">›</span>
            </div>
          ))}

          <div className="settings-row" onClick={onDisconnect} style={{ marginTop: 4 }}>
            <div className="settings-row-left">
              <div className="settings-icon">🔌</div>
              <span className="settings-label" style={{ color: "var(--amber)" }}>Disconnect Device</span>
            </div>
          </div>
        </div>

        <button className="btn-logout" onClick={onLogout}>→ Sign Out</button>

        <div style={{ padding: "8px 24px 24px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", textAlign: "center" }}>
          PostureSense v1.0.0 · Arduino Nano 33 BLE<br />
          BLE SVC: POSTURE_SVC · CHAR: POSTURE_RESULT<br />
          Format: float32 probability (0–1) · 2s cadence
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [device, setDevice] = useState(null);
  const [screen, setScreen] = useState("dashboard");

  const handleAuth = (u) => setUser(u);
  const handleConnect = (d) => setDevice(d);
  const handleDisconnect = () => { setDevice(null); };
  const handleLogout = () => { setUser(null); setDevice(null); setScreen("dashboard"); };

  const showNav = !!user && !!device;
  const activeFlow = !user ? "auth" : !device ? "ble" : screen;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, #0d111c 0%, #050608 100%)", padding: 24 }}>

        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.3em", color: "#4a5568",
          textTransform: "uppercase", marginBottom: 16 }}>
          PostureSense · Mobile App
        </div>

        <div className="app-shell">
          {activeFlow === "auth" && <AuthScreen onAuth={handleAuth} />}
          {activeFlow === "ble" && <BLEScreen onConnect={handleConnect} user={user} />}
          {activeFlow === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <DashboardScreen user={user} device={device} />
              </div>
              <BottomNav active={screen} onNav={setScreen} showNav={showNav} />
            </div>
          )}
          {activeFlow === "history" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <HistoryScreen user={user} />
              </div>
              <BottomNav active={screen} onNav={setScreen} showNav={showNav} />
            </div>
          )}
          {activeFlow === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <ProfileScreen user={user} onLogout={handleLogout} onDisconnect={handleDisconnect} />
              </div>
              <BottomNav active={screen} onNav={setScreen} showNav={showNav} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#2d3748",
          textAlign: "center", lineHeight: 1.8, letterSpacing: "0.05em" }}>
          BLE reads every 2s · Threshold: 70% · 16-feature TFLite model
        </div>
      </div>
    </>
  );
}
