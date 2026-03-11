// src/pages/admin/ArticlesList.jsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAllArticles, deleteArticle } from '../../api'
import { Spinner, StatusPill } from '../../components/shared'
import { toast } from '../../components/shared'
import { formatDate, CAT_COLORS, CATEGORIES } from '../../utils'

export default function ArticlesList() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-articles'],
    queryFn: () => fetchAllArticles({ status: 'all', limit: 200 }),
  })

  const articles = (data?.articles || []).filter(a => {
    const matchQ = !search || a.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || a.category === catFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchQ && matchCat && matchStatus
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteArticle(deleteId)
      toast('Article deleted', 'success')
      qc.invalidateQueries(['admin-articles'])
      qc.invalidateQueries(['stats'])
    } catch(e) {
      toast(`Error: ${e.message}`, 'error')
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">All Articles</h1>
          <p className="text-sm text-slate-400">{data?.total || 0} total articles</p>
        </div>
        <Link to="/admin/articles/new" className="btn-primary text-sm">+ New Article</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e=>setSearch(e.target.value)}
          className="form-input max-w-xs" placeholder="🔍 Search articles..."/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="form-select w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="form-select w-auto">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_90px_70px_100px] px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-400">
          <div>Article</div><div>Category</div><div>Status</div><div>Views</div><div>Actions</div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Spinner/></div>
        ) : !articles.length ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {search || catFilter ? 'No articles match your filters' : 'No articles yet'}
          </div>
        ) : articles.map(a => (
          <div key={a.id}
            className="grid grid-cols-[1fr_120px_90px_70px_100px] items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <div className="min-w-0 pr-3">
              <h4 className="text-sm font-semibold truncate">{a.title}</h4>
              <p className="text-xs text-slate-400">{a.author} · {formatDate(a.created_at)}</p>
            </div>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ background: CAT_COLORS[a.category]||'#1E73FF' }}>
                {a.category}
              </span>
            </div>
            <div><StatusPill status={a.status}/></div>
            <div className="text-sm font-medium">{(a.views||0).toLocaleString()}</div>
            <div className="flex gap-1.5">
              <Link to={`/admin/articles/edit/${a.id}`}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors font-medium">
                ✏️
              </Link>
              <button onClick={()=>setDeleteId(a.id)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-red-500 hover:text-red-600 transition-colors font-medium">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">🗑️ Delete Article</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone. Are you sure?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDeleteId(null)} className="btn-outline text-sm py-2">Cancel</button>
              <button onClick={handleDelete} className="btn-danger text-sm py-2">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
