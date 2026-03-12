// src/components/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

const NAV = [
  { to: '/admin',            label: 'Dashboard',       icon: '📊', end: true },
  { to: '/admin/ai',         label: 'AI Generator',    icon: '🤖', badge: 'AI' },
  { to: '/admin/categories', label: 'Categories',      icon: '🏷️' },
  { to: '/admin/social',     label: 'Social Media',    icon: '📱' },
  { to: '/admin/scrape',     label: 'Scrape Settings', icon: '📡' },
  { to: '/admin/settings',   label: 'Settings',        icon: '⚙️' },
]

export default function AdminLayout() {
  const { dark, toggleDark, logout } = useApp()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebar] = useState(true)

  const handleLogout = () => { logout(); navigate('/admin/login') }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-base)', fontFamily:'var(--font-body)' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? '220px' : '0',
        flexShrink: 0,
        background: '#060d1a',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ height:'56px', display:'flex', alignItems:'center', padding:'0 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, gap:'0.6rem' }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem', fontWeight:900, color:'#f1f5f9', fontStyle:'italic', whiteSpace:'nowrap' }}>
            NEX<span style={{ color:'var(--accent)', fontStyle:'normal' }}>US</span>
          </span>
          <span style={{ fontSize:'0.58rem', fontWeight:800, background:'var(--accent)', color:'white', padding:'0.15rem 0.5rem', borderRadius:'20px', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'0.5rem 0', overflowY:'auto' }}>
          <div style={{ fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'#334155', padding:'0.6rem 1.25rem 0.4rem' }}>
            Content
          </div>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>{item.icon}</span>
              <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
              {item.badge && (
                <span style={{ marginLeft:'auto', fontSize:'0.58rem', fontWeight:800, background:'#7c3aed', color:'white', padding:'0.12rem 0.45rem', borderRadius:'20px' }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          <div style={{ fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'#334155', padding:'0.8rem 1.25rem 0.4rem', marginTop:'0.25rem' }}>
            Site
          </div>
          <a href="/" target="_blank" className="sidebar-link">
            <span style={{ fontSize:'1rem' }}>🌐</span>
            <span style={{ whiteSpace:'nowrap' }}>View Site</span>
          </a>
        </nav>

        {/* Footer */}
        <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
            <div style={{ width:'7px', height:'7px', background:'#22c55e', borderRadius:'50%' }}/>
            <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:500, whiteSpace:'nowrap' }}>Admin</span>
          </div>
          <button onClick={handleLogout}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#64748b', display:'flex', alignItems:'center', gap:'0.4rem', transition:'color 0.15s', whiteSpace:'nowrap' }}
            onMouseOver={e => e.currentTarget.style.color='#f87171'}
            onMouseOut={e => e.currentTarget.style.color='#64748b'}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Topbar */}
        <div style={{
          height:'56px', flexShrink:0,
          background:'var(--bg-surface)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 1.25rem', gap:'0.75rem',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <button onClick={() => setSidebar(o => !o)}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer', color:'var(--text-secondary)', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.background='var(--accent-glow)'; e.currentTarget.style.borderColor='var(--accent)' }}
              onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='var(--border)' }}>
              ☰
            </button>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:700, color:'var(--text-primary)', fontStyle:'italic' }}>
              NEX<span style={{ color:'var(--accent)', fontStyle:'normal' }}>US</span>
              <span style={{ fontFamily:'var(--font-body)', fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginLeft:'0.5rem', fontStyle:'normal' }}>CMS</span>
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <button onClick={toggleDark}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer', color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', fontSize:'0.95rem' }}
              onMouseOver={e => { e.currentTarget.style.background='var(--accent-glow)'; e.currentTarget.style.borderColor='var(--accent)' }}
              onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='var(--border)' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <NavLink to="/admin/articles/new" className="btn-primary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>
              + New Article
            </NavLink>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.75rem 1.5rem', background:'var(--bg-base)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}