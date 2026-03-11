// src/components/NewsScraperModal.jsx
import { useState, useEffect } from 'react'
import { fetchNews, fetchArticleMeta, fetchScrapeSettings } from '../api'
import { catColor } from '../utils'

const CATEGORIES = ['All','Technology','Science','Business','Health','Politics','Sports','Entertainment','Travel','Culture']

export default function NewsScraperModal({ onFill, onClose }) {
  const [articles,  setArticles]  = useState([])
  const [sources,   setSources]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [fetching,  setFetching]  = useState(null)
  const [sourceId,  setSourceId]  = useState('all')
  const [category,  setCategory]  = useState('All')
  const [search,    setSearch]    = useState('')
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetchScrapeSettings()
      .then(d => { if (d.success) setSources(d.settings.sites.filter(s => s.enabled)) })
      .catch(() => {})
  }, [])

  const load = async (sid, cat, q) => {
    setLoading(true); setError('')
    try {
      let res
      const token = localStorage.getItem('nexus_token') || ''
      const auth  = { Authorization: `Bearer ${token}` }

      if (q && q.trim()) {
        // Search query — category can be combined
        const params = new URLSearchParams({ q: q.trim() })
        if (cat && cat !== 'All') params.set('category', cat)
        res = await fetch(`/api/news?${params}`, { headers: auth }).then(r => r.json())
      } else if (cat && cat !== 'All') {
        // Category filter via Google News search
        res = await fetch(`/api/news?category=${encodeURIComponent(cat)}`, { headers: auth }).then(r => r.json())
      } else if (sid && sid !== 'all') {
        // Specific source
        res = await fetch(`/api/news?source_id=${encodeURIComponent(sid)}`, { headers: auth }).then(r => r.json())
      } else {
        // All enabled sources
        res = await fetch('/api/news', { headers: auth }).then(r => r.json())
      }

      if (res.success) setArticles(res.articles)
      else setError(res.error || 'Failed to load news')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load('all', 'All', '') }, [])

  const handleSourceChange = (sid) => {
    setSourceId(sid); setCategory('All'); setSearch('')
    load(sid, 'All', '')
  }

  const handleCategoryChange = (cat) => {
    setCategory(cat); setSearch('')
    load(sourceId, cat, '')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    load(sourceId, category, search)
  }

  const handleReset = () => {
    setSearch(''); setCategory('All'); setSourceId('all')
    load('all', 'All', '')
  }

  const handlePick = async (article) => {
    setFetching(article.url)
    try {
      const token = localStorage.getItem('nexus_token') || ''
      const res   = await fetch(`/api/news?fetch=${encodeURIComponent(article.url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())

      const meta = res.success ? res.meta : {}

      const activeSrc = sources.find(s => s.id === sourceId)
      const title     = meta.title       || article.title   || ''
      const excerpt   = meta.excerpt     || article.excerpt || ''
      const image     = meta.cover_image || article.thumb   || ''
      const author    = meta.author      || article.author  || ''
      const category  = activeSrc?.category || meta.category || article.category || ''
      const tags      = [...new Set([...(meta.tags || []), ...(article.tags || [])])].slice(0, 6)

      const seoTitle = title.length > 60
        ? title.slice(0, 57).replace(/\s+\S*$/, '') + '...' : title
      const seoDesc  = excerpt.length > 155
        ? excerpt.slice(0, 152).replace(/\s+\S*$/, '') + '...' : excerpt

      const content = meta.content_html
        || `<p>${excerpt}</p>\n<hr/>\n<p><small>📰 Source: <a href="${article.url}" target="_blank">${article.source || ''}</a></small></p>`

      onFill({ title, excerpt, cover_image: image, author, category, tags,
               seo_title: seoTitle, seo_description: seoDesc, content })
    } catch {
      const activeSrc = sources.find(s => s.id === sourceId)
      onFill({
        title:           article.title   || '',
        excerpt:         article.excerpt || '',
        cover_image:     article.thumb   || '',
        author:          article.author  || '',
        category:        activeSrc?.category || article.category || '',
        tags:            article.tags    || [],
        seo_title:       (article.title  || '').slice(0, 60),
        seo_description: (article.excerpt|| '').slice(0, 155),
        content: `<p>${article.excerpt}</p>\n<hr/>\n<p><small>📰 Source: <a href="${article.url}" target="_blank">${article.source}</a></small></p>`,
      })
    } finally {
      setFetching(null)
      onClose()
    }
  }

  const isFiltered = search || category !== 'All' || sourceId !== 'all'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">📰 Live News Feed</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {articles.length} articles · click any to import with full content, images & author
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* Filters */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-2">

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search any topic..." className="form-input text-sm flex-1"/>
            <button type="submit" className="btn-primary text-sm py-2 px-4">Search</button>
            {isFiltered && (
              <button type="button" onClick={handleReset}
                className="btn-outline text-sm py-2 px-3" title="Reset all filters">↺</button>
            )}
          </form>

          {/* Source tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 self-center mr-1">Source:</span>
            <button onClick={() => handleSourceChange('all')}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                sourceId === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              All
            </button>
            {sources.map(s => (
              <button key={s.id} onClick={() => handleSourceChange(s.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  sourceId === s.id ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 self-center mr-1">Category:</span>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => handleCategoryChange(cat)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  category === cat
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                style={category === cat && cat !== 'All' ? { background: catColor(cat) } : category === cat ? { background: '#3b82f6' } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              <span>Loading news...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">😕</div>
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={() => load(sourceId, category, search)}
                className="mt-3 btn-outline text-sm py-2 px-4">Retry</button>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">No articles found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map((a, i) => (
                <button key={i} onClick={() => handlePick(a)}
                  disabled={!!fetching}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group disabled:opacity-50">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    {a.thumb && (
                      <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img src={a.thumb} alt="" className="w-full h-full object-cover"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {a.title}
                      </div>
                      {a.excerpt && (
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{a.excerpt}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {a.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white flex-shrink-0"
                            style={{ background: catColor(a.category) }}>
                            {a.category}
                          </span>
                        )}
                        {a.source && (
                          <span className="text-xs font-medium text-blue-500 flex-shrink-0">{a.source}</span>
                        )}
                        {a.author && (
                          <span className="text-xs text-slate-400 flex-shrink-0">by {a.author}</span>
                        )}
                        {a.pub_date && (
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {new Date(a.pub_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      {fetching === a.url
                        ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        : <span className="text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Import →</span>
                      }
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex-shrink-0 flex items-center justify-between">
          <span>Content sourced from original publishers · edit before publishing</span>
          <span>{articles.length} articles</span>
        </div>
      </div>
    </div>
  )
}
