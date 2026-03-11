// src/utils.js
export const CAT_COLORS = {
  Technology:    '#1E73FF',
  Science:       '#7C3AED',
  Business:      '#059669',
  Health:        '#DC2626',
  Lifestyle:     '#D97706',
  Travel:        '#0891B2',
  Entertainment: '#DB2777',
}

export const CATEGORIES = Object.keys(CAT_COLORS)

export function catClass(cat) {
  const map = {
    Technology: 'cat-tech', Science: 'cat-science', Business: 'cat-business',
    Health: 'cat-health', Lifestyle: 'cat-lifestyle', Travel: 'cat-travel',
    Entertainment: 'cat-entertainment',
  }
  return map[cat] || 'cat-tech'
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1)  return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return formatDate(iso)
}

export function wordCount(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80)
}
