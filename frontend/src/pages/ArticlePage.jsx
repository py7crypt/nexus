// src/pages/ArticlePage.jsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchArticle, fetchArticles } from '../api'
import { Spinner, LikeButton, WeatherCard } from '../components/shared'
import { formatDate, catColor } from '../utils'

export default function ArticlePage() {
  const { id } = useParams()

  // ── All hooks must be at the top, before any early returns ──
  const [copied, setCopied] = useState(false)

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

  const a          = article
  const rawUrl     = window.location.href
  const encUrl     = encodeURIComponent(rawUrl)
  const encTitle   = encodeURIComponent(a.title)

  // Fixed share buttons — completely independent of admin social media settings
  const shareLinks = [
    { label: 'Twitter',  icon: 'https://cdn.simpleicons.org/x/000000',        shareUrl: `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}` },
    { label: 'Facebook', icon: 'https://cdn.simpleicons.org/facebook/1877F2', shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}` },
    { label: 'LinkedIn', icon: 'https://cdn.simpleicons.org/linkedin/0A66C2', shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}` },
    { label: 'WhatsApp', icon: 'https://cdn.simpleicons.org/whatsapp/25D366', shareUrl: `https://wa.me/?text=${encTitle}%20${encUrl}` },
    { label: 'Telegram', icon: 'https://cdn.simpleicons.org/telegram/26A5E4', shareUrl: `https://t.me/share/url?url=${encUrl}&text=${encTitle}` },
    { label: 'Reddit',   icon: 'https://cdn.simpleicons.org/reddit/FF4500',   shareUrl: `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}` },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(rawUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleNativeShare = () => {
    navigator.share({ title: a.title, url: rawUrl }).catch(() => {})
  }

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

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-display prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
            prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
            prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/30
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
          {/* Related Articles */}
          {related?.articles?.filter(r => r.id !== a.id).length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">Related Articles</h3>
              <div className="space-y-4">
                {related.articles.filter(r => r.id !== a.id).slice(0, 3).map(r => (
                  <Link key={r.id} to={`/article/${r.id}`}
                    className="flex gap-3 group hover:opacity-75 transition-opacity">
                    <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {r.cover_image
                        ? <img src={r.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        : <div className="w-full h-full" style={{ background: catColor(r.category) + '33' }}/>
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
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">Share This Article</h3>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {shareLinks.map(({ icon, label, shareUrl }) => (
                <button key={label}
                  onClick={() => window.open(shareUrl, '_blank', 'width=600,height=400')}
                  className="flex flex-col items-center py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold gap-1.5 group">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <img src={icon} alt={label} className="w-5 h-5 object-contain group-hover:brightness-0 group-hover:invert transition-all"/>
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Copy link */}
            <button onClick={handleCopy}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs group mb-2">
              <span className="truncate text-slate-500 dark:text-slate-400 font-mono">{rawUrl}</span>
              <span className={`flex-shrink-0 font-bold transition-colors ${copied ? 'text-green-600' : 'text-blue-600 group-hover:text-blue-700'}`}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </span>
            </button>

            {/* Native share — mobile only */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={handleNativeShare}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
                ↗ Share…
              </button>
            )}
          </div>

          {/* Weather */}
          <WeatherCard />
        </aside>
      </div>
    </div>
  )
}
