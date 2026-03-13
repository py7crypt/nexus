// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchArticles } from '../api'
import { LikeButton } from '../components/shared'
import RightSidebar from '../components/RightSidebar'
import { catColor, catIcon, timeAgo, getCategories } from '../utils'

// ── Placeholder articles ──────────────────────────────────────────────────────
const PLACEHOLDER = [
  { id:'p1', title:'The Dawn of Artificial General Intelligence', category:'Technology', author:'Elena Marchetti', cover_image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80', excerpt:'Researchers at leading AI labs report breakthroughs that could reshape civilization as we know it.', created_at: new Date().toISOString() },
  { id:'p2', title:'Scientists Discover Exoplanet with Oxygen Atmosphere', category:'Science', author:'Dr. Wei Chen', cover_image:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80', excerpt:'The James Webb telescope reveals stunning data from a rocky world 40 light-years away.', created_at: new Date().toISOString() },
  { id:'p3', title:'Markets Hit All-Time Highs as Fed Signals Rate Cuts', category:'Business', author:'James Wu', cover_image:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80', excerpt:'Investors react to strong employment data alongside cooling inflation numbers.', created_at: new Date().toISOString() },
  { id:'p4', title:'New Longevity Drug Shows Remarkable Clinical Results', category:'Health', author:'Marco Bianchi', cover_image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', excerpt:'A Harvard-backed biotech reports a 30% reduction in cellular aging markers.', created_at: new Date().toISOString() },
  { id:'p5', title:"Japan's Hidden Prefectures: Beyond Tokyo and Kyoto", category:'Travel', author:'Yuki Tanaka', cover_image:'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80', excerpt:'Venture off the beaten path to discover stunning regions most tourists never see.', created_at: new Date().toISOString() },
  { id:'p6', title:'Quantum Computing Achieves New Milestone', category:'Science', author:'Dr. Sarah Kim', cover_image:'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80', excerpt:'Researchers demonstrate error-corrected quantum computation at unprecedented scale.', created_at: new Date().toISOString() },
]

// ── Hero Slider ───────────────────────────────────────────────────────────────
function HeroSlider({ articles }) {
  const [current, setCurrent] = useState(0)
  const [paused,  setPaused]  = useState(false)
  const [animDir, setAnimDir] = useState('next') // 'next' | 'prev'
  const items = articles.slice(0, 6)
  const total  = items.length

  // Auto-advance every 5s unless paused
  useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(() => {
      setAnimDir('next')
      setCurrent(c => (c + 1) % total)
    }, 5000)
    return () => clearInterval(t)
  }, [paused, total])

  const go = (idx, dir = 'next') => {
    setAnimDir(dir)
    setCurrent((idx + total) % total)
  }
  const prev = () => go(current - 1, 'prev')
  const next = () => go(current + 1, 'next')

  if (!items.length) return null
  const a = items[current]

  return (
    <div
      className="hero-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {items.map((slide, i) => (
        <div
          key={slide.id}
          className={`hero-slide ${i === current ? 'active' : ''}`}
          aria-hidden={i !== current}
        >
          {/* Background image */}
          {slide.cover_image
            ? <img src={slide.cover_image} alt="" className="hero-slide-img"/>
            : <div className="hero-slide-img" style={{ background: 'linear-gradient(135deg, #0b1120, #1E73FF33)' }}/>
          }
          {/* Gradient overlay */}
          <div className="hero-slide-overlay"/>

          {/* Content */}
          <div className="hero-slide-content">
            <div className="hero-slide-inner">
              <span className="nexus-cat-badge mb-3 inline-block" style={{ background: catColor(slide.category) }}>
                {catIcon(slide.category)} {slide.category}
              </span>
              <Link to={`/article/${slide.id}`} className="block group">
                <h1 className="hero-slide-title group-hover:text-blue-300 transition-colors">
                  {slide.title}
                </h1>
              </Link>
              {slide.excerpt && (
                <p className="hero-slide-excerpt">
                  {slide.excerpt.replace(/<[^>]*>/g, '').slice(0, 140)}…
                </p>
              )}
              <div className="hero-slide-meta">
                {slide.author && <span>✍️ {slide.author}</span>}
                <span className="opacity-40">·</span>
                <span>{timeAgo(slide.created_at)}</span>
                <Link to={`/article/${slide.id}`} className="hero-read-btn">
                  Read More →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Prev / Next arrows */}
      {total > 1 && (
        <>
          <button className="hero-arrow hero-arrow-prev" onClick={prev} aria-label="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="hero-arrow hero-arrow-next" onClick={next} aria-label="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="hero-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === current ? 'active' : ''}`}
              onClick={() => go(i, i > current ? 'next' : 'prev')}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!paused && total > 1 && (
        <div className="hero-progress" key={current}>
          <div className="hero-progress-bar"/>
        </div>
      )}

      {/* Thumbnail strip */}
      <div className="hero-thumbs">
        {items.map((slide, i) => (
          <button
            key={slide.id}
            className={`hero-thumb ${i === current ? 'active' : ''}`}
            onClick={() => go(i, i > current ? 'next' : 'prev')}
          >
            {slide.cover_image
              ? <img src={slide.cover_image} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full" style={{ background: catColor(slide.category) + '44' }}/>
            }
            <div className="hero-thumb-overlay">
              <span className="hero-thumb-cat" style={{ color: catColor(slide.category) }}>{slide.category}</span>
              <span className="hero-thumb-title">{slide.title}</span>
            </div>
            {i === current && <div className="hero-thumb-active-bar"/>}
          </button>
        ))}
      </div>
    </div>
  )
}
function GridCard({ article }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="nexus-grid-card group block" style={{ height: '100%' }}>
      {/* Fixed-height image — same on every card */}
      <div className="overflow-hidden relative" style={{ height: '160px', flexShrink: 0 }}>
        {article.cover_image
          ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
          : <div className="w-full h-full nexus-img-placeholder flex items-center justify-center text-3xl">📰</div>
        }
        <span className="absolute top-2 left-2 nexus-cat-badge" style={{ background: catColor(article.category) }}>
          {article.category}
        </span>
        <div className="absolute top-2 right-2"><LikeButton articleId={article.id}/></div>
      </div>
      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-display text-sm font-bold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors mb-1"
          style={{ color: 'var(--text-primary)' }}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs line-clamp-2 leading-relaxed mb-2"
            style={{ color: 'var(--text-secondary)' }}>
            {article.excerpt.replace(/<[^>]*>/g, '')}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{article.author}</span>
          <span className="flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(article.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}


function TrendingItem({ article, rank }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="nexus-trending-item group">
      <span className="nexus-trending-rank">{String(rank).padStart(2,'0')}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: catColor(article.category) }}>
          {article.category}
        </span>
        <h5 className="text-xs font-semibold line-clamp-2 leading-snug mt-0.5 group-hover:text-blue-500 transition-colors"
          style={{ color: 'var(--text-primary)' }}>
          {article.title}
        </h5>
        <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
          {timeAgo(article.created_at)}
        </span>
      </div>
      {article.cover_image && (
        <div className="w-11 h-9 rounded-lg overflow-hidden flex-shrink-0">
          <img src={article.cover_image} alt="" className="w-full h-full object-cover"/>
        </div>
      )}
    </Link>
  )
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const [cats, setCats] = useState(getCategories())

  useEffect(() => {
    const sync = () => setCats(getCategories())
    window.addEventListener('storage', sync)
    const t = setInterval(sync, 2000)
    return () => { window.removeEventListener('storage', sync); clearInterval(t) }
  }, [])


  const { data, isLoading } = useQuery({ queryKey: ['articles','home'], queryFn: () => fetchArticles({ limit: 30 }) })
  const articles = data?.articles?.length ? data.articles : PLACEHOLDER

  const trending  = articles.slice(0, 8)
  const latest    = articles.slice(0, 6)

  return (
    <div className="nexus-home">
      <div className="nexus-container py-6">

        {/* ── TWO-COLUMN: [Slider + Latest] | [RightSidebar] ─────────── */}
        <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-6 items-start">

          {/* LEFT: Slider then Latest Articles */}
          <div>
            {/* Hero Slider */}
            <div className="mb-6">
              <HeroSlider articles={articles}/>
            </div>

            {/* Latest Articles */}
            <div className="nexus-section-header mb-4">
              <h2 className="nexus-section-title">
                <span className="nexus-section-accent"/>
                Latest Articles
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {latest.map(a => <GridCard key={a.id} article={a}/>)}
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <RightSidebar variant="home"/>
        </div>

      </div>
    </div>
  )
}