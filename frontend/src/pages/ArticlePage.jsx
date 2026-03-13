// src/pages/ArticlePage.jsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchArticle, fetchArticles } from '../api'
import { Spinner, LikeButton } from '../components/shared'
import { formatDate, catColor } from '../utils'
import RightSidebar from '../components/RightSidebar'

export default function ArticlePage() {
  const { id } = useParams()

  // ── All hooks must be at the top, before any early returns ──

  const { data, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn:  () => fetchArticle(id),
    enabled:  !!id,
    retry: 1,
  })

  const article = data?.article

  const { data: related } = useQuery({
    queryKey: ['articles', article?.category],
    queryFn:  () => fetchArticles({ category: article?.category, limit: 4 }),
    enabled:  !!article?.category,
  })

  // ── Early returns after all hooks ──
  if (isLoading) return (
    <div className="flex justify-center items-center py-32"><Spinner size="lg"/></div>
  )

  if (error || !article) return (
    <div className="max-w-2xl mx-auto px-5 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h1 className="font-display text-2xl font-bold mb-3">Article Not Found</h1>
      <p className="text-slate-500 mb-6">This article may have been removed or the link is incorrect.</p>
      <p className="text-xs text-slate-400 mb-6">Article ID: {id}</p>
      <Link to="/" className="btn-primary">← Back to Home</Link>
    </div>
  )

  const a = article

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <article>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>›</span>
            <Link to={`/category/${a.category?.toLowerCase()}`} className="hover:text-blue-600">{a.category}</Link>
            <span>›</span>
            <span className="text-slate-500 truncate max-w-[200px]">{a.title}</span>
          </div>

          {/* Category badge */}
          <span className="inline-block font-bold uppercase tracking-wide rounded-full text-white text-sm px-3 py-1"
            style={{ background: catColor(a.category) }}>
            {a.category}
          </span>

          <h1 className="font-display text-3xl lg:text-4xl font-black leading-tight mt-3 mb-4">{a.title}</h1>

          {a.excerpt && (
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-5 font-light">
              {a.excerpt.replace(/<[^>]*>/g, '')}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: catColor(a.category) }}>
                {(a.author || 'N')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">{a.author}</div>
                <div className="text-xs text-slate-400">{formatDate(a.created_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto text-xs text-slate-400">
              <span>👁 {a.views || 0} views</span>
              {a.tags?.length > 0 && <span>🏷 {a.tags.length} tags</span>}
              <LikeButton articleId={a.id} />
            </div>
          </div>

          {/* Content — rendered exactly as written in the editor, no extra CSS */}
          <div
            className="article-content"
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

        <RightSidebar variant="article" article={a}/>
      </div>
    </div>
  )
}