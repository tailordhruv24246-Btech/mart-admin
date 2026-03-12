import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import ConfirmDialog from '../Components/ConfirmDialog'
import Loader from '../Components/Loader'
import { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory, getCategories } from '../api/endpoints'
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiStackLine, RiImageLine, RiCloseLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const NO_SUBCATEGORY_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#eef2ff"/><rect x="20" y="26" width="80" height="58" rx="8" fill="#c7d2fe"/><circle cx="45" cy="48" r="8" fill="#a5b4fc"/><path d="M28 82l20-20 16 16 12-12 16 16H28z" fill="#818cf8"/></svg>`)}`
const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`

export default function SubCategories() {
  const [subs, setSubs] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', categoryId: '', image: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)

  const resolveImageSrc = (image) => {
    if (!image) return NO_SUBCATEGORY_IMAGE
    if (image.startsWith('/uploads/')) return `${UPLOADS_BASE_URL}${image}`
    return image
  }

  const normalizeSub = (sub) => ({
    ...sub,
    categoryId: sub.category_id || sub.categoryId,
    categoryName: sub.category_name || sub.categoryName,
  })

  const load = () => {
    Promise.all([getSubCategories(), getCategories()])
      .then(([s, c]) => {
        const subsList = s.data?.data || []
        const catsList = c.data?.data || []
        setSubs(Array.isArray(subsList) ? subsList.map(normalizeSub) : [])
        setCats(Array.isArray(catsList) ? catsList : [])
      })
      .catch(() => {
        setSubs([])
        setCats([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleImageUpload = (event) => {
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
    setImageFile(file)
    setForm((prev) => ({ ...prev, image: '' }))
    setImagePreview(URL.createObjectURL(file))
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
    setForm({ name:'', description:'', categoryId:'', image:'' })
    setModal(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setImageFile(null)
    setImagePreview(resolveImageSrc(s.image || ''))
    setForm({ name:s.name, description:s.description||'', categoryId:s.categoryId, image:s.image || '' })
    setModal(true)
  }

  const save = async () => {
    const trimmedName = form.name?.trim()
    if (!trimmedName || !form.categoryId) {
      toast.error('Parent category and sub-category name are required')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', trimmedName)
      formData.append('description', form.description || '')
      formData.append('category_id', form.categoryId || '')
      formData.append('image', form.image || '')
      if (imageFile) formData.append('image_file', imageFile)

      if (editing) { await updateSubCategory(editing.id, formData); toast.success('Updated') }
      else { await createSubCategory(formData); toast.success('Created') }
      setImageFile(null)
      setImagePreview('')
      setModal(false); load()
    } catch (error) { toast.error(error?.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const remove = async () => {
    try { await deleteSubCategory(confirm.id); toast.success('Deleted'); load() } catch { toast.error('Failed') }
    setConfirm(null)
  }

  if (loading) return <div className="page-enter"><Header title="Sub Categories" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Sub Categories" subtitle="Manage sub-categories" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{subs.length}</span> sub-categories
          </p>
          <button onClick={openAdd} className="btn-primary"><RiAddLine />Add Sub Category</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subs.map((sub) => (
            <div key={sub.id} className="card hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-32 -mx-5 -mt-5 mb-4 bg-slate-100">
                <img
                  src={resolveImageSrc(sub.image || '')}
                  onError={(e) => { e.currentTarget.src = NO_SUBCATEGORY_IMAGE }}
                  alt={sub.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 leading-tight">{sub.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(sub)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600"><RiEditLine /></button>
                  <button onClick={() => setConfirm(sub)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><RiDeleteBinLine /></button>
                </div>
              </div>
              <span className="badge badge-purple inline-flex mb-2">
                <RiStackLine className="mr-1" />{sub.categoryName || cats.find(c=>c.id===sub.categoryId)?.name || 'Unlinked'}
              </span>
              <p className="text-sm text-slate-500 line-clamp-2">{sub.description || 'No description added yet.'}</p>
            </div>
          ))}

          {subs.length === 0 && (
            <div className="col-span-full card text-center py-10">
              <RiStackLine className="text-4xl mx-auto text-slate-300 mb-2" />
              <p className="text-slate-700 font-semibold">No sub-categories found</p>
              <p className="text-sm text-slate-500 mt-1">Create your first sub-category with image.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Sub Category' : 'Add Sub Category'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Parent Category *</label>
            <select className="input-field" value={form.categoryId} onChange={e => setForm({...form,categoryId:e.target.value})}>
              <option value="">Select category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
            <input className="input-field" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Sub-category name" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
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
              <img src={imagePreview || resolveImageSrc(form.image || '')} onError={(e) => { e.currentTarget.src = NO_SUBCATEGORY_IMAGE }} alt="Subcategory preview" className="w-full h-full object-cover" />
              {(imagePreview || form.image) && (
                <button onClick={clearSelectedImage} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                  <RiCloseLine />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving||!form.name||!form.categoryId} className="btn-primary">{saving?'Saving...':'Save'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove}
        title="Delete Sub Category" message={`Delete "${confirm?.name}"?`} />
    </div>
  )
}
