// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchArticles } from '../api'
import { LikeButton } from '../components/shared'
import RightSidebar from '../components/RightSidebar'
import { catColor, catIcon, timeAgo, formatDate, getCategories } from '../utils'

// ── Placeholder articles ──────────────────────────────────────────────────────
const PLACEHOLDER = [
  { id:'p1', title:'The Dawn of Artificial General Intelligence', category:'Technology', author:'Elena Marchetti', cover_image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80', excerpt:'Researchers at leading AI labs report breakthroughs that could reshape civilization as we know it.', created_at: new Date().toISOString() },
  { id:'p2', title:'Scientists Discover Exoplanet with Oxygen Atmosphere', category:'Science', author:'Dr. Wei Chen', cover_image:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80', excerpt:'The James Webb telescope reveals stunning data from a rocky world 40 light-years away.', created_at: new Date().toISOString() },
  { id:'p3', title:'Markets Hit All-Time Highs as Fed Signals Rate Cuts', category:'Business', author:'James Wu', cover_image:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80', excerpt:'Investors react to strong employment data alongside cooling inflation numbers.', created_at: new Date().toISOString() },
  { id:'p4', title:'New Longevity Drug Shows Remarkable Clinical Results', category:'Health', author:'Marco Bianchi', cover_image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', excerpt:'A Harvard-backed biotech reports a 30% reduction in cellular aging markers.', created_at: new Date().toISOString() },
  { id:'p5', title:"Japan's Hidden Prefectures: Beyond Tokyo and Kyoto", category:'Travel', author:'Yuki Tanaka', cover_image:'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80', excerpt:'Venture off the beaten path to discover stunning regions most tourists never see.', created_at: new Date().toISOString() },
  { id:'p6', title:'Quantum Computing Achieves New Milestone', category:'Science', author:'Dr. Sarah Kim', cover_image:'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80', excerpt:'Researchers demonstrate error-corrected quantum computation at unprecedented scale.', created_at: new Date().toISOString() },
]

// ── Article card components ───────────────────────────────────────────────────
function HeroCard({ article }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="nexus-hero-card group block relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0">
        {article.cover_image
          ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
          : <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900"/>
        }
        <div className="absolute inset-0 nexus-hero-overlay"/>
      </div>
      <div className="relative h-full flex flex-col justify-end p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="nexus-cat-badge" style={{ background: catColor(article.category) }}>
            {catIcon(article.category)} {article.category}
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black text-white leading-tight mb-3 group-hover:text-blue-200 transition-colors">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="text-sm text-white/75 line-clamp-2 mb-4 max-w-2xl">
            {article.excerpt.replace(/<[^>]*>/g,'')}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-white/60">
          {article.author && <span className="font-semibold text-white/80">✍️ {article.author}</span>}
          <span>·</span>
          <span>{timeAgo(article.created_at)}</span>
          <div className="ml-auto"><LikeButton articleId={article.id}/></div>
        </div>
      </div>
    </Link>
  )
}

function SecondaryCard({ article }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="nexus-secondary-card group flex gap-3">
      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
        {article.cover_image
          ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
          : <div className="w-full h-full nexus-img-placeholder"/>
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catColor(article.category) }}>
          {article.category}
        </span>
        <h4 className="text-xs font-semibold leading-snug line-clamp-2 mt-0.5 text-white/90 group-hover:text-blue-300 transition-colors">
          {article.title}
        </h4>
        <span className="text-[10px] text-white/40 mt-1 block">{timeAgo(article.created_at)}</span>
      </div>
    </Link>
  )
}

function GridCard({ article, variant = 'default' }) {
  if (!article) return null
  const isLarge = variant === 'large'
  return (
    <Link to={`/article/${article.id}`} className={`nexus-grid-card group block`}>
      <div className={`overflow-hidden relative ${isLarge ? 'h-48' : 'h-36'}`}>
        {article.cover_image
          ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
          : <div className="w-full h-full nexus-img-placeholder flex items-center justify-center text-3xl">📰</div>
        }
        <span className="absolute top-2 left-2 nexus-cat-badge" style={{ background: catColor(article.category) }}>
          {article.category}
        </span>
        <div className="absolute top-2 right-2"><LikeButton articleId={article.id}/></div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className={`font-semibold leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors ${isLarge ? 'text-sm' : 'text-xs'}`}
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {article.title}
        </h3>
        {isLarge && article.excerpt && (
          <p className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}>
            {article.excerpt.replace(/<[^>]*>/g,'')}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 text-xs">
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
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
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

function CategorySection({ cat, articles }) {
  const catArts = articles.filter(a => a.category === cat.name)
  if (!catArts.length) return null
  return (
    <div className="nexus-category-section">
      <div className="nexus-section-header">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: cat.color }}/>
          <h2 className="nexus-section-title">{cat.icon} {cat.name}</h2>
        </div>
        <Link to={`/category/${cat.name.toLowerCase()}`} className="nexus-view-all">View All →</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-2">
        {catArts.slice(0, 3).map(a => <GridCard key={a.id} article={a}/>)}
      </div>
    </div>
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

  const hero      = articles[0]
  const secondary = articles.slice(1, 5)
  const trending  = articles.slice(0, 8)
  const latest    = articles.slice(0, 6)

  return (
    <div className="nexus-home">
      <div className="nexus-container py-6">

        {/* ── HERO SECTION ─────────────────────────────────────────────── */}
        <section className="mb-8">

          {/* Left: big hero */}
          <div className="grid grid-rows-[minmax(380px,480px)_auto] gap-3">
            <HeroCard article={hero}/>
            <div className="grid grid-cols-2 gap-3">
              {secondary.slice(0, 2).map(a => (
                <Link key={a.id} to={`/article/${a.id}`} className="nexus-mini-hero group relative overflow-hidden rounded-xl">
                  <div className="absolute inset-0">
                    {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                  </div>
                  <div className="relative p-4 h-full flex flex-col justify-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: catColor(a.category) }}>{a.category}</span>
                    <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">{a.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </section>

        {/* ── LATEST + RIGHT SIDEBAR ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-8">

          {/* Main content */}
          <div>
            {/* Latest articles grid */}
            <div className="nexus-section-header mb-5">
              <h2 className="nexus-section-title">
                <span className="nexus-section-accent"/>
                Latest Articles
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              {latest.map((a, i) => <GridCard key={a.id} article={a} variant={i === 0 ? 'large' : 'default'}/>)}
            </div>

            {/* Category sections */}
            {cats.map(cat => (
              <CategorySection key={cat.name} cat={cat} articles={articles}/>
            ))}
          </div>

          <RightSidebar variant="home"/>
        </div>

      </div>
    </div>
  )
}