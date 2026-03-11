// src/pages/admin/Categories.jsx
import { useState, useEffect } from 'react'
import { toast } from '../../components/shared'

const DEFAULT_CATEGORIES = [
  { name: 'Technology',    color: '#1E73FF', icon: '💻' },
  { name: 'Science',       color: '#7C3AED', icon: '🔬' },
  { name: 'Business',      color: '#059669', icon: '📈' },
  { name: 'Health',        color: '#DC2626', icon: '❤️' },
  { name: 'Lifestyle',     color: '#D97706', icon: '🌿' },
  { name: 'Travel',        color: '#0891B2', icon: '✈️' },
  { name: 'Entertainment', color: '#DB2777', icon: '🎬' },
]

const PRESET_COLORS = [
  '#1E73FF','#7C3AED','#059669','#DC2626','#D97706',
  '#0891B2','#DB2777','#0F172A','#EA580C','#65A30D',
]

const PRESET_ICONS = ['💻','🔬','📈','❤️','🌿','✈️','🎬','🎵','📚','🍔','⚽','🏠','💡','🌍','🎨']

const STORAGE_KEY = 'nexus_categories'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES
  } catch { return DEFAULT_CATEGORIES }
}

function save(cats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats))
}

export default function Categories() {
  const [categories, setCategories] = useState(load)
  const [form, setForm]             = useState({ name: '', color: '#1E73FF', icon: '💻' })
  const [editing, setEditing]       = useState(null)   // index being edited
  const [deleteIdx, setDeleteIdx]   = useState(null)
  const [showIconPicker, setShowIconPicker] = useState(false)

  useEffect(() => { save(categories) }, [categories])

  const isDefault = (name) => DEFAULT_CATEGORIES.some(d => d.name === name)

  const handleAdd = () => {
    const name = form.name.trim()
    if (!name) { toast('Name is required', 'error'); return }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast('Category already exists', 'error'); return
    }
    setCategories(prev => [...prev, { name, color: form.color, icon: form.icon }])
    setForm({ name: '', color: '#1E73FF', icon: '💻' })
    toast(`✅ "${name}" added`, 'success')
  }

  const handleUpdate = () => {
    const name = form.name.trim()
    if (!name) { toast('Name is required', 'error'); return }
    const dup = categories.findIndex((c, i) => c.name.toLowerCase() === name.toLowerCase() && i !== editing)
    if (dup !== -1) { toast('Name already exists', 'error'); return }
    setCategories(prev => prev.map((c, i) => i === editing ? { ...c, ...form, name } : c))
    setEditing(null)
    setForm({ name: '', color: '#1E73FF', icon: '💻' })
    toast('✅ Category updated', 'success')
  }

  const startEdit = (idx) => {
    setEditing(idx)
    setForm({ ...categories[idx] })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm({ name: '', color: '#1E73FF', icon: '💻' })
  }

  const handleDelete = () => {
    const name = categories[deleteIdx]?.name
    setCategories(prev => prev.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
    toast(`🗑️ "${name}" removed`, 'success')
  }

  const handleReset = () => {
    setCategories(DEFAULT_CATEGORIES)
    save(DEFAULT_CATEGORIES)
    toast('🔄 Reset to defaults', 'success')
  }

  return (
    <div className="fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="text-sm text-slate-400">{categories.length} categories · used across articles</p>
        </div>
        <button onClick={handleReset}
          className="btn-outline text-xs py-1.5 px-3 text-slate-400 hover:text-slate-600">
          🔄 Reset to defaults
        </button>
      </div>

      {/* ── Add / Edit Form ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
        <h2 className="text-sm font-bold mb-4">{editing !== null ? '✏️ Edit Category' : '➕ Add Category'}</h2>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          {/* Name */}
          <div>
            <label className="form-label">Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (editing !== null ? handleUpdate() : handleAdd())}
              className="form-input"
              placeholder="e.g. Politics"
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="form-label">Icon</label>
            <div className="relative">
              <button
                onClick={() => setShowIconPicker(p => !p)}
                className="form-input w-16 text-center text-xl cursor-pointer hover:border-blue-500"
              >
                {form.icon}
              </button>
              {showIconPicker && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 grid grid-cols-5 gap-1 w-48">
                  {PRESET_ICONS.map(ic => (
                    <button key={ic} onClick={() => { setForm(f => ({ ...f, icon: ic })); setShowIconPicker(false) }}
                      className={`text-xl p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${form.icon === ic ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500' : ''}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="form-label">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border-2 border-slate-200 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
              />
              <div className="flex gap-1 flex-wrap max-w-[120px]">
                {PRESET_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-slate-400">Preview:</span>
          <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: form.color }}>
            {form.icon} {form.name || 'Category Name'}
          </span>
        </div>

        <div className="flex gap-2 mt-4">
          {editing !== null ? (
            <>
              <button onClick={handleUpdate} className="btn-primary text-sm py-2">✅ Save Changes</button>
              <button onClick={cancelEdit} className="btn-outline text-sm py-2">Cancel</button>
            </>
          ) : (
            <button onClick={handleAdd} className="btn-primary text-sm py-2">➕ Add Category</button>
          )}
        </div>
      </div>

      {/* ── Category List ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-400 gap-4">
          <div>Icon</div><div>Name</div><div>Color</div><div>Actions</div>
        </div>

        {categories.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No categories yet. Add one above.</div>
        )}

        {categories.map((cat, idx) => (
          <div key={cat.name + idx}
            className={`grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-3 gap-4 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors ${editing === idx ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>

            {/* Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: cat.color + '22' }}>
              {cat.icon}
            </div>

            {/* Name + badge */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm">{cat.name}</span>
              <span className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: cat.color }}>
                {cat.name}
              </span>
              {isDefault(cat.name) && (
                <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded-full">default</span>
              )}
            </div>

            {/* Color swatch */}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
                style={{ background: cat.color }} />
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">{cat.color}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              <button onClick={() => startEdit(idx)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                ✏️
              </button>
              <button onClick={() => setDeleteIdx(idx)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-red-500 hover:text-red-600 transition-colors">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        💡 Categories are saved in your browser. To persist across devices, connect a database.
      </p>

      {/* ── Delete Modal ── */}
      {deleteIdx !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">🗑️ Delete Category</h3>
            <p className="text-sm text-slate-500 mb-1">
              Delete <strong>"{categories[deleteIdx]?.name}"</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Existing articles with this category won't be affected, but new ones won't be able to use it.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteIdx(null)} className="btn-outline text-sm py-2">Cancel</button>
              <button onClick={handleDelete} className="btn-danger text-sm py-2">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
