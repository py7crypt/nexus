// src/components/PublicLayout.jsx
import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES, catClass } from '../utils'

const TICKER = 'AI surpasses human performance on reasoning benchmarks • Global renewable energy hits record high • SpaceX announces Mars mission timeline • New study links gut microbiome to mental health • Tech giants invest $50B in quantum computing •'

export default function PublicLayout() {
  const { dark, toggleDark } = useApp()
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [searchOpen, setSearch]   = useState(false)
  const [query, setQuery]         = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) { navigate(`/?q=${encodeURIComponent(query.trim())}`); setSearch(false) }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─ Sticky Nav ─ */}
      <header className={`sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-shadow ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="max-w-[1280px] mx-auto px-5 h-16 flex items-center gap-5">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-black tracking-tight flex-shrink-0">
            NEX<span className="text-blue-600">US</span>
          </Link>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
            <NavLink to="/" end className={({isActive})=>`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${isActive?'text-blue-600 bg-blue-50 dark:bg-blue-950':'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              Home
            </NavLink>
            {CATEGORIES.map(cat => (
              <NavLink key={cat} to={`/category/${cat.toLowerCase()}`}
                className={({isActive})=>`text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${isActive?'text-blue-600 bg-blue-50 dark:bg-blue-950':'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {cat}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={()=>setSearch(s=>!s)}
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              🔍
            </button>
            <button onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {dark ? '☀️' : '🌙'}
            </button>
            <Link to="/admin" className="hidden sm:inline-flex btn-primary text-xs py-1.5 px-3">
              Admin
            </Link>
            <button className="lg:hidden p-2 rounded-lg text-slate-500" onClick={()=>setMenuOpen(o=>!o)}>
              ☰
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-col gap-1">
            {['Home', ...CATEGORIES].map(c => (
              <Link key={c} to={c==='Home'?'/':`/category/${c.toLowerCase()}`}
                onClick={()=>setMenuOpen(false)}
                className="py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                {c}
              </Link>
            ))}
          </div>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-5 py-3">
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
              <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
                className="form-input" placeholder="Search articles, topics..." />
              <button type="button" onClick={()=>setSearch(false)}
                className="px-3 text-slate-400 hover:text-slate-600">✕</button>
            </form>
          </div>
        )}
      </header>

      {/* Breaking News Ticker */}
      <div className="bg-blue-600 text-white flex items-center h-9 overflow-hidden">
        <span className="bg-black/20 px-4 h-full flex items-center text-xs font-bold tracking-widest flex-shrink-0">
          BREAKING
        </span>
        <div className="overflow-hidden flex-1">
          <span className="ticker-scroll inline-block whitespace-nowrap text-xs font-medium py-2">
            {TICKER} {TICKER}
          </span>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 mt-16">
        <div className="max-w-[1280px] mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="font-display text-2xl font-black mb-3">NEX<span className="text-blue-600">US</span></div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              NEXUS is a modern digital media platform covering technology, science, business, health, and culture.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">Categories</h4>
            <ul className="space-y-2">
              {CATEGORIES.map(c=>(
                <li key={c}><Link to={`/category/${c.toLowerCase()}`} className="text-sm text-slate-500 hover:text-blue-600 transition-colors">{c}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              {['About NEXUS','Editorial Policy','Write for Us','Advertise','Careers','Contact'].map(i=>(
                <li key={i}><a href="#" className="hover:text-blue-600 transition-colors">{i}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">Follow Us</h4>
            <div className="flex gap-2 flex-wrap">
              {['𝕏','f','◎','in','▶'].map((icon,i)=>(
                <a key={i} href="#" className="w-9 h-9 flex items-center justify-content-center justify-center border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-sm font-bold">
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 py-5">
          <div className="max-w-[1280px] mx-auto px-5 flex justify-between items-center text-xs text-slate-400">
            <span>© 2025 NEXUS Media. All rights reserved.</span>
            <div className="flex gap-4">
              {['Privacy','Terms','Cookies'].map(l=><a key={l} href="#" className="hover:text-blue-600">{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
