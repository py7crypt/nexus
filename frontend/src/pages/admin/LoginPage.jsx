// src/pages/admin/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export default function LoginPage() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await login(form.username, form.password)
      if (res.success) navigate('/admin')
      else setError(res.error || 'Invalid credentials')
    } catch(e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-black text-white mb-2">
            NEX<span className="text-blue-500">US</span>
          </div>
          <p className="text-slate-400 text-sm">Admin CMS — Sign in to continue</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input type="text" required autoFocus
                value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input type="password" required
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"/>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-slate-800 rounded-lg text-xs text-slate-500 font-mono">
            Default: admin / nexus2025<br/>
            <span className="text-slate-600">(Set ADMIN_USERNAME + ADMIN_PASSWORD in env)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
