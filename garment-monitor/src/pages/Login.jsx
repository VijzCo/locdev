// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { COL } from "../firebase/config.js";
import { toEmail, DEFAULT_DOMAIN } from "../lib/login.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const settings = useCollection(COL.settings, [], []).data.find((s) => s.id === "system") || {};
  const domain = settings.companyDomain || DEFAULT_DOMAIN;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await login(toEmail(username, domain), password);
      navigate(loc.state?.from?.pathname || "/", { replace: true });
    } catch {
      setErr("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-info font-mono text-lg font-bold text-white">PM</div>
          <h1 className="text-2xl font-extrabold tracking-tight">PROMIS</h1>
          <p className="text-sm text-slate-400">Production Monitoring Information System</p>
        </div>
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Username</label>
            <input className="field" value={username} autoCapitalize="none" autoCorrect="off"
              onChange={(e) => setUsername(e.target.value)} placeholder="e.g. vijan.b"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
            <p className="mt-1 text-[11px] text-slate-500">Sign in with your username — we add <span className="font-mono">@{domain}</span> automatically. (A full email also works.)</p>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="field" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          {err && <p className="rounded-lg bg-bad/15 px-3 py-2 text-sm text-bad">{err}</p>}
          <button className="btn-primary w-full" onClick={submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
