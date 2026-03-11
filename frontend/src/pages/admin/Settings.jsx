// src/pages/admin/Settings.jsx
import { useState } from 'react'
import { toast } from '../../components/shared'

const ENV_GROUPS = [
  {
    label: '🔐 Admin Auth',
    color: 'border-l-slate-500',
    vars: [
      { key: 'ADMIN_SECRET',   desc: 'Bearer token used by the frontend to authenticate API calls', req: 'Required' },
      { key: 'ADMIN_USERNAME', desc: 'Admin login username (default: admin)',                       req: 'Recommended' },
      { key: 'ADMIN_PASSWORD', desc: 'Admin login password (default: nexus2025)',                   req: 'Required' },
    ],
  },
  {
    label: '🟠 Anthropic',
    color: 'border-l-orange-500',
    vars: [
      { key: 'ANTHROPIC_API_KEY', desc: 'API key from console.anthropic.com — used by Claude Sonnet, Opus, and Haiku models', req: 'For Claude' },
    ],
  },
  {
    label: '🟢 OpenAI',
    color: 'border-l-green-500',
    vars: [
      { key: 'OPENAI_API_KEY', desc: 'API key from platform.openai.com — used by GPT-4o and GPT-4o Mini', req: 'For OpenAI' },
    ],
  },
  {
    label: '🔵 DeepSeek',
    color: 'border-l-blue-500',
    vars: [
      { key: 'DEEPSEEK_API_KEY', desc: 'API key from platform.deepseek.com — used by DeepSeek V3 and DeepSeek R1 (Reasoner)', req: 'For DeepSeek' },
    ],
  },
  {
    label: '🔴 Google Gemini',
    color: 'border-l-red-500',
    vars: [
      { key: 'GEMINI_API_KEY', desc: 'API key from aistudio.google.com — used by Gemini 2.0 Flash and Gemini 1.5 Pro', req: 'For Gemini' },
    ],
  },
  {
    label: '🗄️ Storage (KV)',
    color: 'border-l-purple-500',
    vars: [
      { key: 'KV_REST_API_URL',   desc: 'Vercel KV (Upstash Redis) REST URL — enables persistent article storage across deploys', req: 'For persistence' },
      { key: 'KV_REST_API_TOKEN', desc: 'Vercel KV auth token — find in Vercel Dashboard → Storage tab',                          req: 'For persistence' },
    ],
  },
]

const REQ_COLORS = {
  'Required':        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  'Recommended':     'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
}
const REQ_DEFAULT = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'

const ENDPOINTS = [
  ['GET',    '/api/articles',                   'List published articles'],
  ['GET',    '/api/articles?status=all',         'List all (admin)'],
  ['GET',    '/api/articles?category=Technology','Filter by category'],
  ['GET',    '/api/articles/[id]',               'Get single article'],
  ['POST',   '/api/articles',                    'Create article (auth)'],
  ['PUT',    '/api/articles/[id]',               'Update article (auth)'],
  ['DELETE', '/api/articles/[id]',               'Delete article (auth)'],
  ['POST',   '/api/ai-generate',                 'AI generation — multi-model (auth)'],
  ['GET',    '/api/ai-generate',                 'List available AI models'],
  ['GET',    '/api/stats',                       'Dashboard statistics (auth)'],
  ['POST',   '/api/auth',                        'Login → returns token'],
]
const METHOD_COLORS = { GET:'bg-teal-600', POST:'bg-blue-600', PUT:'bg-amber-600', DELETE:'bg-red-600' }

const MODEL_TABLE = [
  ['claude-sonnet-4-5',         'Claude Sonnet 4.5',       'Anthropic', 'ANTHROPIC_API_KEY', 'console.anthropic.com'],
  ['claude-opus-4-5',           'Claude Opus 4.5',         'Anthropic', 'ANTHROPIC_API_KEY', 'console.anthropic.com'],
  ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5',        'Anthropic', 'ANTHROPIC_API_KEY', 'console.anthropic.com'],
  ['gpt-4o',                    'GPT-4o',                  'OpenAI',    'OPENAI_API_KEY',    'platform.openai.com'],
  ['gpt-4o-mini',               'GPT-4o Mini',             'OpenAI',    'OPENAI_API_KEY',    'platform.openai.com'],
  ['deepseek-chat',             'DeepSeek V3',             'DeepSeek',  'DEEPSEEK_API_KEY',  'platform.deepseek.com'],
  ['deepseek-reasoner',         'DeepSeek R1 (Reasoner)',  'DeepSeek',  'DEEPSEEK_API_KEY',  'platform.deepseek.com'],
  ['gemini-2.0-flash',          'Gemini 2.0 Flash',        'Google',    'GEMINI_API_KEY',    'aistudio.google.com'],
  ['gemini-1.5-pro',            'Gemini 1.5 Pro',          'Google',    'GEMINI_API_KEY',    'aistudio.google.com'],
]

const PROVIDER_ICON = { Anthropic:'🟠', OpenAI:'🟢', DeepSeek:'🔵', Google:'🔴' }

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('nexus_api_url') || window.location.origin)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')

  const save = () => {
    localStorage.setItem('nexus_api_url', apiUrl)
    setSaved(true)
    toast('Settings saved', 'success')
    setTimeout(() => setSaved(false), 2000)
  }

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="fade-in max-w-3xl space-y-5">
      <div className="mb-6">
        <h1 className="text-xl font-bold">⚙️ Settings</h1>
        <p className="text-sm text-slate-400">API config, environment variables, model reference</p>
      </div>

      {/* API URL config */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold mb-4">🌐 API Base URL</h2>
        <div className="mb-4">
          <input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
            className="form-input" placeholder="https://your-project.vercel.app"/>
          <p className="text-xs text-slate-400 mt-1">Leave as-is to use relative URLs (same domain). Only change for custom domains.</p>
        </div>
        <button onClick={save} className={`btn-primary text-sm ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Environment Variables */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold mb-1">🔑 Environment Variables</h2>
        <p className="text-xs text-slate-400 mb-4">
          Set in <strong>Vercel Dashboard → Project → Settings → Environment Variables</strong>. Each AI provider needs its own key.
        </p>
        <div className="space-y-4">
          {ENV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.vars.map(({ key, desc, req }) => (
                  <div key={key}
                    className={`flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border-l-4 ${group.color}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <code className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">{key}</code>
                        <button onClick={() => copy(key)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          {copied === key ? '✓' : 'copy'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium whitespace-nowrap ${REQ_COLORS[req] || REQ_DEFAULT}`}>
                      {req}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Reference Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold mb-1">🤖 Available AI Models</h2>
        <p className="text-xs text-slate-400 mb-4">Each model uses the API key of its provider. You only need to set the key for models you want to use.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left pb-2 font-bold text-slate-400 uppercase tracking-wider">Provider</th>
                <th className="text-left pb-2 font-bold text-slate-400 uppercase tracking-wider">Model</th>
                <th className="text-left pb-2 font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Model ID</th>
                <th className="text-left pb-2 font-bold text-slate-400 uppercase tracking-wider">Env Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {MODEL_TABLE.map(([id, label, provider, envKey, site]) => (
                <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold">{PROVIDER_ICON[provider]} {provider}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-medium">{label}</td>
                  <td className="py-2.5 pr-3 hidden sm:table-cell">
                    <code className="text-slate-400 font-mono text-[11px]">{id}</code>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <code className="text-blue-600 dark:text-blue-400 font-mono">{envKey}</code>
                      <a href={`https://${site}`} target="_blank" rel="noreferrer"
                        className="text-slate-400 hover:text-blue-600 text-[10px] underline">↗</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold mb-4">📋 API Reference</h2>
        <div className="space-y-1.5">
          {ENDPOINTS.map(([method, path, desc]) => (
            <div key={path+method} className="flex items-center gap-2.5 text-xs">
              <span className={`${METHOD_COLORS[method]||'bg-slate-600'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-14 text-center flex-shrink-0`}>{method}</span>
              <code className="text-slate-600 dark:text-slate-300 font-mono flex-1">{path}</code>
              <span className="text-slate-400 hidden sm:inline">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
