// src/pages/admin/Settings.jsx
import { useState } from 'react'
import { toast } from '../../components/shared'

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('nexus_api_url') || window.location.origin)
  const [saved, setSaved] = useState(false)

  const save = () => {
    localStorage.setItem('nexus_api_url', apiUrl)
    setSaved(true)
    toast('Settings saved', 'success')
    setTimeout(() => setSaved(false), 2000)
  }

  const ENDPOINTS = [
    ['GET',    '/api/articles',              'List published articles'],
    ['GET',    '/api/articles?status=all',   'List all (admin)'],
    ['GET',    '/api/articles?category=Technology', 'Filter by category'],
    ['GET',    '/api/articles/[id]',         'Get single article'],
    ['POST',   '/api/articles',              'Create article (auth)'],
    ['PUT',    '/api/articles/[id]',         'Update article (auth)'],
    ['DELETE', '/api/articles/[id]',         'Delete article (auth)'],
    ['POST',   '/api/ai-generate',           'AI article generation (auth)'],
    ['GET',    '/api/stats',                 'Dashboard statistics (auth)'],
    ['POST',   '/api/auth',                  'Login → returns token'],
  ]

  const COLORS = { GET:'bg-teal-600', POST:'bg-blue-600', PUT:'bg-amber-600', DELETE:'bg-red-600' }

  return (
    <div className="fade-in max-w-2xl">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Config */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
        <h2 className="text-sm font-bold mb-4">⚙️ API Configuration</h2>
        <div className="mb-4">
          <label className="form-label">API Base URL</label>
          <input value={apiUrl} onChange={e=>setApiUrl(e.target.value)}
            className="form-input" placeholder="https://your-project.vercel.app"/>
          <p className="text-xs text-slate-400 mt-1">Leave empty to use relative URLs (same domain)</p>
        </div>
        <button onClick={save} className={`btn-primary text-sm ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Env Vars */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5">
        <h2 className="text-sm font-bold mb-4">🔑 Required Environment Variables</h2>
        <p className="text-xs text-slate-400 mb-3">Set these in Vercel Dashboard → Project → Settings → Environment Variables</p>
        <div className="space-y-2">
          {[
            ['ADMIN_SECRET','Your admin token (used as Bearer token)','Required'],
            ['ADMIN_USERNAME','Admin login username (default: admin)','Recommended'],
            ['ADMIN_PASSWORD','Admin login password (default: nexus2025)','Required'],
            ['ANTHROPIC_API_KEY','Your Anthropic API key for AI generation','For AI features'],
            ['KV_REST_API_URL','Vercel KV (Upstash) URL for persistent storage','For persistence'],
            ['KV_REST_API_TOKEN','Vercel KV auth token','For persistence'],
          ].map(([key,desc,req])=>(
            <div key={key} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <code className="text-xs font-bold text-blue-600 font-mono flex-shrink-0 mt-0.5">{key}</code>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${req==='Required'?'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400':req==='Recommended'?'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400':'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                {req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold mb-4">📋 API Reference</h2>
        <div className="space-y-1.5">
          {ENDPOINTS.map(([method,path,desc])=>(
            <div key={path+method} className="flex items-center gap-2.5 text-xs">
              <span className={`${COLORS[method]||'bg-slate-600'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-14 text-center flex-shrink-0`}>{method}</span>
              <code className="text-slate-600 dark:text-slate-300 font-mono flex-1">{path}</code>
              <span className="text-slate-400 hidden sm:inline">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
