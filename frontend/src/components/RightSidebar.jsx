// src/components/RightSidebar.jsx
// Shared right sidebar used across all public pages.
// variant = 'home' | 'article' | 'category'
//   - 'home' and 'category' show the Newsletter card
//   - 'article' replaces Newsletter with Share card

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getCategories, catColor, timeAgo } from '../utils'
import { useQuery } from '@tanstack/react-query'
import { fetchArticles } from '../api'

function SidebarCard({ header, children, className = '' }) {
  return (
    <div className={`nexus-sidebar-card overflow-hidden ${className}`}>
      <div className="nexus-sidebar-header">
        <span className="nexus-section-accent mr-2"/>
        {header}
      </div>
      {children}
    </div>
  )
}

function TrendingItem({ article, rank }) {
  if (!article) return null
  const accent = catColor(article.category)
  return (
    <Link to={`/article/${article.id}`} className="trending-card group block" style={{ textDecoration: 'none' }}>
      <div className="flex gap-3 items-start">
        {/* Image takes the rank slot — always shown */}
        <div className="trending-thumb flex-shrink-0">
          {article.cover_image
            ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
            : <div className="w-full h-full flex items-center justify-center text-lg nexus-img-placeholder">📰</div>
          }
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <span className="trending-cat-badge" style={{ color: accent, borderColor: accent + '44', background: accent + '14' }}>
            {article.category}
          </span>
          <h5 className="font-display text-xs font-bold line-clamp-2 leading-snug mt-1 group-hover:text-primary transition-colors" style={{ color: 'var(--text-primary)' }}>
            {article.title}
          </h5>
          <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(article.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function ShareCard({ article }) {
  const [copied, setCopied] = useState(false)
  if (!article) return null

  const rawUrl = typeof window !== 'undefined' ? window.location.href : ''
  const encoded = encodeURIComponent(rawUrl)
  const title   = encodeURIComponent(article.title || '')

  const shareLinks = [
    { label: 'Twitter',   icon: 'https://cdn.simpleicons.org/x/white',        shareUrl: `https://twitter.com/intent/tweet?url=${encoded}&text=${title}` },
    { label: 'Facebook',  icon: 'https://cdn.simpleicons.org/facebook/white',  shareUrl: `https://facebook.com/sharer/sharer.php?u=${encoded}` },
    { label: 'LinkedIn',  icon: 'https://cdn.simpleicons.org/linkedin/white',  shareUrl: `https://linkedin.com/shareArticle?mini=true&url=${encoded}&title=${title}` },
    { label: 'WhatsApp',  icon: 'https://cdn.simpleicons.org/whatsapp/white',  shareUrl: `https://wa.me/?text=${title}%20${encoded}` },
    { label: 'Telegram',  icon: 'https://cdn.simpleicons.org/telegram/white',  shareUrl: `https://t.me/share/url?url=${encoded}&text=${title}` },
    { label: 'Reddit',    icon: 'https://cdn.simpleicons.org/reddit/white',    shareUrl: `https://reddit.com/submit?url=${encoded}&title=${title}` },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(rawUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <SidebarCard header="Share This Article">
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {shareLinks.map(({ icon, label, shareUrl }) => (
            <button key={label}
              onClick={() => window.open(shareUrl, '_blank', 'width=600,height=400')}
              className="flex flex-col items-center py-2 rounded-lg text-xs font-semibold gap-1.5 group transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseOver={e => { e.currentTarget.style.background='var(--accent)'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='var(--accent)' }}
              onMouseOut={e => { e.currentTarget.style.background='var(--bg-elevated)'; e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.borderColor='var(--border)' }}>
              <img src={icon} alt={label} style={{ width:'14px', height:'14px', objectFit:'contain', opacity:0.7 }}/>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button onClick={handleCopy}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
          onMouseOver={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-glow)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-elevated)' }}>
          <span className="truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{rawUrl.slice(0,38)}…</span>
          <span className="flex-shrink-0 font-bold" style={{ color: copied ? '#22c55e' : 'var(--accent)' }}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </span>
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={() => navigator.share({ title: article.title, url: rawUrl }).catch(()=>{})}
            className="w-full mt-2 py-2 rounded-lg text-xs font-bold transition-colors btn-primary">
            ↗ Share…
          </button>
        )}
      </div>
    </SidebarCard>
  )
}

function NewsletterCard() {
  return (
    <div className="nexus-newsletter-card">
      <div className="text-2xl mb-2">✉️</div>
      <h3 className="font-black text-white text-sm mb-1" >Stay Informed</h3>
      <p className="text-xs mb-3" style={{ color: 'rgba(147,197,253,0.75)' }}>Get NEXUS top stories every morning. No spam.</p>
      <input type="email" placeholder="Enter your email"
        className="w-full rounded-lg px-3 py-2 text-sm text-white mb-2"
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', outline: 'none' }}/>
      <button className="w-full py-2.5 bg-white rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
        style={{ color: 'var(--accent)' }}>
        Subscribe Free
      </button>
    </div>
  )
}

export default function RightSidebar({ variant = 'home', article = null }) {
  const [cats,        setCats]        = useState(getCategories())
  const [socialLinks, setSocialLinks] = useState([])

  useEffect(() => {
    const sync = () => setCats(getCategories())
    window.addEventListener('storage', sync)
    const t = setInterval(sync, 2000)
    return () => { window.removeEventListener('storage', sync); clearInterval(t) }
  }, [])

  useEffect(() => {
    fetch('/api/social').then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.links)) setSocialLinks(d.links) })
      .catch(() => {})
  }, [])

  const { data: trendingData } = useQuery({
    queryKey: ['articles', 'trending-sidebar'],
    queryFn: () => fetchArticles({ limit: 8 }),
    staleTime: 5 * 60 * 1000,
  })
  const trending = trendingData?.articles || []

  return (
    <aside className="space-y-4">

      {/* 1. Follow Us (social icons) */}
      {socialLinks.length > 0 && (
        <SidebarCard header="Follow Us">
          <div className="p-3 flex flex-wrap gap-2">
            {socialLinks.map(l => {
              // Derive a simpleicons URL from the label if no icon provided
              const slug = l.label?.toLowerCase().replace(/\s+/g, '')
              const iconUrl = l.icon || `https://cdn.simpleicons.org/${slug}`
              return (
                <a key={l.id} href={l.url || '#'} target="_blank" rel="noreferrer" title={l.label}
                  className="social-icon-btn">
                  <img
                    src={iconUrl}
                    alt={l.label}
                    style={{ width:'16px', height:'16px', objectFit:'contain' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
                  />
                  <span style={{ display:'none', fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)' }}>
                    {l.label?.[0]?.toUpperCase()||'?'}
                  </span>
                </a>
              )
            })}
          </div>
        </SidebarCard>
      )}

      {/* 2. Trending Posts */}
      {trending.length > 0 && (
        <SidebarCard header="🔥 Trending Now">
          <div className="p-2 space-y-1">
            {trending.slice(0, 6).map((a, i) => (
              <TrendingItem key={a.id} article={a} rank={i+1}/>
            ))}
          </div>
        </SidebarCard>
      )}

      {/* 3. Weather */}
      <SidebarCard header="Weather">
        <iframe src="/widgets/weather.html" title="Weather" className="w-full border-0" style={{ height: '200px' }} loading="lazy"/>
      </SidebarCard>

      {/* 4. Sudoku */}
      <SidebarCard header="Sudoku">
        <iframe src="/widgets/sudoku.html" title="Sudoku" className="w-full border-0" style={{ height: '340px' }} loading="lazy"/>
      </SidebarCard>

      {/* 5. Categories */}
      <SidebarCard header="Categories">
        <div className="p-3 flex flex-wrap gap-1.5">
          {cats.map(cat => (
            <Link key={cat.name} to={`/category/${cat.name.toLowerCase()}`}
              className="nexus-cat-pill" style={{ '--cat-color': cat.color }}>
              {cat.icon} {cat.name}
            </Link>
          ))}
        </div>
      </SidebarCard>

      {/* 7. Article: Share card | Home+Category: Newsletter */}
      {variant === 'article'
        ? <ShareCard article={article}/>
        : <NewsletterCard/>
      }

    </aside>
  )
}