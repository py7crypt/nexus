// src/pages/admin/ArticleEditor.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchArticle, createArticle, updateArticle } from '../../api'
import { Spinner, SEOScore, toast } from '../../components/shared'
import { CATEGORIES, slugify, wordCount } from '../../utils'

// Quill loaded from CDN via index.html
function useQuill(ref) {
  const [quill, setQuill] = useState(null)
  useEffect(() => {
    if (!ref.current || quill) return
    const q = new window.Quill(ref.current, {
      theme: 'snow',
      placeholder: 'Start writing your article...',
      modules: {
        toolbar: [
          [{ header: [1,2,3,false] }],
          ['bold','italic','underline','strike'],
          [{ color:[] },{ background:[] }],
          ['blockquote','code-block'],
          [{ list:'ordered' },{ list:'bullet' }],
          [{ align:[] }],
          ['link','image'],
          ['clean']
        ]
      }
    })
    setQuill(q)
  }, [ref, quill])
  return quill
}

export default function ArticleEditor() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const editorRef = useRef(null)
  const quill = useQuill(editorRef)

  const [form, setForm] = useState({
    title: '', slug: '', category: '', author: 'NEXUS Editorial',
    excerpt: '', cover_image: '', status: 'draft',
    seo_title: '', seo_description: '',
  })
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [content, setContent] = useState('')
  const [words, setWords] = useState(0)
  const [saving, setSaving] = useState(false)
  const [coverPreview, setCoverPreview] = useState('')

  // Load existing article
  const { data: existing, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticle(id),
    enabled: isEdit,
  })

  // Populate form when loaded
  useEffect(() => {
    if (!existing?.article || !quill) return
    const a = existing.article
    setForm({
      title: a.title || '',
      slug: a.slug || '',
      category: a.category || '',
      author: a.author || 'NEXUS Editorial',
      excerpt: a.excerpt?.replace(/<[^>]*>/g,'') || '',
      cover_image: a.cover_image || '',
      status: a.status || 'draft',
      seo_title: a.seo_title || '',
      seo_description: a.seo_description || '',
    })
    setTags(a.tags || [])
    if (a.cover_image) setCoverPreview(a.cover_image)
    if (quill && a.content) {
      quill.root.innerHTML = a.content
      setContent(a.content)
      setWords(wordCount(a.content))
    }
  }, [existing, quill])

  // Watch quill changes
  useEffect(() => {
    if (!quill) return
    quill.on('text-change', () => {
      const html = quill.root.innerHTML
      setContent(html)
      setWords(wordCount(html))
    })
  }, [quill])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (v) => {
    setField('title', v)
    setField('slug', slugify(v))
    if (!form.seo_title) setField('seo_title', v)
  }

  const handleCoverChange = (v) => {
    setField('cover_image', v)
    setCoverPreview(v)
  }

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().toLowerCase()
      if (!tags.includes(t)) setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t))

  const handleSave = async (overrideStatus) => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    if (!form.category) { toast('Category is required', 'error'); return }
    if (!content || content === '<p><br></p>') { toast('Content is required', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        status: overrideStatus || form.status,
        content,
        tags,
        excerpt: form.excerpt || content.replace(/<[^>]*>/g,'').substring(0,200),
      }
      let res
      if (isEdit) res = await updateArticle(id, payload)
      else res = await createArticle(payload)

      if (res.success) {
        toast(isEdit ? '✅ Article updated!' : '🎉 Article created!', 'success')
        qc.invalidateQueries(['admin-articles'])
        qc.invalidateQueries(['stats'])
        if (!isEdit) navigate(`/admin/articles/edit/${res.article.id}`)
      } else {
        toast(`Error: ${res.error}`, 'error')
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{isEdit ? 'Edit Article' : 'New Article'}</h1>
          <p className="text-sm text-slate-400">{words} words · {form.status}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="btn-outline text-sm py-2">
            Save Draft
          </button>
          <button onClick={() => handleSave('published')} disabled={saving}
            className="btn-primary text-sm py-2">
            {saving ? '⏳...' : '🚀 Publish'}
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_290px] gap-6 items-start">
        {/* Main Editor */}
        <div className="space-y-5">
          {/* Title + Slug */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="mb-4">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e=>handleTitleChange(e.target.value)}
                className="form-input text-lg font-semibold" placeholder="Enter a compelling headline..."/>
            </div>
            <div>
              <label className="form-label">Slug</label>
              <input value={form.slug} onChange={e=>setField('slug',e.target.value)}
                className="form-input text-slate-400 text-sm" placeholder="auto-generated-slug"/>
            </div>
          </div>

          {/* Quill Editor */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700">
              <label className="form-label mb-0">Content *</label>
            </div>
            <div ref={editorRef}/>
            <div className="px-5 py-2 border-t border-slate-100 dark:border-slate-700 text-right text-xs text-slate-400">
              {words} words
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">🔍 SEO Settings</h3>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="form-label mb-0">SEO Title</label>
                <span className="text-xs text-slate-400">{form.seo_title.length}/60</span>
              </div>
              <input value={form.seo_title} onChange={e=>setField('seo_title',e.target.value)}
                maxLength={60} className="form-input" placeholder="SEO-optimized title"/>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="form-label mb-0">Meta Description</label>
                <span className="text-xs text-slate-400">{form.seo_description.length}/155</span>
              </div>
              <textarea value={form.seo_description} onChange={e=>setField('seo_description',e.target.value)}
                maxLength={155} rows={3} className="form-input resize-none"
                placeholder="Compelling meta description for search engines..."/>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Publish</h3>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e=>setField('status',e.target.value)} className="form-select">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <button onClick={()=>handleSave()} disabled={saving}
              className="btn-primary w-full justify-center text-sm py-2.5">
              {saving ? '⏳ Saving...' : '💾 Save Article'}
            </button>
            <button
              onClick={() => { const w = window.open('','_blank'); w.document.write(`<html><head><title>Preview</title></head><body style="max-width:800px;margin:40px auto;font-family:Georgia;line-height:1.7"><h1>${form.title}</h1>${content}</body></html>`) }}
              className="btn-outline w-full justify-center text-sm py-2 mt-2">
              👁️ Preview
            </button>
          </div>

          {/* Article Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Article Info</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Category *</label>
                <select value={form.category} onChange={e=>setField('category',e.target.value)} className="form-select">
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Author</label>
                <input value={form.author} onChange={e=>setField('author',e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Excerpt</label>
                <textarea value={form.excerpt} onChange={e=>setField('excerpt',e.target.value)}
                  rows={3} className="form-input resize-none text-sm" placeholder="Short article summary..."/>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🖼️ Cover Image</h3>
            <input value={form.cover_image} onChange={e=>handleCoverChange(e.target.value)}
              className="form-input text-sm mb-2" placeholder="https://images.unsplash.com/..."/>
            {coverPreview && (
              <img src={coverPreview} alt="Preview"
                className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                onError={()=>setCoverPreview('')}/>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              💡 Use <a href="https://unsplash.com" target="_blank" className="text-blue-500">Unsplash</a> for free images
            </p>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">🏷️ Tags</h3>
            <div className="flex flex-wrap gap-1.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[40px] focus-within:border-blue-500 mb-1"
              onClick={()=>document.getElementById('tagInput')?.focus()}>
              {tags.map(t=>(
                <span key={t} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={()=>removeTag(t)} className="text-blue-400 hover:text-blue-700 text-xs">×</button>
                </span>
              ))}
              <input id="tagInput" value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={addTag} className="bg-transparent outline-none text-xs min-w-[80px] flex-1 text-slate-700 dark:text-slate-300"
                placeholder="Type and press Enter..."/>
            </div>
            <p className="text-xs text-slate-400">Press Enter to add</p>
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
    </div>
  )
}
