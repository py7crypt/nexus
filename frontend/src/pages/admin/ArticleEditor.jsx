// src/pages/admin/ArticleEditor.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchArticle, createArticle, updateArticle } from '../../api'
import { Spinner, SEOScore, toast } from '../../components/shared'
import { getCategories, slugify, wordCount } from '../../utils'
import Quill from 'quill'
import NewsScraperModal from '../../components/NewsScraperModal'
import 'quill/dist/quill.snow.css'

export default function ArticleEditor() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()

  const editorRef  = useRef(null)
  const quillRef   = useRef(null)
  const filledRef  = useRef(false)  // prevents double-fill of Quill content

  const [form, setForm] = useState({
    title: '', slug: '', category: '', author: 'NEXUS Editorial',
    excerpt: '', cover_image: '', status: 'draft',
    seo_title: '', seo_description: '',
  })
  const [tags, setTags]                 = useState([])
  const [tagInput, setTagInput]         = useState('')
  const [content, setContent]           = useState('')
  const [words, setWords]               = useState(0)
  const [saving,   setSaving]   = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [coverPreview, setCoverPreview] = useState('')

  // ── Fetch article (edit mode) ─────────────────────────────────────────
  const { data: fetchedData, isLoading } = useQuery({
    queryKey:  ['article', id],
    queryFn:   () => fetchArticle(id),
    enabled:   isEdit,
    staleTime: 0,
    retry:     2,
    retryDelay: 800,
  })

  const article = fetchedData?.article

  // ── Mount Quill exactly once ──────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return
    const q = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: 'Start writing your article...',
      modules: {
        clipboard: {
          matchers: [
            [Node.ELEMENT_NODE, (node, delta) => {
              delta.ops = delta.ops.map(op => {
                if (op.attributes) {
                  delete op.attributes.background
                  delete op.attributes.color
                  if (op.attributes.style) {
                    op.attributes.style = op.attributes.style
                      .replace(/background(-color)?:[^;]+;?/gi, '')
                      .replace(/color:[^;]+;?/gi, '')
                      .trim()
                    if (!op.attributes.style) delete op.attributes.style
                  }
                }
                return op
              })
              return delta
            }]
          ]
        },
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['link', 'image'],
          ['clean'],
        ],
      },
    })
    quillRef.current = q
    q.on('text-change', () => {
      const html = q.root.innerHTML
      setContent(html)
      setWords(wordCount(html))
    })
  }, []) // run once only

  // ── Fill form + Quill when article data arrives ───────────────────────
  // Polls until Quill is mounted — fixes race condition on hard reload
  useEffect(() => {
    if (!article || filledRef.current) return
    let tries = 0
    const attempt = () => {
      if (filledRef.current) return          // already filled by another run
      if (!quillRef.current) {
        if (++tries < 30) setTimeout(attempt, 100)  // retry up to 3s
        return
      }
      filledRef.current = true
      _fillEditor(article)
    }
    attempt()
  }, [article])  // re-runs whenever article reference changes

  function _fillEditor(a) {
    setForm({
      title:           a.title || '',
      slug:            a.slug  || '',
      category:        a.category || '',
      author:          a.author || 'NEXUS Editorial',
      excerpt:         (a.excerpt || '').replace(/<[^>]*>/g, ''),
      cover_image:     a.cover_image || '',
      status:          a.status || 'draft',
      seo_title:       a.seo_title || '',
      seo_description: a.seo_description || '',
    })
    setTags(a.tags || [])
    if (a.cover_image) setCoverPreview(a.cover_image)
    if (a.content && quillRef.current) {
      // Clear first to prevent duplication, then set content
      quillRef.current.setContents([])
      quillRef.current.clipboard.dangerouslyPasteHTML(0, a.content)
      setContent(a.content)
      setWords(wordCount(a.content))
    }
  }

  // ── Load AI draft from sessionStorage (new article only) ─────────────
  useEffect(() => {
    if (isEdit) return
    const draft = sessionStorage.getItem('ai_draft')
    if (!draft) return
    sessionStorage.removeItem('ai_draft')
    try {
      const a = JSON.parse(draft)
      const tryLoad = () => {
        if (!quillRef.current) { setTimeout(tryLoad, 100); return }
        _fillEditor(a)
      }
      tryLoad()
    } catch(e) { console.warn('AI draft error', e) }
  }, [isEdit])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (v) => {
    setField('title', v)
    setField('slug', slugify(v))
    if (!form.seo_title) setField('seo_title', v)
  }

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().toLowerCase()
      if (!tags.includes(t)) setTags(p => [...p, t])
      setTagInput('')
    }
  }

  const handleNewsFill = (a) => {
    setForm(f => ({
      ...f,
      title:           a.title           || f.title,
      slug:            slugify(a.title   || f.title),
      category:        a.category        || f.category,
      author:          a.author          || f.author,
      excerpt:         a.excerpt         || f.excerpt,
      cover_image:     a.cover_image     || f.cover_image,
      seo_title:       a.seo_title       || f.seo_title       || (a.title||'').slice(0,60),
      seo_description: a.seo_description || f.seo_description || (a.excerpt||'').slice(0,155),
    }))
    if (a.cover_image)  setCoverPreview(a.cover_image)
    if (a.tags?.length) setTags(a.tags)
    if (a.content && quillRef.current) {
      quillRef.current.setContents([])
      quillRef.current.clipboard.dangerouslyPasteHTML(0, a.content)
      setContent(a.content)
      setWords(wordCount(a.content))
    }
    toast('✅ Article imported — review and edit before publishing', 'success')
  }

  const handlePreview = () => {
    const html = quillRef.current?.root?.innerHTML || content
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>Preview — ${form.title}</title>
      <style>body{max-width:800px;margin:40px auto;font-family:Georgia,serif;line-height:1.8;padding:0 24px;color:#1a1a1a}
      h1{font-size:2rem;margin-bottom:8px}h2{font-size:1.4rem;margin-top:2rem}
      p{margin:1em 0}blockquote{border-left:4px solid #3b82f6;padding-left:1rem;color:#555;margin:1.5rem 0}
      img{max-width:100%;border-radius:8px}</style></head>
      <body><h1>${form.title}</h1>
      <hr style="margin:1rem 0;border:none;border-top:1px solid #eee">
      ${html}</body></html>`)
    w.document.close()
  }

  const handleSave = async (overrideStatus) => {
    if (!form.title.trim())   { toast('Title is required',    'error'); return }
    if (!form.category)       { toast('Category is required', 'error'); return }
    const html = quillRef.current?.root?.innerHTML || content
    if (!html || html === '<p><br></p>') { toast('Content is required', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        status:  overrideStatus ?? form.status,
        content: html,
        tags,
        excerpt: form.excerpt || html.replace(/<[^>]*>/g, '').substring(0, 200),
      }
      const res = isEdit
        ? await updateArticle(id, payload)
        : await createArticle(payload)

      if (res.success) {
        toast((overrideStatus ?? form.status) === 'published' ? '🚀 Published!' : '💾 Draft saved!', 'success')

        // Always redirect to dashboard after any save
        navigate('/admin')
      } else {
        toast(`Error: ${res.error || 'Unknown error'}`, 'error')
      }
    } catch(e) {
      toast(`Error: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && isLoading) {
    return <div className="flex justify-center items-center min-h-64"><Spinner size="lg"/></div>
  }

  return (
    <div className="fade-in">
      {/* ── Top bar — Save Draft | Publish | Preview ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{isEdit ? 'Edit Article' : 'New Article'}</h1>
          <p className="text-sm text-slate-400">{words} words · {form.status}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview}
            className="btn-outline text-sm py-2 px-4">
            👁️ Preview
          </button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="btn-outline text-sm py-2 px-4">
            💾 Save Draft
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            className="btn-primary text-sm py-2 px-4">
            {saving ? '⏳ Saving...' : '🚀 Publish'}
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_290px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-5">
          {/* Title + Slug */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Title *</label>
                {!isEdit && (
                  <button onClick={() => setShowNews(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                    <span>📰</span><span>Import from News</span>
                  </button>
                )}
              </div>
              <input value={form.title} onChange={e => handleTitleChange(e.target.value)}
                className="form-input text-lg font-semibold" placeholder="Enter article headline..."/>
            </div>
            <div>
              <label className="form-label">Slug</label>
              <input value={form.slug} onChange={e => setField('slug', e.target.value)}
                className="form-input text-slate-400 text-sm" placeholder="auto-generated-from-title"/>
            </div>
          </div>

          {/* Quill editor */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700">
              <label className="form-label mb-0">Content *</label>
            </div>
            <div ref={editorRef} style={{ minHeight: '320px' }}/>
            <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700 text-right text-xs text-slate-400">
              {words} words
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">🔍 SEO Settings</h3>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="form-label mb-0">SEO Title</label>
                <span className="text-xs text-slate-400">{form.seo_title.length}/60</span>
              </div>
              <input value={form.seo_title} onChange={e => setField('seo_title', e.target.value)}
                maxLength={60} className="form-input" placeholder="SEO-optimized title"/>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="form-label mb-0">Meta Description</label>
                <span className="text-xs text-slate-400">{form.seo_description.length}/155</span>
              </div>
              <textarea value={form.seo_description} onChange={e => setField('seo_description', e.target.value)}
                maxLength={155} rows={3} className="form-input resize-none"
                placeholder="Compelling meta description..."/>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Article Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Article Info</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Category *</label>
                <select value={form.category} onChange={e => setField('category', e.target.value)} className="form-select">
                  <option value="">Select category...</option>
                  {getCategories().map(c => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Author</label>
                <input value={form.author} onChange={e => setField('author', e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Excerpt</label>
                <textarea value={form.excerpt} onChange={e => setField('excerpt', e.target.value)}
                  rows={3} className="form-input resize-none text-sm" placeholder="Short article summary..."/>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🖼️ Cover Image</h3>
            <input value={form.cover_image} onChange={e => { setField('cover_image', e.target.value); setCoverPreview(e.target.value) }}
              className="form-input text-sm mb-2" placeholder="https://images.unsplash.com/..."/>
            {coverPreview && (
              <img src={coverPreview} alt="Cover"
                className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                onError={() => setCoverPreview('')}/>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              💡 <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Unsplash</a> for free images
            </p>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🏷️ Tags</h3>
            <div className="flex flex-wrap gap-1.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[42px] focus-within:border-blue-500 cursor-text"
              onClick={() => document.getElementById('tagInput')?.focus()}>
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => setTags(p => p.filter(x => x !== t))} className="hover:text-red-500">×</button>
                </span>
              ))}
              <input id="tagInput" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                className="bg-transparent outline-none text-xs min-w-[80px] flex-1 text-slate-700 dark:text-slate-300"
                placeholder="Type + Enter..."/>
            </div>
            <p className="text-xs text-slate-400 mt-1">Press Enter to add a tag</p>
          </div>

          {/* SEO Score */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">📈 SEO Score</h3>
            <SEOScore
              title={form.title} content={content}
              seoTitle={form.seo_title} seoDesc={form.seo_description}
              tags={tags} coverImage={form.cover_image}
            />
          </div>
        </div>
      </div>

      {showNews && (
        <NewsScraperModal
          onFill={handleNewsFill}
          onClose={() => setShowNews(false)}
        />
      )}
    </div>
  )
}
