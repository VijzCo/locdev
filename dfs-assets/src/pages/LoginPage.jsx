// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { LoadingSpinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { setUser } = useAuth()
  const navigate    = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill in all fields.')
    setLoading(true)
    try {
      const user = await login(email, password)
      setUser(user)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-dark-850 border-r border-dark-700 p-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-display font-bold text-base">D</span>
            </div>
            <div>
              <div className="font-display font-bold text-sm text-dark-100">DutyFreeSourcing</div>
              <div className="font-mono text-[10px] text-dark-500 tracking-widest uppercase">Inc.</div>
            </div>
          </div>

          <h2 className="font-display font-bold text-3xl text-dark-100 leading-tight mb-4">
            Asset Management<br />System
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed">
            Centralized tracking for IT assets, inventory, and issuance across all departments.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {[
            ['◈', 'IT Asset Lifecycle Management'],
            ['▥', 'Multi-Department Inventory'],
            ['⊡', 'QR Code Asset Labeling'],
            ['≡', 'Full Audit Trail'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-3 text-sm text-dark-400">
              <span className="text-brand-500">{icon}</span>
              {label}
            </div>
          ))}
        </div>

        <div className="font-mono text-xs text-dark-600">v1.0.0 · DutyFreeSourcing Inc.</div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <span className="text-white font-display font-bold text-sm">D</span>
              </div>
              <span className="font-display font-bold text-dark-100">DutyFreeSourcing</span>
            </div>
          </div>

          <h1 className="font-display font-bold text-2xl text-dark-100 mb-1">Sign in</h1>
          <p className="text-sm text-dark-400 mb-8">Enter your credentials to access the system.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@dutyfree.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
              {loading ? <LoadingSpinner size="sm" /> : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-dark-800 border border-dark-700 rounded-lg space-y-3">
            <div>
              <p className="text-xs font-mono text-dark-500 mb-1 uppercase tracking-widest">First time?</p>
              <p className="text-xs text-dark-400">
                No admin account yet?{' '}
                <a href="/setup" className="text-brand-400 hover:text-brand-300 underline font-medium">
                  Go to /setup
                </a>{' '}
                to create your first admin account.
              </p>
            </div>
            <div className="border-t border-dark-700 pt-3">
              <p className="text-xs font-mono text-dark-500 mb-1 uppercase tracking-widest">Existing users</p>
              <p className="text-xs text-dark-400">Sign in with the email and password set during setup or user creation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
