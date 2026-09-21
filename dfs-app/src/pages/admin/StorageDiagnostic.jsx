// src/pages/admin/StorageDiagnostic.jsx
// A self-contained diagnostic panel shown when uploads fail.
// Helps the developer/admin identify exactly what's wrong.
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const CHECK = {
  IDLE: 'idle',
  RUNNING: 'running',
  PASS: 'pass',
  FAIL: 'fail',
  WARN: 'warn',
};

export default function StorageDiagnostic({ onClose }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const update = (id, status, message) =>
    setResults(r => r.map(x => x.id === id ? { ...x, status, message } : x));

  const runDiagnostics = async () => {
    setRunning(true);
    const checks = [
      { id: 'env',     label: 'Environment variables present',   status: CHECK.RUNNING, message: '' },
      { id: 'init',    label: 'Firebase Storage initialised',    status: CHECK.RUNNING, message: '' },
      { id: 'bucket',  label: 'Storage bucket reachable',        status: CHECK.RUNNING, message: '' },
      { id: 'write',   label: 'Write permission (auth required)', status: CHECK.RUNNING, message: '' },
      { id: 'read',    label: 'Public read permission',          status: CHECK.RUNNING, message: '' },
      { id: 'delete',  label: 'Delete permission',               status: CHECK.RUNNING, message: '' },
    ];
    setResults(checks);

    // 1. ENV VARS
    const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (!bucket) {
      update('env', CHECK.FAIL, 'VITE_FIREBASE_STORAGE_BUCKET is missing from .env');
    } else if (!bucket.includes('.')) {
      update('env', CHECK.WARN, `Bucket value "${bucket}" looks wrong. Expected format: your-project-id.appspot.com or your-project-id.firebasestorage.app`);
    } else {
      update('env', CHECK.PASS, `Bucket: ${bucket}`);
    }

    // 2. INIT
    if (!storage) {
      update('init', CHECK.FAIL, 'storage is null — Firebase not initialised. Check config.js');
      setRunning(false);
      return;
    }
    update('init', CHECK.PASS, `Storage app: ${storage.app.name}`);

    // 3. BUCKET REACHABLE — try creating a ref (doesn't do network call yet)
    try {
      const testRef = ref(storage, '_diag_test/ping.txt');
      update('bucket', CHECK.PASS, `Ref created: ${testRef.fullPath}`);
    } catch (e) {
      update('bucket', CHECK.FAIL, `Could not create ref: ${e.message}`);
      setRunning(false);
      return;
    }

    // 4 & 5 & 6. WRITE + READ + DELETE a tiny test file
    const testPath = `_diag_test/${Date.now()}_ping.txt`;
    const testRef = ref(storage, testPath);
    const testBlob = new Blob(['DFS-DIAG-OK'], { type: 'text/plain' });

    try {
      await uploadBytes(testRef, testBlob);
      update('write', CHECK.PASS, 'Uploaded 11-byte test file successfully');
    } catch (e) {
      const hint = e.code === 'storage/unauthorized'
        ? 'Storage rules are blocking writes. See the fix below.'
        : e.code === 'storage/unknown'
        ? 'Unknown error — most likely Storage is not enabled in your Firebase project.'
        : e.message;
      update('write', CHECK.FAIL, `Write blocked: ${hint} (code: ${e.code})`);
      update('read',   CHECK.IDLE, 'Skipped — write failed');
      update('delete', CHECK.IDLE, 'Skipped — write failed');
      setRunning(false);
      return;
    }

    try {
      const url = await getDownloadURL(testRef);
      update('read', CHECK.PASS, 'Public read works');
    } catch (e) {
      update('read', CHECK.FAIL, `Read blocked (code: ${e.code}): ${e.message}`);
    }

    try {
      await deleteObject(testRef);
      update('delete', CHECK.PASS, 'Deleted test file');
    } catch (e) {
      update('delete', CHECK.WARN, `Delete failed (non-critical): ${e.message}`);
    }

    setRunning(false);
  };

  const Icon = ({ status }) => {
    if (status === CHECK.PASS)    return <CheckCircle   size={16} style={{ color: '#16a34a' }} />;
    if (status === CHECK.FAIL)    return <XCircle       size={16} style={{ color: '#dc2626' }} />;
    if (status === CHECK.WARN)    return <AlertTriangle size={16} style={{ color: '#d97706' }} />;
    if (status === CHECK.RUNNING) return <RefreshCw     size={16} style={{ color: '#6b7280', animation: 'spin .8s linear infinite' }} />;
    return <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e5e7eb' }} />;
  };

  const allPassed = results.length > 0 && results.every(r => r.status === CHECK.PASS);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, boxShadow: '0 24px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'var(--navy)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 17, fontFamily: 'DM Sans, sans-serif' }}>🔧 Storage Diagnostics</h3>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 3 }}>Run checks to identify why uploads are failing</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Close</button>
        </div>

        <div style={{ padding: 24 }}>
          <button
            onClick={runDiagnostics}
            disabled={running}
            style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? .7 : 1, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={14} /> {running ? 'Running checks…' : 'Run Diagnostics'}
          </button>

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {results.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: r.status === CHECK.FAIL ? '#fef2f2' : r.status === CHECK.WARN ? '#fffbeb' : r.status === CHECK.PASS ? '#f0fdf4' : '#f9fafb', borderRadius: 8, border: `1px solid ${r.status === CHECK.FAIL ? '#fecaca' : r.status === CHECK.WARN ? '#fde68a' : r.status === CHECK.PASS ? '#bbf7d0' : '#e5e7eb'}` }}>
                  <Icon status={r.status} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{r.label}</div>
                    {r.message && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{r.message}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fix instructions */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 20, fontSize: 13, lineHeight: 1.7, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 12, fontSize: 14, color: 'var(--navy)' }}>📋 Common Fixes</strong>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ color: '#dc2626' }}>Fix 1 — Enable Firebase Storage</strong>
              <ol style={{ paddingLeft: 18, marginTop: 6, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Firebase Console</a></li>
                <li>Build → Storage → <strong>Get Started</strong></li>
                <li>Choose <em>Start in Production mode</em> → select a region → Done</li>
              </ol>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ color: '#dc2626' }}>Fix 2 — Deploy the correct Storage rules</strong>
              <div style={{ background: '#1e293b', color: '#a3e635', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
                {`# In Firebase Console → Storage → Rules, paste:`}<br/>
                {`rules_version = '2';`}<br/>
                {`service firebase.storage {`}<br/>
                {`  match /b/{bucket}/o {`}<br/>
                {`    match /{allPaths=**} {`}<br/>
                {`      allow read: if true;`}<br/>
                {`      allow write: if request.auth != null;`}<br/>
                {`    }`}<br/>
                {`  }`}<br/>
                {`}`}
              </div>
              <p style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>Or use the CLI: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>firebase deploy --only storage</code></p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ color: '#dc2626' }}>Fix 3 — Correct storageBucket in .env</strong>
              <div style={{ background: '#1e293b', color: '#a3e635', padding: '10px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, marginTop: 6 }}>
                {`# New Firebase projects (2024+) use:`}<br/>
                {`VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app`}<br/><br/>
                {`# Older projects use:`}<br/>
                {`VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com`}
              </div>
              <p style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>
                Find the exact value: Firebase Console → Project Settings → Your apps → SDK setup → copy <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>storageBucket</code>
              </p>
            </div>

            <div>
              <strong style={{ color: '#dc2626' }}>Fix 4 — CORS (if using custom domain)</strong>
              <p style={{ color: '#374151', marginTop: 4 }}>
                If your app is on a custom domain and uploads fail with CORS errors, set up Storage CORS config via the <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 3 }}>gsutil cors set</code> command in Google Cloud Console.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
