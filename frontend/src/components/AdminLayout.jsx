// src/components/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

const NAV = [
  { to: '/admin',           label: 'Dashboard',    icon: '📊', end: true },
  { to: '/admin/articles',  label: 'All Articles', icon: '📰' },
  { to: '/admin/articles/new', label: 'New Article', icon: '✏️' },
  { to: '/admin/ai',        label: 'AI Generator', icon: '🤖', badge: 'AI' },
  { to: '/admin/categories',label: 'Categories',   icon: '🏷️' },
  { to: '/admin/settings',  label: 'Settings',     icon: '⚙️' },
]

export default function AdminLayout() {
  const { dark, toggleDark, logout } = useApp()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebar] = useState(true)

  const handleLogout = () => { logout(); navigate('/admin/login') }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0 lg:w-14'} flex-shrink-0 bg-slate-950 flex flex-col overflow-hidden transition-all duration-300 z-40`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/10 flex-shrink-0">
          <span className="font-display text-xl font-black text-white">NEX<span className="text-blue-500">US</span></span>
          {sidebarOpen && <span className="ml-2 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">ADMIN</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-5 py-2">Content</div>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && item.badge && (
                <span className="ml-auto text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </NavLink>
          ))}

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-5 py-2 mt-2">Site</div>
          <a href="/" target="_blank" className="sidebar-link">
            <span className="text-base">🌐</span>
            {sidebarOpen && <span>View Site</span>}
          </a>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-slate-400 font-medium">Admin</span>
            </div>
          )}
          <button onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-2">
            🚪 {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-5 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebar(o => !o)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-lg">
              ☰
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">NEXUS CMS</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              {dark ? '☀️' : '🌙'}
            </button>
            <NavLink to="/admin/articles/new"
              className="btn-primary text-xs py-1.5 px-3">
              + New Article
            </NavLink>
          </div>
        </div>

        {/* Page */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
