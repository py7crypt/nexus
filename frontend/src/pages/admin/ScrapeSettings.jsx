// src/pages/admin/ScrapeSettings.jsx
import { useState, useEffect } from 'react'
import { toast } from '../../components/shared'
import { fetchScrapeSettings, saveScrapeSettings } from '../../api'

const CATEGORIES = ['', 'Technology', 'Science', 'Business', 'Health', 'Politics', 'Sports', 'Entertainment', 'Travel', 'Culture']

const PRESETS = [
  { name: 'Google News',    rss_url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',        category: '' },
  { name: 'BBC News',       rss_url: 'http://feeds.bbci.co.uk/news/rss.xml',                         category: '' },
  { name: 'Reuters',        rss_url: 'https://feeds.reuters.com/reuters/topNews',                     category: '' },
  { name: 'TechCrunch',     rss_url: 'https://techcrunch.com/feed/',                                 category: 'Technology' },
  { name: 'The Verge',      rss_url: 'https://www.theverge.com/rss/index.xml',                       category: 'Technology' },
  { name: 'Ars Technica',   rss_url: 'http://feeds.arstechnica.com/arstechnica/index',               category: 'Technology' },
  { name: 'Wired',          rss_url: 'https://www.wired.com/feed/rss',                               category: 'Technology' },
  { name: 'ESPN',           rss_url: 'https://www.espn.com/espn/rss/news',                           category: 'Sports' },
  { name: 'Sky Sports',     rss_url: 'https://www.skysports.com/rss/12040',                          category: 'Sports' },
  { name: 'NYT Health',     rss_url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',      category: 'Health' },
  { name: 'Scientific American', rss_url: 'http://rss.sciam.com/ScientificAmerican-Global',          category: 'Science' },
  { name: 'Nature',         rss_url: 'https://www.nature.com/nature.rss',                            category: 'Science' },
  { name: 'Al Jazeera',     rss_url: 'https://www.aljazeera.com/xml/rss/all.xml',                    category: 'Politics' },
  { name: 'Guardian World', rss_url: 'https://www.theguardian.com/world/rss',                        category: '' },
  { name: 'Variety',        rss_url: 'https://variety.com/feed/',                                    category: 'Entertainment' },
]

const DEFAULT_SETTINGS = {
  sites: [],
  max_per_source: 10,
  default_category: '',
  auto_excerpt_length: 200,
  content_min_chars: 60,
}

function uid() { return Math.random().toString(36).slice(2, 9) }

export default function ScrapeSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(null) // site id being tested
  const [testResult, setTestResult] = useState({}) // id → {ok, count, error}
  const [showPresets, setShowPresets] = useState(false)

  // new site form
  const [newSite, setNewSite] = useState({ name: '', rss_url: '', category: '' })

  useEffect(() => {
    fetchScrapeSettings()
      .then(d => { if (d.success) setSettings(d.settings) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (cfg = settings) => {
    setSaving(true)
    try {
      const res = await saveScrapeSettings(cfg)
      if (res.success) { setSettings(res.settings); toast('✅ Saved!', 'success') }
      else toast(`Error: ${res.error}`, 'error')
    } catch(e) { toast(`Error: ${e.message}`, 'error') }
    finally { setSaving(false) }
  }

  const addSite = () => {
    if (!newSite.rss_url.trim()) return toast('RSS URL is required', 'error')
    const site = { id: uid(), name: newSite.name || 'Custom Feed', rss_url: newSite.rss_url.trim(), enabled: true, category: newSite.category }
    setSettings(s => ({ ...s, sites: [...s.sites, site] }))
    setNewSite({ name: '', rss_url: '', category: '' })
  }

  const addPreset = (preset) => {
    const already = settings.sites.find(s => s.rss_url === preset.rss_url)
    if (already) { toast('Already added', 'error'); return }
    const site = { id: uid(), ...preset, enabled: true }
    setSettings(s => ({ ...s, sites: [...s.sites, site] }))
    setShowPresets(false)
  }

  const removeSite = (id) => setSettings(s => ({ ...s, sites: s.sites.filter(x => x.id !== id) }))

  const toggleSite = (id) => setSettings(s => ({
    ...s, sites: s.sites.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x)
  }))

  const updateSiteField = (id, field, val) => setSettings(s => ({
    ...s, sites: s.sites.map(x => x.id === id ? { ...x, [field]: val } : x)
  }))

  const testSite = async (site) => {
    setTesting(site.id)
    setTestResult(r => ({ ...r, [site.id]: null }))
    try {
      const token = localStorage.getItem('nexus_token') || ''
      const res = await fetch(`/api/news?source_id=${encodeURIComponent(site.id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
      if (res.success) {
        setTestResult(r => ({ ...r, [site.id]: { ok: true, count: res.count } }))
      } else {
        setTestResult(r => ({ ...r, [site.id]: { ok: false, error: res.error } }))
      }
    } catch(e) {
      setTestResult(r => ({ ...r, [site.id]: { ok: false, error: e.message } }))
    } finally {
      setTesting(null)
    }
  }

  const setField = (k, v) => setSettings(s => ({ ...s, [k]: v }))

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  const enabledCount = settings.sites.filter(s => s.enabled).length

  return (
    <div className="fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">📡 Scrape Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">{enabledCount} source{enabledCount !== 1 ? 's' : ''} active · News Import pulls from all enabled feeds</p>
        </div>
        <button onClick={() => save()} disabled={saving} className="btn-primary text-sm py-2 px-5">
          {saving ? '⏳ Saving...' : '💾 Save All'}
        </button>
      </div>

      {/* ── Feed Sources ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-sm">RSS Feed Sources</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowPresets(v => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium">
              + Presets
            </button>
          </div>
        </div>

        {/* Preset picker */}
        {showPresets && (
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 mb-3 font-medium">Click to add a preset source:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.rss_url} onClick={() => addPreset(p)}
                  disabled={!!settings.sites.find(s => s.rss_url === p.rss_url)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {p.name} {p.category ? `· ${p.category}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sites list */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {settings.sites.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No sources added yet. Use Presets or add a custom feed below.</p>
            </div>
          )}
          {settings.sites.map(site => (
            <div key={site.id} className={`px-5 py-4 transition-colors ${!site.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Toggle */}
                <button onClick={() => toggleSite(site.id)}
                  className={`mt-0.5 w-10 h-5 rounded-full flex-shrink-0 transition-colors relative ${site.enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${site.enabled ? 'left-5' : 'left-0.5'}`}/>
                </button>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex gap-2">
                    <input value={site.name} onChange={e => updateSiteField(site.id, 'name', e.target.value)}
                      className="form-input text-sm font-semibold flex-1" placeholder="Source name"/>
                    <select value={site.category} onChange={e => updateSiteField(site.id, 'category', e.target.value)}
                      className="form-select text-xs w-36 flex-shrink-0">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Any category'}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input value={site.rss_url} onChange={e => updateSiteField(site.id, 'rss_url', e.target.value)}
                      className="form-input text-xs text-slate-500 flex-1 font-mono" placeholder="https://example.com/feed.xml"/>
                  </div>

                  {/* Test result */}
                  {testResult[site.id] && (
                    <div className={`text-xs px-2 py-1 rounded ${testResult[site.id].ok ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                      {testResult[site.id].ok
                        ? `✓ Working — ${testResult[site.id].count} articles found`
                        : `✗ ${testResult[site.id].error}`}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  <button onClick={() => testSite(site)} disabled={testing === site.id}
                    title="Test this feed"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50">
                    {testing === site.id ? <span className="inline-block w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"/> : '▶ Test'}
                  </button>
                  <button onClick={() => removeSite(site.id)}
                    title="Remove source"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-red-500 hover:text-red-500 transition-colors">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom site */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Add Custom RSS Feed</p>
          <div className="flex gap-2 flex-wrap">
            <input value={newSite.name} onChange={e => setNewSite(s => ({...s, name: e.target.value}))}
              placeholder="Source name" className="form-input text-sm w-40"/>
            <input value={newSite.rss_url} onChange={e => setNewSite(s => ({...s, rss_url: e.target.value}))}
              placeholder="https://example.com/feed.xml" className="form-input text-sm flex-1 min-w-48 font-mono"/>
            <select value={newSite.category} onChange={e => setNewSite(s => ({...s, category: e.target.value}))}
              className="form-select text-sm w-36">
              {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Any category'}</option>)}
            </select>
            <button onClick={addSite} className="btn-primary text-sm py-2 px-4 flex-shrink-0">+ Add</button>
          </div>
        </div>
      </div>

      {/* ── General Settings ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-sm">General Settings</h2>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Articles per source</label>
            <input type="number" min={1} max={50}
              value={settings.max_per_source}
              onChange={e => setField('max_per_source', parseInt(e.target.value) || 10)}
              className="form-input text-sm"/>
            <p className="text-xs text-slate-400 mt-1">How many articles to fetch from each RSS feed</p>
          </div>
          <div>
            <label className="form-label">Default category</label>
            <select value={settings.default_category}
              onChange={e => setField('default_category', e.target.value)}
              className="form-select text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c || 'None (use source category)'}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Applied when a source has no category set</p>
          </div>
          <div>
            <label className="form-label">Min paragraph length (chars)</label>
            <input type="number" min={20} max={200}
              value={settings.content_min_chars}
              onChange={e => setField('content_min_chars', parseInt(e.target.value) || 60)}
              className="form-input text-sm"/>
            <p className="text-xs text-slate-400 mt-1">Paragraphs shorter than this are ignored when scraping article body</p>
          </div>
          <div>
            <label className="form-label">Excerpt length (chars)</label>
            <input type="number" min={50} max={500}
              value={settings.auto_excerpt_length}
              onChange={e => setField('auto_excerpt_length', parseInt(e.target.value) || 200)}
              className="form-input text-sm"/>
            <p className="text-xs text-slate-400 mt-1">Max characters for the auto-generated excerpt</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => save()} disabled={saving} className="btn-primary py-2.5 px-8">
          {saving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  )
}
