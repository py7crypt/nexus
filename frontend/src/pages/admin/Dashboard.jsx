// src/pages/admin/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchStats } from '../../api'
import { Spinner, StatusPill } from '../../components/shared'
import { formatDate, CAT_COLORS } from '../../utils'

function StatCard({ icon, value, label, bg, change }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${bg}`}>{icon}</div>
      <div className="text-2xl font-bold mb-0.5">{value ?? '—'}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {change && <div className="text-xs text-green-600 mt-1">{change}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['stats'], queryFn: fetchStats, refetchInterval: 30000 })
  const s = data?.stats

  if (isLoading) return <div className="flex justify-center items-center min-h-64"><Spinner size="lg"/></div>

  const maxCat = Math.max(...Object.values(s?.by_category || {}), 1)

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-400">Welcome back to NEXUS CMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📰" value={s?.total} label="Total Articles" bg="bg-blue-50 dark:bg-blue-950" change="All time" />
        <StatCard icon="✅" value={s?.published} label="Published" bg="bg-green-50 dark:bg-green-950" change="Live on site" />
        <StatCard icon="📝" value={s?.drafts} label="Drafts" bg="bg-yellow-50 dark:bg-yellow-950" />
        <StatCard icon="👁" value={s?.total_views?.toLocaleString()} label="Total Views" bg="bg-purple-50 dark:bg-purple-950" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Recent Articles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-sm">Recent Articles</h2>
            <Link to="/admin/articles" className="text-xs text-blue-600 hover:underline font-medium">View All →</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {!s?.recent?.length ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">
                No articles yet. <Link to="/admin/articles/new" className="text-blue-600 hover:underline">Create one →</Link>
              </div>
            ) : s.recent.map(a => (
              <Link key={a.id} to={`/admin/articles/edit/${a.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-content-center justify-center text-base flex-shrink-0">
                  📰
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{a.title}</h4>
                  <p className="text-xs text-slate-400">{a.category} · {formatDate(a.created_at)} · {a.views} views</p>
                </div>
                <StatusPill status={a.status}/>
              </Link>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700">
            <Link to="/admin/articles/new" className="btn-primary text-xs py-2 w-full justify-center">
              + New Article
            </Link>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-sm mb-4">By Category</h2>
          {!Object.keys(s?.by_category||{}).length ? (
            <p className="text-slate-400 text-sm text-center py-6">No data yet</p>
          ) : Object.entries(s.by_category).map(([cat, count]) => (
            <div key={cat} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{cat}</span>
                <span className="font-bold">{count}</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${count/maxCat*100}%`, background: CAT_COLORS[cat]||'#1E73FF' }}/>
              </div>
            </div>
          ))}

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <Link to="/admin/ai" className="flex items-center gap-2 text-sm font-semibold text-violet-600 hover:underline">
              🤖 Generate with AI →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
