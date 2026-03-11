// src/pages/ArticlePage.jsx
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchArticle, fetchArticles } from '../api'
import { Spinner, ArticleCard, CatBadge } from '../components/shared'
import { formatDate, catClass } from '../utils'

export default function ArticlePage() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticle(id),
    enabled: !!id,
  })
  const { data: related } = useQuery({
    queryKey: ['articles', data?.article?.category],
    queryFn: () => fetchArticles({ category: data?.article?.category, limit: 3 }),
    enabled: !!data?.article?.category,
  })

  if (isLoading) return <div className="flex justify-center items-center min-h-64 py-20"><Spinner size="lg"/></div>
  if (error || !data?.article) return (
    <div className="max-w-2xl mx-auto px-5 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h1 className="font-display text-2xl font-bold mb-3">Article Not Found</h1>
      <p className="text-slate-500 mb-6">This article may have been removed or the link is incorrect.</p>
      <Link to="/" className="btn-primary">← Back to Home</Link>
    </div>
  )

  const a = data.article

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        {/* Article Body */}
        <article>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>›</span>
            <Link to={`/category/${a.category?.toLowerCase()}`} className="hover:text-blue-600">{a.category}</Link>
            <span>›</span>
            <span className="text-slate-500 truncate max-w-[200px]">{a.title}</span>
          </div>

          {/* Header */}
          <CatBadge category={a.category} size="lg" />
          <h1 className="font-display text-3xl lg:text-4xl font-black leading-tight mt-3 mb-4">
            {a.title}
          </h1>

          {a.excerpt && (
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-5 font-light">
              {a.excerpt.replace(/<[^>]*>/g, '')}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-content-center justify-center text-white text-xs font-bold">
                {(a.author||'N')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">{a.author}</div>
                <div className="text-xs text-slate-400">{formatDate(a.created_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto text-xs text-slate-400">
              <span>👁 {a.views} views</span>
              {a.tags?.length > 0 && <span>🏷 {a.tags.length} tags</span>}
            </div>
          </div>

          {/* Cover Image */}
          {a.cover_image && (
            <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
              <img src={a.cover_image} alt={a.title} className="w-full h-full object-cover"/>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-display prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
            prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
            prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/30 prose-blockquote:py-1 prose-blockquote:rounded-r-lg
            prose-strong:text-slate-900 dark:prose-strong:text-white
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: a.content }}
          />

          {/* Tags */}
          {a.tags?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {a.tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-6">
          {related?.articles?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">
                Related Articles
              </h3>
              <div className="space-y-4">
                {related.articles.filter(r => r.id !== a.id).slice(0,3).map(r => (
                  <Link key={r.id} to={`/article/${r.id}`}
                    className="flex gap-3 group hover:opacity-75 transition-opacity">
                    <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {r.cover_image
                        ? <img src={r.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        : <div className="w-full h-full bg-slate-200 dark:bg-slate-700"/>
                      }
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{r.title}</h5>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(r.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">Share</h3>
            <div className="grid grid-cols-3 gap-2">
              {[['𝕏','Twitter'],['f','Facebook'],['in','LinkedIn']].map(([icon, label]) => (
                <button key={label} onClick={() => {
                  if (label === 'Twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank')
                }}
                  className="flex flex-col items-center py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold gap-1">
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
