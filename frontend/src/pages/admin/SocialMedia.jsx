// src/pages/admin/SocialMedia.jsx
import { useState, useEffect } from 'react'
import { toast } from '../../components/shared'

const PLATFORMS = [
  { key: 'twitter',   icon: '𝕏',  label: 'Twitter / X',  placeholder: 'https://twitter.com/yourhandle',       color: 'border-l-slate-700' },
  { key: 'facebook',  icon: '📘', label: 'Facebook',      placeholder: 'https://facebook.com/yourpage',        color: 'border-l-blue-600'  },
  { key: 'instagram', icon: '📸', label: 'Instagram',     placeholder: 'https://instagram.com/yourhandle',     color: 'border-l-pink-500'  },
  { key: 'linkedin',  icon: '💼', label: 'LinkedIn',      placeholder: 'https://linkedin.com/company/yourco',  color: 'border-l-blue-800'  },
  { key: 'youtube',   icon: '▶️', label: 'YouTube',       placeholder: 'https://youtube.com/@yourchannel',     color: 'border-l-red-600'   },
  { key: 'tiktok',    icon: '🎵', label: 'TikTok',        placeholder: 'https://tiktok.com/@yourhandle',       color: 'border-l-slate-900' },
]

const EMPTY = { twitter: '', facebook: '', instagram: '', linkedin: '', youtube: '', tiktok: '' }

export default function SocialMedia() {
  const [social,  setSocial]  = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch('/api/social')
      .then(r => r.json())
      .then(d => { if (d.success) setSocial({ ...EMPTY, ...d.social }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setField = (k, v) => setSocial(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('nexus_token') || ''
      const res   = await fetch('/api/social', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ social }),
      })
      const data = await res.json()
      if (data.success) toast('✅ Social links saved!', 'success')
      else toast(`Error: ${data.error}`, 'error')
    } catch (e) {
      toast(`Error: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const filledCount = Object.values(social).filter(Boolean).length

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">📱 Social Media</h1>
          <p className="text-sm text-slate-400 mt-1">
            These links are public — they appear in the share widget on every article.
            {filledCount > 0 && <span className="ml-2 text-green-500 font-medium">{filledCount}/6 configured</span>}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary text-sm py-2 px-5 flex-shrink-0">
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {PLATFORMS.map(({ key, icon, label, placeholder, color }) => (
          <div key={key} className={`flex items-center gap-4 p-4 border-l-4 ${color} first:rounded-tl-xl last:rounded-bl-xl`}>
            <span className="text-2xl w-8 text-center flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
              <input
                value={social[key]}
                onChange={e => setField(key, e.target.value)}
                placeholder={placeholder}
                className="form-input mt-1 text-sm"
                type="url"
              />
            </div>
            {social[key] && (
              <a href={social[key]} target="_blank" rel="noreferrer"
                className="text-xs text-blue-500 hover:underline flex-shrink-0">
                Test ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Links are stored in your KV database and served publicly via <code className="font-mono">/api/social</code>
      </p>
    </div>
  )
}
