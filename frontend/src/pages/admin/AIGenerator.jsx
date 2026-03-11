// src/pages/admin/AIGenerator.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { generateAI, createArticle } from '../../api'
import { Spinner, toast, CatBadge } from '../../components/shared'
import { getCategories } from '../../utils'

const TONES   = ['professional','casual','investigative','educational','analytical','narrative']
const LENGTHS = [['short','~400w'],['medium','~800w'],['long','~1500w']]

const MODELS = [
  // Anthropic
  { id:'claude-sonnet-4-5',          label:'Claude Sonnet 4.5',      provider:'Anthropic', icon:'🟠', env:'ANTHROPIC_API_KEY' },
  { id:'claude-opus-4-5',            label:'Claude Opus 4.5',        provider:'Anthropic', icon:'🟠', env:'ANTHROPIC_API_KEY' },
  { id:'claude-haiku-4-5-20251001',  label:'Claude Haiku 4.5',       provider:'Anthropic', icon:'🟠', env:'ANTHROPIC_API_KEY' },
  // OpenAI
  { id:'gpt-4o',                     label:'GPT-4o',                 provider:'OpenAI',    icon:'🟢', env:'OPENAI_API_KEY' },
  { id:'gpt-4o-mini',                label:'GPT-4o Mini',            provider:'OpenAI',    icon:'🟢', env:'OPENAI_API_KEY' },
  // DeepSeek
  { id:'deepseek-chat',              label:'DeepSeek V3',            provider:'DeepSeek',  icon:'🔵', env:'DEEPSEEK_API_KEY' },
  { id:'deepseek-reasoner',          label:'DeepSeek R1 (Reasoner)', provider:'DeepSeek',  icon:'🔵', env:'DEEPSEEK_API_KEY' },
  // Google
  { id:'gemini-2.0-flash',           label:'Gemini 2.0 Flash',       provider:'Google',    icon:'🔴', env:'GEMINI_API_KEY' },
  { id:'gemini-1.5-pro',             label:'Gemini 1.5 Pro',         provider:'Google',    icon:'🔴', env:'GEMINI_API_KEY' },
]

const PROVIDERS = [...new Set(MODELS.map(m => m.provider))]

export default function AIGenerator() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    topic: '', category: 'Technology', tone: 'professional',
    length: 'medium', language: 'English', model: 'claude-sonnet-4-5',
  })
  const [selectedProvider, setSelectedProvider] = useState('Anthropic')
  const [keywords, setKeywords]   = useState([])
  const [kwInput, setKwInput]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [status, setStatus]       = useState('')
  const [result, setResult]       = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [log, setLog]             = useState([])

  const addLog = (msg, type='info') => setLog(l => [...l, { msg, type, id: Date.now()+Math.random() }])

  const addKw = (e) => {
    if (e.key === 'Enter' && kwInput.trim()) {
      e.preventDefault()
      const kw = kwInput.trim()
      if (!keywords.includes(kw)) setKeywords(k => [...k, kw])
      setKwInput('')
    }
  }

  const selectedModel = MODELS.find(m => m.id === form.model) || MODELS[0]

  const generate = async () => {
    if (!form.topic.trim()) { toast('Please enter a topic', 'error'); return }
    setLoading(true); setResult(null); setLog([])
    addLog(`Using model: ${selectedModel.label} (${selectedModel.provider})`, 'info')
    addLog(`Connecting to AI backend...`, 'info')

    const steps = ['Analyzing topic...','Researching content...','Structuring article...','Writing content...','Optimizing SEO...']
    let si = 0
    const interval = setInterval(() => {
      if (si < steps.length) { setStatus(steps[si]); addLog(`→ ${steps[si]}`,'info'); si++ }
    }, 2800)

    try {
      const res = await generateAI({ ...form, keywords })
      clearInterval(interval)
      if (res.success) {
        addLog(`✓ Generated with ${res.article?.model_used || selectedModel.label}`, 'success')
        setResult({ ...res.article, category: form.category })
        setStatus('')
        toast('✨ Article generated!', 'success')
      } else {
        addLog(`✗ ${res.error}`, 'error')
        toast(`Error: ${res.error}`, 'error')
        setStatus('')
      }
    } catch(e) {
      clearInterval(interval)
      addLog(`✗ ${e.message}`, 'error')
      toast(`Error: ${e.message}`, 'error')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const publish = async () => {
    if (!result) return
    setPublishing(true)
    try {
      const res = await createArticle({
        title: result.title, content: result.content, excerpt: result.excerpt,
        category: result.category, tags: result.tags, cover_image: result.cover_image,
        seo_title: result.seo_title, seo_description: result.seo_description,
        status: 'published', author: `NEXUS AI · ${selectedModel.label}`,
      })
      if (res.success) {
        toast('🎉 Article published!', 'success')
        qc.invalidateQueries(['admin-articles-all'])
        navigate(`/admin/articles/edit/${res.article.id}`)
      }
    } catch(e) { toast(`Error: ${e.message}`, 'error') }
    finally { setPublishing(false) }
  }

  const sendToEditor = () => {
    if (!result) return
    sessionStorage.setItem('ai_draft', JSON.stringify(result))
    navigate('/admin/articles/new?from=ai')
  }

  const filteredModels = MODELS.filter(m => m.provider === selectedProvider)

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold">🤖 AI Article Generator</h1>
        <p className="text-sm text-slate-400">Multi-model · Claude · GPT-4o · DeepSeek · Gemini</p>
      </div>

      <div className="grid xl:grid-cols-[440px_1fr] gap-6 items-start">
        {/* ── Control Panel ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">

          {/* Model selector */}
          <div>
            <label className="form-label">AI Model</label>
            {/* Provider tabs */}
            <div className="flex gap-1 mb-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
              {PROVIDERS.map(p => (
                <button key={p} onClick={() => {
                    setSelectedProvider(p)
                    const first = MODELS.find(m => m.provider === p)
                    if (first) setForm(f => ({ ...f, model: first.id }))
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    selectedProvider === p
                      ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                  {p === 'Anthropic' ? '🟠' : p === 'OpenAI' ? '🟢' : p === 'DeepSeek' ? '🔵' : '🔴'} {p}
                </button>
              ))}
            </div>
            {/* Model list */}
            <div className="grid grid-cols-1 gap-1.5">
              {filteredModels.map(m => (
                <button key={m.id} onClick={() => setForm(f => ({ ...f, model: m.id }))}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                    form.model === m.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}>
                  <span className="text-base">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${form.model === m.id ? 'text-blue-700 dark:text-blue-300' : ''}`}>{m.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{m.env}</div>
                  </div>
                  {form.model === m.id && <span className="text-blue-500 text-sm">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="form-label">Topic / Idea *</label>
            <textarea value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              rows={3} className="form-input resize-none"
              placeholder="e.g. How quantum computing will disrupt cybersecurity by 2030"/>
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-select">
              {getCategories().map(c => <option key={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Length */}
          <div>
            <label className="form-label">Article Length</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {LENGTHS.map(([val, label]) => (
                <button key={val} onClick={() => setForm(f => ({ ...f, length: val }))}
                  className={`py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                    form.length === val
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                  }`}>
                  {val}<br/><span className="font-normal text-slate-400">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="form-label">Tone</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {TONES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                  className={`py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                    form.tone === t
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="form-label">Keywords</label>
            <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={addKw}
              className="form-input text-sm mb-2" placeholder="Type keyword + Enter"/>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full">
                  {kw}
                  <button onClick={() => setKeywords(k => k.filter(x => x !== kw))} className="text-slate-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="form-label">Language</label>
            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="form-select">
              {['English','Spanish','French','German','Arabic','Portuguese','Italian','Japanese'].map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <button onClick={generate} disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50">
            {loading ? <><Spinner size="sm"/> Generating...</> : `✨ Generate with ${selectedModel.label}`}
          </button>
          <button onClick={() => { setResult(null); setLog([]); setForm(f => ({ ...f, topic: '' })); setKeywords([]) }}
            className="btn-outline w-full justify-center text-sm py-2">
            🗑️ Clear
          </button>

          {/* Log */}
          {log.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
              {log.map(l => (
                <div key={l.id} className={`text-xs font-mono mb-0.5 ${l.type==='success'?'text-green-400':l.type==='error'?'text-red-400':'text-blue-300'}`}>
                  {l.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Result panel ── */}
        <div>
          {loading && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-12 h-12 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" style={{borderWidth:3}}/>
              <p className="font-semibold text-blue-600 mb-1">{status || 'Generating...'}</p>
              <p className="text-sm text-slate-400">Using {selectedModel.label} · may take 15–60s</p>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
              <div className="text-5xl mb-4">🤖</div>
              <p className="font-semibold mb-1">Multi-Model AI Generator</p>
              <p className="text-sm mb-4">Select a model, fill in the form, and click Generate</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {PROVIDERS.map(p => (
                  <span key={p} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-3 py-1 rounded-full">
                    {p === 'Anthropic' ? '🟠' : p === 'OpenAI' ? '🟢' : p === 'DeepSeek' ? '🔵' : '🔴'} {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="font-display text-xl font-bold leading-snug flex-1">{result.title}</h2>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={publish} disabled={publishing} className="btn-primary text-xs py-1.5 px-3">
                      {publishing ? '⏳' : '✅ Publish'}
                    </button>
                    <button onClick={sendToEditor} className="btn-outline text-xs py-1.5 px-3">✏️ Edit</button>
                    <button onClick={generate}    className="btn-outline text-xs py-1.5 px-3">🔄</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CatBadge category={result.category}/>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">
                    {selectedModel.icon} {selectedModel.label}
                  </span>
                  {result.tags?.map(t => (
                    <span key={t} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
              </div>

              {result.cover_image && <img src={result.cover_image} alt="" className="w-full h-48 object-cover"/>}

              {result.excerpt && (
                <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 italic">
                  {result.excerpt}
                </div>
              )}

              <div className="p-5 max-h-80 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: result.content }}/>

              {(result.seo_title || result.seo_description) && (
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">SEO Preview</p>
                  <p className="text-sm font-semibold text-blue-600 mb-1">{result.seo_title}</p>
                  <p className="text-xs text-slate-500">{result.seo_description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
