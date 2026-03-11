// src/components/shared.jsx
import { catColor, catIcon, formatDate, getCategories } from '../utils'
import { Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'

// ── Category Tag ─────────────────────────────────────────────
export function CatTag({ category, size = 'sm' }) {
  const p = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-block font-bold uppercase tracking-wide rounded-full text-white ${p}`}
      style={{ background: catColor(category) }}>
      {catIcon(category)} {category}
    </span>
  )
}

// ── Article Card ─────────────────────────────────────────────
// ── Like Button ──────────────────────────────────────────────
export function LikeButton({ articleId, className = '' }) {
  const storageKey = `liked_${articleId}`
  const [likes,   setLikes]  = useState(0)
  const [liked,   setLiked]  = useState(() => localStorage.getItem(storageKey) === '1')
  const [loading, setLoading]= useState(false)

  useEffect(() => {
    if (!articleId) return
    fetch(`/api/likes?id=${articleId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLikes(d.likes) })
      .catch(() => {})
  }, [articleId])

  const handleClick = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading || liked) return   // already liked — no unlike
    setLoading(true)
    setLiked(true)
    setLikes(n => n + 1)
    localStorage.setItem(storageKey, '1')
    try {
      const res  = await fetch('/api/likes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: articleId }),
      })
      const data = await res.json()
      if (data.success) setLikes(data.likes)
    } catch {
      // revert on network error
      setLiked(false)
      setLikes(n => n - 1)
      localStorage.removeItem(storageKey)
    } finally {
      setLoading(false)
    }
  }, [liked, loading, articleId, storageKey])

  return (
    <button
      onClick={handleClick}
      title={liked ? 'Liked!' : 'Like'}
      disabled={loading || liked}
      className={`flex items-center gap-1 px-2 py-1 rounded-full border border-white text-xs font-bold transition-all
        bg-blue-600 text-white hover:bg-blue-700 hover:scale-105
        ${liked   ? 'opacity-90 cursor-default scale-105' : ''}
        ${loading ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      {likes > 0 && <span>{likes}</span>}
    </button>
  )
}


export function ArticleCard({ article, size = 'md' }) {
  if (!article) return null
  const isLg = size === 'lg'
  return (
    <Link to={`/article/${article.id}`} className="article-card group block">
      <div className={`overflow-hidden ${isLg ? 'h-56' : 'h-44'} relative`}>
        {article.cover_image
          ? <img src={article.cover_image} alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
          : <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-4xl">📰</div>
        }
        <CatTag category={article.category} />
        {/* overlay badge */}
        <span className="absolute top-3 left-3 inline-block font-bold uppercase tracking-wide rounded-full text-white text-xs px-2.5 py-0.5"
          style={{ background: catColor(article.category) }}>
          {article.category}
        </span>
        {/* like button top-right */}
        <div className="absolute top-3 right-3">
          <LikeButton articleId={article.id} />
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-semibold leading-snug mb-2 line-clamp-3 group-hover:text-blue-600 transition-colors ${isLg ? 'text-base' : 'text-sm'}`}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {article.excerpt.replace(/<[^>]*>/g, '')}
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

// ── Hero Article ─────────────────────────────────────────────
export function HeroArticle({ article }) {
  if (!article) return null
  return (
    <Link to={`/article/${article.id}`} className="relative rounded-2xl overflow-hidden block group h-[480px] card-zoom shadow-lg">
      {article.cover_image
        ? <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{ background: catColor(article.category) }}/>
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"/>
      <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
        <span className="inline-block font-bold uppercase tracking-wide rounded-full text-white text-xs px-2.5 py-0.5 mb-3"
          style={{ background: catColor(article.category) }}>
          {article.category}
        </span>
        <h2 className="font-display text-2xl lg:text-3xl font-black leading-tight mb-3 group-hover:text-blue-300 transition-colors line-clamp-3">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-sm text-white/75 line-clamp-2 mb-4">{article.excerpt.replace(/<[^>]*>/g, '')}</p>
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
  return <div className={`${s} border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin`} style={{ borderWidth: 3 }}/>
}

// ── Toast ─────────────────────────────────────────────────────
const toastListeners = []
export function toast(msg, type = 'info') {
  toastListeners.forEach(fn => fn({ msg, type, id: Date.now() + Math.random() }))
}
export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const fn = (t) => {
      setToasts(p => [...p, t])
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500)
    }
    toastListeners.push(fn)
    return () => { const i = toastListeners.indexOf(fn); if (i > -1) toastListeners.splice(i, 1) }
  }, [])
  const colors = { success: 'border-l-green-500', error: 'border-l-red-500', info: 'border-l-blue-500' }
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999]">
      {toasts.map(t => (
        <div key={t.id} className={`bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-xl border-l-4 ${colors[t.type] || colors.info} fade-in max-w-xs`}>
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
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  }
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${map[status] || map.draft}`}>{status}</span>
}

// ── SEO Score ─────────────────────────────────────────────────
export function SEOScore({ title, content, seoTitle, seoDesc, tags, coverImage }) {
  const checks = [
    { label: 'Title 10+ chars',    pass: (title || '').length >= 10 },
    { label: 'Content 300+ words', pass: content?.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length >= 300 },
    { label: 'SEO title set',      pass: (seoTitle || '').length > 0 },
    { label: 'Meta description',   pass: (seoDesc || '').length >= 50 },
    { label: 'Cover image',        pass: !!(coverImage) },
    { label: 'Tags added',         pass: (tags || []).length > 0 },
  ]
  const score = Math.round(checks.filter(c => c.pass).length / checks.length * 100)
  const color = score >= 80 ? 'text-green-600 bg-green-100' : score >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'
  return (
    <div>
      <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>{score}</div>
        <div>
          <div className="text-sm font-semibold">{score >= 80 ? '🎯 Great!' : score >= 50 ? '⚡ Needs work' : '⚠️ Poor SEO'}</div>
          <div className="text-xs text-slate-400">{checks.filter(c => c.pass).length}/{checks.length} checks</div>
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

// ── CatBadge (alias) ─────────────────────────────────────────
export function CatBadge({ category, size = 'sm' }) {
  return <CatTag category={category} size={size} />
}

// ── Weather Card ──────────────────────────────────────────────
const WX_CODES = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️',
}
const WX_DESC = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
  61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',
  80:'Showers',81:'Rain showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm',
}

async function _getCoordsByIP() {
  // ipwho.is — free, CORS-enabled, no API key
  const d = await fetch('https://ipwho.is/').then(r => r.json())
  if (!d.success) throw new Error('IP lookup failed')
  return { lat: d.latitude, lon: d.longitude, city: d.city || d.region || '' }
}

async function _fetchWeather(lat, lon) {
  // Open-Meteo — free, no key. Field is "weather_code" (not "weathercode")
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,windspeed_10m,relativehumidity_2m` +
    `&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
  const d = await fetch(url).then(r => r.json())
  if (!d.current) throw new Error('No weather data')
  return d.current
}

async function _getCityFromCoords(lat, lon) {
  try {
    const d = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    ).then(r => r.json())
    return d.address?.city || d.address?.town || d.address?.village || d.address?.county || ''
  } catch { return '' }
}

export function WeatherCard({ compact = false }) {
  const [wx,      setWx]   = useState(null)
  const [city,    setCity] = useState('')
  const [loading, setLoad] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        let lat, lon, cityName = ''

        // Try browser geolocation with a 6s timeout
        try {
          const pos = await new Promise((res, rej) => {
            const t = setTimeout(() => rej(new Error('timeout')), 6000)
            navigator.geolocation.getCurrentPosition(
              p  => { clearTimeout(t); res(p) },
              () => { clearTimeout(t); rej(new Error('denied')) },
              { timeout: 6000, maximumAge: 300000 }
            )
          })
          lat      = pos.coords.latitude
          lon      = pos.coords.longitude
          cityName = await _getCityFromCoords(lat, lon)
        } catch {
          // Geolocation failed — fall back to IP
          const ip = await _getCoordsByIP()
          lat = ip.lat; lon = ip.lon; cityName = ip.city
        }

        const weather = await _fetchWeather(lat, lon)
        if (!cancelled) { setWx(weather); setCity(cityName); setLoad(false) }
      } catch {
        if (!cancelled) setLoad(false)
      }
    }

    if (navigator.geolocation || true) loadWeather()
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className={compact ? 'flex items-center gap-2' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5'}>
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
      {!compact && <span className="text-sm text-slate-400 ml-2 mt-0.5 inline-block">Loading weather...</span>}
    </div>
  )
  if (!wx) return null

  const code = wx.weather_code ?? wx.weathercode ?? 0
  const icon = WX_CODES[code] || '🌡️'
  const desc = WX_DESC[code]  || ''
  const temp  = Math.round(wx.temperature_2m)
  const wind  = Math.round(wx.windspeed_10m)
  const humid = wx.relativehumidity_2m

  if (compact) return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-2xl">{icon}</span>
      <div>
        <span className="font-bold text-slate-800 dark:text-white">{temp}°C</span>
        {city && <span className="text-slate-500 dark:text-slate-400 ml-1">{city}</span>}
      </div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 overflow-hidden relative">
      <div className="absolute top-0 right-0 text-8xl opacity-10 pointer-events-none leading-none mt-1 mr-1">{icon}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">
        🌤️ Weather {city && <span className="normal-case font-normal text-slate-400 ml-1">— {city}</span>}
      </h3>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{icon}</span>
        <div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">{temp}°C</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{desc}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5">
          <div className="text-slate-400 mb-0.5">Wind</div>
          <div className="font-bold text-slate-700 dark:text-slate-200">💨 {wind} km/h</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5">
          <div className="text-slate-400 mb-0.5">Humidity</div>
          <div className="font-bold text-slate-700 dark:text-slate-200">💧 {humid}%</div>
        </div>
      </div>
    </div>
  )
}
