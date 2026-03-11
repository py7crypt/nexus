// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'

// Public site
import PublicLayout   from './components/PublicLayout'
import HomePage       from './pages/HomePage'
import ArticlePage    from './pages/ArticlePage'
import CategoryPage   from './pages/CategoryPage'

// Admin
import AdminLayout    from './components/AdminLayout'
import LoginPage      from './pages/admin/LoginPage'
import Dashboard      from './pages/admin/Dashboard'
import ArticlesList   from './pages/admin/ArticlesList'
import ArticleEditor  from './pages/admin/ArticleEditor'
import AIGenerator    from './pages/admin/AIGenerator'
import Settings       from './pages/admin/Settings'

function ProtectedRoute({ children }) {
  const { auth } = useApp()
  return auth.token ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* ── Public Site ── */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="article/:id" element={<ArticlePage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<ArticlesList />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/edit/:id" element={<ArticleEditor />} />
          <Route path="ai" element={<AIGenerator />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
