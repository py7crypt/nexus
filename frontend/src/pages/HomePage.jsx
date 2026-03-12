// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchArticles } from '../api'
import { LikeButton } from '../components/shared'
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

// ── Weather ───────────────────────────────────────────────────────────────────
const WX_CODES = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',99:'⛈️'}
const WX_DESC = {0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',51:'Drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Rain showers',82:'Violent showers',95:'Thunderstorm',99:'Thunderstorm'}

async function getWeather() {
  const pos = await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 6000)
    navigator.geolocation.getCurrentPosition(p => { clearTimeout(t); res(p) }, () => { clearTimeout(t); rej() }, { timeout: 6000, maximumAge: 300000 })
  })
  const { latitude: lat, longitude: lon } = pos.coords
  const [wx, geo] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,windspeed_10m,relativehumidity_2m,apparent_temperature&timezone=auto`).then(r => r.json()),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } }).then(r => r.json()),
  ])
  return { wx: wx.current, city: geo.address?.city || geo.address?.town || geo.address?.village || '' }
}

async function getWeatherByIP() {
  const apis = [
    () => fetch('https://ipapi.co/json/').then(r=>r.json()).then(d => ({ lat:d.latitude, lon:d.longitude, city:d.city||'' })),
    () => fetch('https://freeipapi.com/api/json').then(r=>r.json()).then(d => ({ lat:d.latitude, lon:d.longitude, city:d.cityName||'' })),
  ]
  for (const a of apis) { try { const ip = await a(); const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ip.lat}&longitude=${ip.lon}&current=temperature_2m,weather_code,windspeed_10m,relativehumidity_2m,apparent_temperature&timezone=auto`).then(r=>r.json()); return { wx: wx.current, city: ip.city } } catch {} }
  throw new Error('failed')
}

function WeatherWidget() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await getWeather().catch(() => getWeatherByIP())
        if (!cancelled) setData(result)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  if (!data) return null
  const { wx, city } = data
  const code  = wx.weather_code ?? wx.weathercode ?? 0
  const temp  = Math.round(wx.temperature_2m)
  const feels = Math.round(wx.apparent_temperature)
  const wind  = Math.round(wx.windspeed_10m)
  const humid = wx.relativehumidity_2m
  const now   = new Date()

  return (
    <div className="nexus-weather-widget">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{WX_CODES[code] || '🌡️'}</span>
        <div>
          <div className="text-2xl font-black text-white">{temp}°C</div>
          <div className="text-xs text-blue-200">{WX_DESC[code] || ''}</div>
        </div>
      </div>
      {city && <div className="text-sm font-semibold text-white mb-1 truncate">📍 {city}</div>}
      <div className="text-xs text-blue-200 mb-3">{now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div className="grid grid-cols-3 gap-1 text-center border-t border-white/10 pt-3">
        {[['Feels', `${feels}°`], ['Wind', `${wind}km/h`], ['Humid', `${humid}%`]].map(([l,v]) => (
          <div key={l}>
            <div className="text-[10px] text-blue-300">{l}</div>
            <div className="text-xs font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
    <Link to={`/article/${article.id}`} className={`nexus-grid-card group block ${isLarge ? 'nexus-grid-card-large' : ''}`}>
      <div className={`overflow-hidden rounded-t-xl relative ${isLarge ? 'h-52' : 'h-40'}`}>
        {article.cover_image
          ? <img src={article.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
          : <div className="w-full h-full nexus-img-placeholder flex items-center justify-center text-3xl">📰</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
        <span className="absolute top-3 left-3 nexus-cat-badge" style={{ background: catColor(article.category) }}>
          {article.category}
        </span>
        <div className="absolute top-3 right-3"><LikeButton articleId={article.id}/></div>
      </div>
      <div className="p-4">
        <h3 className={`font-bold leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors ${isLarge ? 'text-base' : 'text-sm'}`}>
          {article.title}
        </h3>
        {isLarge && article.excerpt && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
            {article.excerpt.replace(/<[^>]*>/g,'')}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span className="font-medium truncate text-slate-400">{article.author}</span>
          <span className="flex-shrink-0 ml-2">{timeAgo(article.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function TrendingItem({ article, rank }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="nexus-trending-item group flex items-start gap-3">
      <span className="nexus-trending-rank">{String(rank).padStart(2,'0')}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catColor(article.category) }}>
          {article.category}
        </span>
        <h5 className="text-xs font-semibold line-clamp-2 leading-snug mt-0.5 text-white/80 group-hover:text-blue-300 transition-colors">
          {article.title}
        </h5>
        <span className="text-[10px] text-slate-500 mt-0.5 block">{timeAgo(article.created_at)}</span>
      </div>
      {article.cover_image && (
        <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
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
          <span className="w-3 h-3 rounded-sm" style={{ background: cat.color }}/>
          <h2 className="text-base font-black text-white">{cat.icon} {cat.name}</h2>
        </div>
        <Link to={`/category/${cat.name.toLowerCase()}`} className="nexus-view-all">View All →</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {catArts.slice(0, 3).map((a, i) => (
          <GridCard key={a.id} article={a} variant={i === 0 ? 'default' : 'default'}/>
        ))}
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
        <section className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-4 mb-8">

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

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Weather */}
            <WeatherWidget/>

            {/* Secondary articles feed */}
            <div className="nexus-sidebar-card flex-1">
              <div className="nexus-sidebar-header">Latest Stories</div>
              <div className="divide-y divide-white/5">
                {secondary.map(a => (
                  <div key={a.id} className="p-3"><SecondaryCard article={a}/></div>
                ))}
              </div>
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

          {/* Right sidebar */}
          <aside className="space-y-5">

            {/* Weather widget */}
            <div className="nexus-sidebar-card overflow-hidden">
              <div className="nexus-sidebar-header">
                <span className="nexus-section-accent mr-2"/>
                Weather
              </div>
              <iframe
                src="/widgets/weather.html"
                title="Weather"
                className="w-full border-0"
                style={{ height: '200px' }}
                loading="lazy"
              />
            </div>

            {/* Trending posts */}
            <div className="nexus-sidebar-card">
              <div className="nexus-sidebar-header">
                <span className="nexus-section-accent mr-2"/>
                Trending Posts
              </div>
              <div className="p-3 space-y-0 divide-y" style={{ borderColor: 'var(--border)' }}>
                {trending.slice(0, 6).map((a, i) => (
                  <div key={a.id}><TrendingItem article={a} rank={i+1}/></div>
                ))}
              </div>
            </div>

            {/* Sudoku game */}
            <div className="nexus-sidebar-card overflow-hidden">
              <div className="nexus-sidebar-header">
                <span className="nexus-section-accent mr-2"/>
                Sudoku
              </div>
              <iframe
                src="/widgets/sudoku.html"
                title="Sudoku"
                className="w-full border-0"
                style={{ height: '340px' }}
                loading="lazy"
              />
            </div>

            {/* Categories */}
            <div className="nexus-sidebar-card">
              <div className="nexus-sidebar-header">
                <span className="nexus-section-accent mr-2"/>
                Categories
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {cats.map(cat => (
                  <Link key={cat.name} to={`/category/${cat.name.toLowerCase()}`}
                    className="nexus-cat-pill" style={{ '--cat-color': cat.color }}>
                    {cat.icon} {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="nexus-sidebar-card">
              <div className="nexus-sidebar-header">
                <span className="nexus-section-accent mr-2"/>
                Tags
              </div>
              <div className="p-4 flex flex-wrap gap-1.5">
                {['Technology','AI','Science','Health','Climate','Finance','Space','Politics','Travel','Culture','Business','Innovation'].map(tag => (
                  <span key={tag} className="nexus-tag">{tag}</span>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="nexus-newsletter-card">
              <div className="text-2xl mb-2">✉️</div>
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="font-black text-white text-base mb-1">Stay Informed</h3>
              <p className="text-xs mb-4" style={{ color: 'rgba(147,197,253,0.75)' }}>Get NEXUS top stories every morning. No spam.</p>
              <input type="email" placeholder="Enter your email"
                className="w-full rounded-lg px-3 py-2 text-sm text-white mb-2"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}/>
              <button className="w-full py-2.5 bg-white rounded-lg text-sm font-bold transition-colors hover:bg-blue-50"
                style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
                Subscribe Free
              </button>
            </div>

          </aside>
        </div>

      </div>
    </div>
  )
}