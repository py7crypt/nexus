// src/components/shared.jsx — reusable UI pieces

import { catClass, formatDate, CAT_COLORS } from '../utils'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

// ── Article Card ────────────────────────────────────────────
export function ArticleCard({ article, size = 'md' }) {
  if (!article) return null
  const isLg = size === 'lg'

  return (
    <Link to={`/article/${article.id}`} className="article-card group block">
      <div className={`overflow-hidden ${isLg ? 'h-56' : 'h-44'} relative`}>
        {article.cover_image
          ? <img src={article.cover_image} alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
          : <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-content-center justify-center text-4xl">📰</div>
        }
        <span className={`cat-tag ${catClass(article.category)} absolute top-3 left-3`}>
          {article.category}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-semibold leading-snug mb-2 line-clamp-3 group-hover:text-blue-600 transition-colors ${isLg ? 'text-base' : 'text-sm'}`}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {article.excerpt.replace(/<[^>]*>/g,'')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-500 dark:text-slate-400">{article.author}</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Hero Article (big featured) ─────────────────────────────
export function HeroArticle({ article }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="relative rounded-2xl overflow-hidden block group h-[480px] card-zoom shadow-lg">
      {article.cover_image
        ? <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover"/>
        : <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-900"/>
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"/>
      <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
        <span className={`cat-tag ${catClass(article.category)} mb-3 inline-block`}>{article.category}</span>
        <h2 className="font-display text-2xl lg:text-3xl font-black leading-tight mb-3 group-hover:text-blue-300 transition-colors line-clamp-3">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-sm text-white/75 line-clamp-2 mb-4">{article.excerpt.replace(/<[^>]*>/g,'')}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="font-semibold text-white/80">{article.author}</span>
          <span>·</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className={`${s} border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin`}
         style={{ borderWidth: 3 }}/>
  )
}

// ── Toast ────────────────────────────────────────────────────
const toastListeners = []
export function toast(msg, type = 'info') {
  toastListeners.forEach(fn => fn({ msg, type, id: Date.now() }))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const fn = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500)
    }
    toastListeners.push(fn)
    return () => { const i = toastListeners.indexOf(fn); if (i > -1) toastListeners.splice(i, 1) }
  }, [])

  const colors = { success: 'border-l-green-500', error: 'border-l-red-500', info: 'border-l-blue-500' }
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999]">
      {toasts.map(t => (
        <div key={t.id}
          className={`bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-xl border-l-4 ${colors[t.type]||colors.info} fade-in max-w-xs`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Status Pill ──────────────────────────────────────────────
export function StatusPill({ status }) {
  const map = {
    published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    draft:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${map[status]||map.draft}`}>
      {status}
    </span>
  )
}

// ── SEO Score ────────────────────────────────────────────────
export function SEOScore({ title, content, seoTitle, seoDesc, tags, coverImage }) {
  const checks = [
    { label: 'Title 10+ chars',   pass: (title||'').length >= 10 },
    { label: 'Content 300+ words', pass: content?.replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length >= 300 },
    { label: 'SEO title set',     pass: (seoTitle||'').length > 0 },
    { label: 'Meta description',  pass: (seoDesc||'').length >= 50 },
    { label: 'Cover image',       pass: !!(coverImage) },
    { label: 'Tags added',        pass: (tags||[]).length > 0 },
  ]
  const score = Math.round(checks.filter(c=>c.pass).length / checks.length * 100)
  const color = score >= 80 ? 'text-green-600 bg-green-100' : score >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
          {score}
        </div>
        <div>
          <div className="text-sm font-semibold">{score >= 80 ? '🎯 Great SEO!' : score >= 50 ? '⚡ Needs work' : '⚠️ Poor SEO'}</div>
          <div className="text-xs text-slate-400">{checks.filter(c=>c.pass).length}/{checks.length} checks passed</div>
        </div>
      </div>
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1.5">
          <span className={c.pass ? 'text-green-500' : 'text-red-400'}>{c.pass ? '✓' : '✗'}</span>
          <span className={c.pass ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Category Badge ───────────────────────────────────────────
export function CatBadge({ category, size = 'sm' }) {
  const color = CAT_COLORS[category] || '#1E73FF'
  const p = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-block font-bold uppercase tracking-wide rounded-full text-white ${p}`}
      style={{ background: color }}>
      {category}
    </span>
  )
}
