// src/pages/CategoryPage.jsx
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchArticles } from '../api'
import { ArticleCard, Spinner } from '../components/shared'
import { getCategories, catColor } from '../utils'

export default function CategoryPage() {
  const { slug } = useParams()
  const cats = getCategories()
  const category = cats.find(c => c.name.toLowerCase() === slug?.toLowerCase())?.name || slug

  const { data, isLoading } = useQuery({
    queryKey: ['articles', category],
    queryFn: () => fetchArticles({ category, limit: 20 }),
    enabled: !!category,
  })

  const color = catColor(category)
  const articles = data?.articles || []

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      {/* Category Header */}
      <div className="rounded-2xl p-8 mb-8 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }}/>
        <div className="relative z-10">
          <h1 className="font-display text-4xl font-black mb-2">{category}</h1>
          <p className="text-white/75 text-sm">
            {data?.total || 0} articles · Updated daily
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg"/></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg">No articles in {category} yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(a => <ArticleCard key={a.id} article={a}/>)}
        </div>
      )}
    </div>
  )
}
