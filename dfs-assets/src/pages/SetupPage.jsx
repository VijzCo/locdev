// src/pages/SetupPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// First-run admin setup page.
// Accessible at /setup ONLY when no users exist in Firestore.
// Once at least one admin exists, this route redirects to /login.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  collection, getDocs, setDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/services/firebase/config'
import { LoadingSpinner } from '@/components/ui'

const STEPS = ['Check', 'Details', 'Done']

export default function SetupPage() {
  const navigate = useNavigate()

  const [step, setStep]         = useState('checking') // checking | form | done | blocked
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name:           '',
    email:          '',
    password:       '',
    confirmPassword:'',
    employeeNumber: 'EMP-0001',
    department:     'IT',
  })

  // ── On mount: check if any users already exist ──────────────────
  useEffect(() => {
    async function checkExisting() {
      try {
        const snap = await getDocs(collection(db, 'users'))
        if (snap.size > 0) {
          setStep('blocked')
        } else {
          setStep('form')
        }
      } catch {
        // Firestore rules may block unauthenticated reads — that means
        // users already exist and rules are enforcing auth.
        setStep('blocked')
      }
    }
    checkExisting()
  }, [])

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  // ── Create admin account ────────────────────────────────────────
  async function handleCreate() {
    setError('')
    const { name, email, password, confirmPassword, employeeNumber, department } = form

    if (!name || !email || !password || !employeeNumber)
      return setError('All fields are required.')
    if (password.length < 8)
      return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword)
      return setError('Passwords do not match.')

    setSaving(true)
    try {
      // 1. Create the Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const uid  = cred.user.uid

      // 2. Write the Firestore profile with admin role
      await setDoc(doc(db, 'users', uid), {
        uid,
        name,
        email,
        employeeNumber,
        department,
        role:        'super_admin',
        createdAt:   serverTimestamp(),
        lastActive:  serverTimestamp(),
      })

      setStep('done')
    } catch (e) {
      setError(
        e.code === 'auth/email-already-in-use'
          ? 'That email is already registered. Go to /login instead.'
          : e.code === 'auth/weak-password'
          ? 'Password is too weak — use at least 8 characters.'
          : e.message
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Checking ────────────────────────────────────────────────────
  if (step === 'checking') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-dark-400 font-mono">Checking system status…</p>
        </div>
      </Screen>
    )
  }

  // ── Already has users ───────────────────────────────────────────
  if (step === 'blocked') {
    return (
      <Screen>
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-display font-bold text-xl text-dark-100 mb-2">Setup Already Complete</h2>
          <p className="text-sm text-dark-400 mb-6">
            An admin account already exists. This setup page is disabled for security.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Go to Login →
          </button>
        </div>
      </Screen>
    )
  }

  // ── Done ────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Screen>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-400 text-2xl">✓</span>
          </div>
          <h2 className="font-display font-bold text-xl text-dark-100 mb-2">
            Admin account created!
          </h2>
          <p className="text-sm text-dark-400 mb-6">
            Your account has been set up with full admin access.<br />
            You can now sign in and start using the system.
          </p>
          <button className="btn btn-primary px-8 justify-center" onClick={() => navigate('/login')}>
            Go to Login →
          </button>
        </div>
      </Screen>
    )
  }

  // ── Setup form ──────────────────────────────────────────────────
  return (
    <Screen>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display font-bold">D</span>
          </div>
          <div>
            <div className="font-display font-bold text-dark-100">DutyFreeSourcing Inc.</div>
            <div className="font-mono text-xs text-dark-500 uppercase tracking-widest">Asset Management System</div>
          </div>
        </div>

        <div className="mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-600/15 border border-brand-600/30 text-brand-400 text-xs font-mono mb-3">
            ⚙ First-Time Setup
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-dark-100 mb-1">Create Admin Account</h1>
        <p className="text-sm text-dark-400 mb-6">
          No users exist yet. Set up the first administrator account to get started.
        </p>

        {/* Error */}
        {error && (
          <div className="alert alert-danger mb-5">
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="e.g. Alex Kim" value={form.name} onChange={f('name')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employee Number *</label>
              <input className="input" placeholder="EMP-0001" value={form.employeeNumber} onChange={f('employeeNumber')} />
            </div>
            <div>
              <label className="label">Department</label>
              <select className="select" value={form.department} onChange={f('department')}>
                {['IT','HR','Finance','Operations','Management'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input type="email" className="input" placeholder="admin@company.com" value={form.email} onChange={f('email')} />
          </div>

          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={f('password')} />
          </div>

          <div>
            <label className="label">Confirm Password *</label>
            <input type="password" className="input" placeholder="Repeat password" value={form.confirmPassword} onChange={f('confirmPassword')} />
          </div>

          {/* Role info box */}
          <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
            <div className="font-mono text-xs text-dark-500 mb-1.5">Account will be created as:</div>
            <div className="flex items-center gap-2">
              <span className="badge badge-red">super_admin</span>
              <span className="text-xs text-dark-400">Full access — create, read, update, delete all records</span>
            </div>
          </div>

          <button
            className="btn btn-primary w-full justify-center py-2.5 mt-2"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="sm" /> : 'Create Admin Account →'}
          </button>
        </div>

        <p className="text-xs text-dark-600 text-center mt-5">
          This page is automatically disabled after the first admin is created.
        </p>
      </div>
    </Screen>
  )
}

// ── Centered screen wrapper ──────────────────────────────────────
function Screen({ children }) {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
