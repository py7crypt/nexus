// src/api.js — All API calls to Python backend

const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('nexus_token') || ''
}

async function request(path, opts = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const data = await res.json()
  if (!res.ok && !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

// ── Public ──────────────────────────────────────────────────
export const fetchArticles = ({ category, limit = 20, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit, offset, status: 'published' })
  if (category) params.set('category', category)
  return request(`/api/articles?${params}`)
}

export const fetchArticle = (id) => request(`/api/articles/${id}`)

// ── Admin ────────────────────────────────────────────────────
export const login = (username, password) =>
  request('/api/auth', { method: 'POST', body: JSON.stringify({ username, password }) })

export const fetchStats = () => request('/api/stats')

export const fetchAllArticles = ({ category, status = 'all', limit = 100, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit, offset, status })
  if (category) params.set('category', category)
  return request(`/api/articles?${params}`)
}

export const createArticle = (data) =>
  request('/api/articles', { method: 'POST', body: JSON.stringify(data) })

export const updateArticle = (id, data) =>
  request(`/api/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteArticle = (id) =>
  request(`/api/articles/${id}`, { method: 'DELETE' })

export const generateAI = (data) =>
  request('/api/ai-generate', { method: 'POST', body: JSON.stringify(data) })
