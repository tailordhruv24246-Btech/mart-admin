import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import ConfirmDialog from '../Components/ConfirmDialog'
import Loader from '../Components/Loader'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/endpoints'
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiApps2Line, RiSearchLine, RiStackLine, RiImageLine, RiCloseLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const NO_CATEGORY_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#eef2ff"/><rect x="30" y="38" width="100" height="78" rx="10" fill="#c7d2fe"/><circle cx="62" cy="68" r="10" fill="#a5b4fc"/><path d="M40 112l26-26 20 20 16-16 18 22H40z" fill="#818cf8"/><text x="80" y="142" text-anchor="middle" font-family="Arial" font-size="10" fill="#4f46e5">Category</text></svg>`)}`
const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`

export default function Categories() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', image: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)

  const resolveImageSrc = (image) => {
    if (!image) return NO_CATEGORY_IMAGE
    if (image.startsWith('/uploads/')) return `${UPLOADS_BASE_URL}${image}`
    return image
  }

  const normalizeCategory = (category) => ({
    ...category,
    productCount: Number(category.product_count ?? category.productsCount ?? 0),
    subcategoryCount: Number(category.subcategory_count ?? category.subcategoriesCount ?? 0),
  })

  const load = async () => {
    try {
      const r = await getCategories()
      const categories = r.data?.data || []
      setCats(Array.isArray(categories) ? categories.map(normalizeCategory) : [])
    } catch (error) {
      setCats([])
      toast.error(error?.response?.data?.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    const previewUrl = URL.createObjectURL(file)

    setImageFile(file)
    setForm((prev) => ({ ...prev, image: '' }))
    setImagePreview(previewUrl)
    toast.success('Image selected')
    event.target.value = ''
  }

  const clearSelectedImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    setForm((prev) => ({ ...prev, image: '' }))
  }

  const openAdd = () => {
    setEditing(null)
    setImageFile(null)
    setImagePreview('')
    setForm({ name:'', description:'', image:'' })
    setModal(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setImageFile(null)
    setImagePreview(resolveImageSrc(c.image || ''))
    setForm({ name:c.name, description:c.description||'', image:c.image||'' })
    setModal(true)
  }

  const save = async () => {
    const trimmedName = form.name?.trim()
    if (!trimmedName) {
      toast.error('Category name is required')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', trimmedName)
      formData.append('description', form.description || '')
      formData.append('image', form.image || '')
      if (imageFile) formData.append('image_file', imageFile)

      if (editing) { await updateCategory(editing.id, formData); toast.success('Category updated') }
      else { await createCategory(formData); toast.success('Category created') }
      setImageFile(null)
      setImagePreview('')
      setModal(false); load()
    } catch (error) { toast.error(error?.response?.data?.message || 'Failed to save') } finally { setSaving(false) }
  }

  const remove = async () => {
    try { await deleteCategory(confirm.id); toast.success('Deleted'); load() } catch { toast.error('Failed') }
    setConfirm(null)
  }

  const filteredCategories = cats.filter((category) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    const searchable = [category.name, category.description].filter(Boolean).join(' ').toLowerCase()
    return searchable.includes(query)
  })

  const totalProducts = cats.reduce((sum, category) => sum + Number(category.productCount || 0), 0)

  if (loading) return <div className="page-enter"><Header title="Categories" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Categories" subtitle="Manage product categories" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <div className="card p-4">
            <p className="text-xs text-slate-500 font-semibold">Total Categories</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{cats.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 font-semibold">Total Products Tagged</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalProducts}</p>
          </div>
          <div className="card p-4 md:col-span-2 xl:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search Categories</label>
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by category name or description"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredCategories.length}</span> categories
          </p>
          <button onClick={openAdd} className="btn-primary"><RiAddLine />Add Category</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCategories.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {c.image
                    ? <img src={resolveImageSrc(c.image)} onError={(e) => { e.currentTarget.src = NO_CATEGORY_IMAGE }} alt={c.name} className="w-full h-full object-cover" />
                    : <img src={NO_CATEGORY_IMAGE} alt="Category" className="w-full h-full object-cover" />}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                    <RiEditLine />
                  </button>
                  <button onClick={() => setConfirm(c)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                    <RiDeleteBinLine />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-900">{c.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{c.description || 'No description added yet.'}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="badge badge-purple"><RiStackLine className="mr-1" />{c.productCount} products</span>
                <span className="badge badge-blue"><RiApps2Line className="mr-1" />{c.subcategoryCount} subcategories</span>
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="col-span-full card text-center py-10">
              <RiApps2Line className="text-4xl mx-auto text-slate-300 mb-2" />
              <p className="text-slate-700 font-semibold">No categories found</p>
              <p className="text-sm text-slate-500 mt-1">Try changing search text or add a new category.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
            <input className="input-field" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Category name" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Brief description" />
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/60">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Image</label>
            <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors">
              <RiImageLine className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Choose image file</span>
              <input className="hidden" type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
            <p className="text-xs text-slate-500 mt-2">Image upload karein (max 2MB).</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 bg-white">
            <p className="text-xs font-semibold text-slate-500 mb-2">Preview</p>
            <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
              <img src={imagePreview || resolveImageSrc(form.image) || NO_CATEGORY_IMAGE} onError={(e) => { e.currentTarget.src = NO_CATEGORY_IMAGE }} alt="Category preview" className="w-full h-full object-cover" />
              {(imagePreview || form.image) && (
                <button onClick={clearSelectedImage} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                  <RiCloseLine />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving||!form.name} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove}
        title="Delete Category" message={`Delete "${confirm?.name}"? This cannot be undone.`} />
    </div>
  )
}
