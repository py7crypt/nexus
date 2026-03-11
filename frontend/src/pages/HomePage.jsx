// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchArticles } from '../api'
import { HeroArticle, ArticleCard, Spinner } from '../components/shared'
import { CATEGORIES, catColor, getCategories } from '../utils'

const PLACEHOLDER = [
  { id:'p1', title:'The Dawn of Artificial General Intelligence', category:'Technology', author:'Elena Marchetti', cover_image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80', excerpt:'Researchers at leading AI labs report breakthroughs that could reshape civilization.', created_at: new Date().toISOString() },
  { id:'p2', title:'Scientists Discover Exoplanet with Oxygen Atmosphere', category:'Science', author:'Dr. Wei Chen', cover_image:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80', excerpt:'The James Webb telescope reveals stunning data from a rocky world 40 light-years away.', created_at: new Date().toISOString() },
  { id:'p3', title:'Markets Hit All-Time Highs as Fed Signals Rate Cuts', category:'Business', author:'James Wu', cover_image:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80', excerpt:'Investors react to strong employment data alongside cooling inflation.', created_at: new Date().toISOString() },
  { id:'p4', title:'New Longevity Drug Shows Remarkable Results', category:'Health', author:'Marco Bianchi', cover_image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', excerpt:'A Harvard-backed biotech reports a 30% reduction in cellular aging markers.', created_at: new Date().toISOString() },
  { id:'p5', title:"Japan's Hidden Prefectures: Beyond Tokyo and Kyoto", category:'Travel', author:'Yuki Tanaka', cover_image:'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80', excerpt:'Venture off the beaten path to discover stunning regions most tourists never see.', created_at: new Date().toISOString() },
]

// MSN-style weather strip for the top of the homepage
const WX_CODES = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',99:'⛈️'}
const WX_DESC = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',51:'Drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Rain showers',82:'Violent showers',95:'Thunderstorm',99:'Thunderstorm'}

async function _getWxByCoords(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,windspeed_10m,relativehumidity_2m,apparent_temperature` +
    `&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
  const d = await fetch(url).then(r => r.json())
  if (!d.current) throw new Error('no data')
  return d.current
}

async function _getCityName(lat, lon) {
  try {
    const d = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    ).then(r => r.json())
    return d.address?.city || d.address?.town || d.address?.village || d.address?.county || ''
  } catch { return '' }
}

function WeatherStrip() {
  const [wx,      setWx]      = useState(null)
  const [city,    setCity]    = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let lat, lon, cityName = ''

        // Try geolocation first with 6s timeout
        try {
          const pos = await new Promise((res, rej) => {
            const t = setTimeout(() => rej(new Error('timeout')), 6000)
            navigator.geolocation.getCurrentPosition(
              p  => { clearTimeout(t); res(p) },
              () => { clearTimeout(t); rej(new Error('denied')) },
              { timeout: 6000, maximumAge: 300000 }
            )
          })
          lat = pos.coords.latitude
          lon = pos.coords.longitude
          cityName = await _getCityName(lat, lon)
        } catch {
          // Fall back to IP — try multiple CORS-friendly APIs
          const ip = await (async () => {
            const apis = [
              async () => { const d = await fetch('https://ipapi.co/json/').then(r=>r.json()); if (!d.latitude) throw 0; return { lat:d.latitude, lon:d.longitude, city:d.city||'' } },
              async () => { const d = await fetch('https://freeipapi.com/api/json').then(r=>r.json()); if (!d.latitude) throw 0; return { lat:d.latitude, lon:d.longitude, city:d.cityName||'' } },
              async () => { const d = await fetch('https://ip.seeip.org/geoip').then(r=>r.json()); if (!d.latitude) throw 0; return { lat:d.latitude, lon:d.longitude, city:d.city||'' } },
            ]
            for (const a of apis) { try { return await a() } catch { /* next */ } }
            throw new Error('all failed')
          })()
          lat = ip.lat; lon = ip.lon; cityName = ip.city
        }

        const weather = await _getWxByCoords(lat, lon)
        if (!cancelled) { setWx(weather); setCity(cityName); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading || !wx) return null

  const code    = wx.weather_code ?? wx.weathercode ?? 0
  const icon    = WX_CODES[code] || '🌡️'
  const desc    = WX_DESC[code]  || ''
  const temp    = Math.round(wx.temperature_2m)
  const feels   = Math.round(wx.apparent_temperature)
  const wind    = Math.round(wx.windspeed_10m)
  const humid   = wx.relativehumidity_2m
  const now     = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl px-6 py-4 mb-8 flex flex-wrap items-center gap-6 shadow-lg">
      {/* Main temp */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-5xl leading-none">{icon}</span>
        <div>
          <div className="text-4xl font-black leading-none">{temp}°</div>
          <div className="text-blue-100 text-sm font-medium mt-0.5">{desc}</div>
        </div>
      </div>

      {/* Location + time */}
      <div className="flex-1 min-w-0">
        {city && <div className="text-xl font-bold truncate">📍 {city}</div>}
        <div className="text-blue-200 text-sm">{dateStr} · {timeStr}</div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm flex-wrap">
        <div className="text-center">
          <div className="text-blue-200 text-xs">Feels like</div>
          <div className="font-bold">{feels}°C</div>
        </div>
        <div className="text-center">
          <div className="text-blue-200 text-xs">Wind</div>
          <div className="font-bold">💨 {wind} km/h</div>
        </div>
        <div className="text-center">
          <div className="text-blue-200 text-xs">Humidity</div>
          <div className="font-bold">💧 {humid}%</div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [cats, setCats] = useState(getCategories())

  // Re-read categories whenever storage changes (e.g. from Categories admin page)
  useEffect(() => {
    const sync = () => setCats(getCategories())
    window.addEventListener('storage', sync)
    // Also poll every 2s in case same-tab changes
    const timer = setInterval(sync, 2000)
    return () => { window.removeEventListener('storage', sync); clearInterval(timer) }
  }, [])

  const { data, isLoading } = useQuery({ queryKey: ['articles', 'home'], queryFn: () => fetchArticles({ limit: 20 }) })
  const articles = data?.articles?.length ? data.articles : PLACEHOLDER

  const hero      = articles[0]
  const secondary = articles.slice(1, 5)
  const latest    = articles.slice(0, 6)

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      {/* ── Weather Strip (MSN-style) ── */}
      <WeatherStrip />

      {/* ── Hero Grid ── */}
      <section className="mb-10">
        {isLoading
          ? <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>
          : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-4">
              <HeroArticle article={hero} />
              <div className="flex flex-col gap-3">
                {secondary.map(a => (
                  <Link key={a.id} to={`/article/${a.id}`}
                    className="flex gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                    <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      {a.cover_image
                        ? <img src={a.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                        : <div className="w-full h-full bg-slate-200 dark:bg-slate-700"/>
                      }
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block font-bold uppercase tracking-wide rounded-full text-white text-xs px-2 py-0.5 mb-1"
                        style={{ background: catColor(a.category) }}>{a.category}</span>
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        }
      </section>

      {/* ── Trending ── */}
      <section className="bg-slate-50 dark:bg-slate-800/50 -mx-5 px-5 py-6 mb-10 border-y border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">🔥 Trending Now</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {articles.slice(0, 6).map((a, i) => (
            <Link key={a.id} to={`/article/${a.id}`}
              className="min-w-[200px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="relative h-28 overflow-hidden">
                {a.cover_image
                  ? <img src={a.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  : <div className="w-full h-full bg-slate-200 dark:bg-slate-700"/>
                }
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">0{i+1}</span>
              </div>
              <div className="p-3">
                <span className="inline-block font-bold uppercase tracking-wide rounded-full text-white text-xs px-2 py-0.5 mb-1.5"
                  style={{ background: catColor(a.category) }}>{a.category}</span>
                <h4 className="text-xs font-semibold line-clamp-3 leading-snug">{a.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Latest + Sidebar ── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <h2 className="font-display text-xl font-bold mb-5">Latest Articles</h2>
          {isLoading
            ? <div className="flex justify-center py-10"><Spinner size="lg"/></div>
            : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{latest.map(a => <ArticleCard key={a.id} article={a}/>)}</div>
          }

          {/* Dynamic Category Sections */}
          {cats.slice(0, 3).map(cat => {
            const catArts = articles.filter(a => a.category === cat.name)
            if (!catArts.length) return null
            return (
              <div key={cat.name} className="mt-10">
                <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-t-xl text-white"
                  style={{ background: cat.color }}>
                  <h2 className="font-display text-lg font-bold">{cat.icon} {cat.name}</h2>
                  <Link to={`/category/${cat.name.toLowerCase()}`} className="text-white/80 text-sm hover:text-white">View All →</Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 border border-t-0 rounded-b-xl p-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  {catArts.slice(0, 2).map(a => <ArticleCard key={a.id} article={a}/>)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">🔥 Popular</h3>
            {articles.slice(0, 5).map((a, i) => (
              <Link key={a.id} to={`/article/${a.id}`}
                className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:opacity-75 transition-opacity">
                <span className="font-display text-2xl font-black text-slate-200 dark:text-slate-600 leading-none w-7 flex-shrink-0">0{i+1}</span>
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold leading-snug line-clamp-2">{a.title}</h5>
                  <p className="text-xs text-slate-400 mt-1">{a.category}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Dynamic Categories list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">📂 Categories</h3>
            {cats.map(cat => (
              <Link key={cat.name} to={`/category/${cat.name.toLowerCase()}`}
                className="flex items-center gap-2.5 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:text-blue-600 transition-colors text-sm">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }}/>
                {cat.icon} {cat.name}
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {articles.filter(a => a.category === cat.name).length}
                </span>
              </Link>
            ))}
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="text-2xl mb-2">✉️</div>
            <h3 className="font-bold mb-1">Stay Informed</h3>
            <p className="text-xs text-white/75 mb-3">Get NEXUS top stories every morning.</p>
            <input type="email" placeholder="Your email" className="w-full px-3 py-2 rounded-lg text-sm bg-white/15 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/20 mb-2"/>
            <button className="w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">Subscribe Free</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
