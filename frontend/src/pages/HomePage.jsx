// src/pages/HomePage.jsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchArticles } from '../api'
import { HeroArticle, ArticleCard, Spinner } from '../components/shared'
import { catClass, CATEGORIES, CAT_COLORS } from '../utils'

const PLACEHOLDER = [
  { id:'p1', title:'The Dawn of Artificial General Intelligence', category:'Technology', author:'Elena Marchetti', cover_image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80', excerpt:'Researchers at leading AI labs are reporting breakthroughs that could fundamentally reshape civilization.', created_at: new Date().toISOString() },
  { id:'p2', title:'Scientists Discover Exoplanet with Oxygen Atmosphere', category:'Science', author:'Dr. Wei Chen', cover_image:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80', excerpt:'The James Webb telescope reveals stunning data from a rocky world 40 light-years away.', created_at: new Date().toISOString() },
  { id:'p3', title:'Markets Hit All-Time Highs as Fed Signals Rate Cuts', category:'Business', author:'James Wu', cover_image:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80', excerpt:'Investors react to surprisingly strong employment data alongside cooling inflation.', created_at: new Date().toISOString() },
  { id:'p4', title:'New Longevity Drug Shows Remarkable Results', category:'Health', author:'Marco Bianchi', cover_image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', excerpt:'A Harvard-backed biotech firm reports a 30% reduction in cellular aging markers.', created_at: new Date().toISOString() },
  { id:'p5', title:"Japan's Hidden Prefectures: Beyond Tokyo and Kyoto", category:'Travel', author:'Yuki Tanaka', cover_image:'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80', excerpt:'Venture off the beaten path to discover stunning regions most tourists never see.', created_at: new Date().toISOString() },
]

export default function HomePage() {
  const { data, isLoading } = useQuery({ queryKey:['articles','home'], queryFn:()=>fetchArticles({limit:12}) })
  const articles = data?.articles?.length ? data.articles : PLACEHOLDER

  const hero      = articles[0]
  const secondary = articles.slice(1, 5)
  const latest    = articles.slice(0, 6)

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      {/* ── Hero Grid ── */}
      <section className="mb-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Spinner size="lg"/></div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            <HeroArticle article={hero} />
            <div className="flex flex-col gap-3">
              {secondary.map(a => (
                <Link key={a.id} to={`/article/${a.id}`}
                  className="flex gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                  <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    {a.cover_image
                      ? <img src={a.cover_image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                      : <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-content-center justify-center">📰</div>
                    }
                  </div>
                  <div className="min-w-0">
                    <span className={`cat-tag ${catClass(a.category)} mb-1`}>{a.category}</span>
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {a.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Trending Scroll ── */}
      <section className="bg-slate-50 dark:bg-slate-800/50 -mx-5 px-5 py-6 mb-10 border-y border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">🔥 Trending Now</h2>
          <Link to="/" className="text-sm font-semibold text-blue-600 hover:underline">See All →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {articles.slice(0, 6).map((a, i) => (
            <Link key={a.id} to={`/article/${a.id}`}
              className="min-w-[200px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="relative h-28 overflow-hidden">
                {a.cover_image
                  ? <img src={a.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  : <div className="w-full h-full bg-slate-200 dark:bg-slate-700"/>
                }
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                  0{i+1}
                </span>
              </div>
              <div className="p-3">
                <span className={`cat-tag ${catClass(a.category)} mb-1.5`}>{a.category}</span>
                <h4 className="text-xs font-semibold line-clamp-3 leading-snug">{a.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Latest Articles + Sidebar ── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold">Latest Articles</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner size="lg"/></div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {latest.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          )}

          {/* Category sections */}
          {CATEGORIES.slice(0, 3).map(cat => {
            const catArts = articles.filter(a => a.category === cat)
            if (!catArts.length) return null
            return (
              <div key={cat} className="mt-10">
                <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-t-xl text-white"
                  style={{ background: CAT_COLORS[cat] }}>
                  <h2 className="font-display text-lg font-bold">{cat}</h2>
                  <Link to={`/category/${cat.toLowerCase()}`} className="text-white/80 text-sm hover:text-white">View All →</Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 border border-t-0 rounded-b-xl p-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  {catArts.slice(0,2).map(a => <ArticleCard key={a.id} article={a}/>)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Trending widget */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">🔥 Popular</h3>
            {articles.slice(0, 5).map((a, i) => (
              <Link key={a.id} to={`/article/${a.id}`}
                className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:opacity-75 transition-opacity">
                <span className="font-display text-2xl font-black text-slate-200 dark:text-slate-600 leading-none w-7 flex-shrink-0">0{i+1}</span>
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold leading-snug line-clamp-2">{a.title}</h5>
                  <p className="text-xs text-slate-400 mt-1">{a.category}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-blue-500 pb-2 mb-4">📂 Categories</h3>
            {CATEGORIES.map(cat => (
              <Link key={cat} to={`/category/${cat.toLowerCase()}`}
                className="flex items-center gap-2.5 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:text-blue-600 transition-colors text-sm">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }}/>
                {cat}
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {articles.filter(a=>a.category===cat).length}
                </span>
              </Link>
            ))}
          </div>

          {/* Newsletter */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="text-2xl mb-2">✉️</div>
            <h3 className="font-bold mb-1">Stay Informed</h3>
            <p className="text-xs text-white/75 mb-3">Get NEXUS top stories every morning.</p>
            <input type="email" placeholder="Your email" className="w-full px-3 py-2 rounded-lg text-sm bg-white/15 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/20 mb-2"/>
            <button className="w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
              Subscribe Free
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
