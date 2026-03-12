import React, { useState, useEffect, useMemo } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import ConfirmDialog from '../Components/ConfirmDialog'
import Loader from '../Components/Loader'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteProductsBulk, getCategories } from '../api/endpoints'
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiSearchLine, RiCloseLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const NO_PRODUCT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="#f1f5f9"/><rect x="70" y="90" width="180" height="140" rx="12" fill="#e2e8f0"/><circle cx="130" cy="140" r="16" fill="#cbd5e1"/><path d="M90 210l45-45 36 36 28-28 31 37H90z" fill="#94a3b8"/><text x="160" y="268" text-anchor="middle" font-family="Arial" font-size="18" fill="#64748b">No Product Image</text></svg>`)}`
const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`
const ATTRIBUTE_PRESETS = [
  { key: 'Color', values: ['Black', 'White', 'Blue', 'Red', 'Green', 'Grey', 'Silver'] },
  { key: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'RAM', values: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
  { key: 'Storage', values: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
  { key: 'Material', values: ['Cotton', 'Polyester', 'Leather', 'Plastic', 'Metal', 'Wood', 'Glass'] },
  { key: 'Weight', values: [] },
  { key: 'Dimensions', values: [] },
  { key: 'Warranty', values: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years'] },
  { key: 'Brand', values: [] },
  { key: 'Model', values: [] },
]

const CUSTOM_ATTRIBUTE = { key: '', value: '', isCustom: true }

const EMPTY_FORM = {
  name:'', sku:'', barcode:'', categoryId:'', subcategoryId:'', price:'', mrp:'', cost:'', gstRate:'18',
  stock:'', unit:'pcs', description:'', brand:'', images:[], attributes:[CUSTOM_ATTRIBUTE]
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFiles, setImageFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const filePreviews = useMemo(
    () => imageFiles.map((file) => ({ src: URL.createObjectURL(file), type: 'file', name: file.name })),
    [imageFiles]
  )

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.src))
    }
  }, [filePreviews])

  const normalizeImages = (imagesValue) => {
    if (!imagesValue) return []
    if (Array.isArray(imagesValue)) return imagesValue.filter(Boolean).slice(0, 5)
    if (typeof imagesValue === 'string') {
      try {
        const parsed = JSON.parse(imagesValue)
        return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : []
      } catch {
        return imagesValue ? [imagesValue] : []
      }
    }
    return []
  }

  const resolveImage = (image) => {
    if (!image) return NO_PRODUCT_IMAGE
    if (image.startsWith('/uploads/')) return `${UPLOADS_BASE_URL}${image}`
    return image
  }

  const normalizeAttributes = (attributesValue) => {
    if (!attributesValue) return [CUSTOM_ATTRIBUTE]

    const presetMap = new Map(ATTRIBUTE_PRESETS.map((preset) => [preset.key.toLowerCase(), preset]))

    if (Array.isArray(attributesValue)) {
      const mapped = attributesValue
        .map((item) => ({
          key: String(item?.key || item?.name || '').trim(),
          value: typeof item?.value === 'undefined' || item?.value === null ? '' : String(item.value),
          isCustom: !presetMap.has(String(item?.key || item?.name || '').trim().toLowerCase()),
        }))
        .filter((item) => item.key)

      return mapped.length ? mapped : [CUSTOM_ATTRIBUTE]
    }

    if (typeof attributesValue === 'object') {
      const mapped = Object.entries(attributesValue)
        .map(([key, value]) => {
          const trimmedKey = String(key || '').trim()
          return {
            key: trimmedKey,
            value: value === null || typeof value === 'undefined' ? '' : String(value),
            isCustom: !presetMap.has(trimmedKey.toLowerCase()),
          }
        })
        .filter((item) => item.key)

      return mapped.length ? mapped : [CUSTOM_ATTRIBUTE]
    }

    return [CUSTOM_ATTRIBUTE]
  }

  const addPresetAttribute = () => {
    const used = new Set((form.attributes || []).map((item) => String(item.key || '').toLowerCase()))
    const candidate = ATTRIBUTE_PRESETS.find((preset) => !used.has(preset.key.toLowerCase())) || ATTRIBUTE_PRESETS[0]
    setForm((prev) => ({
      ...prev,
      attributes: [...(prev.attributes || []), { key: candidate.key, value: candidate.values?.[0] || '', isCustom: false }]
    }))
  }

  const addCustomAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...(prev.attributes || []), { ...CUSTOM_ATTRIBUTE }]
    }))
  }

  const toUiProduct = (product) => {
    const imagesList = normalizeImages(product.images)
    return {
      ...product,
      categoryName: product.category_name || product.categoryName || '',
      stock: Number(product.stock_quantity ?? product.stock ?? 0),
      price: Number(product.current_price ?? product.price ?? 0),
      gstRate: Number(product.tax_rate ?? product.gstRate ?? 0),
      images: imagesList,
      attributes: normalizeAttributes(product.attributes || product.attributes_map),
      image: resolveImage(imagesList[0] || ''),
    }
  }

  const load = () => {
    Promise.all([getProducts({ limit: 500 }), getCategories()])
      .then(([p, c]) => {
        const productsList = p.data?.data?.products || []
        const categoriesList = c.data?.data || []
        setProducts(Array.isArray(productsList) ? productsList.map(toUiProduct) : [])
        setCats(Array.isArray(categoriesList) ? categoriesList : [])
      })
      .catch(() => { setProducts([]); setCats([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const openAdd = () => { setEditing(null); setImageFiles([]); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = async (p) => {
    try {
      const response = await getProduct(p.id)
      const fullProduct = response.data?.data || p
      const existingImages = normalizeImages(fullProduct.images || fullProduct.image)
      setEditing(p)
      setImageFiles([])
      setForm({
        ...EMPTY_FORM,
        ...fullProduct,
        images: existingImages,
        attributes: normalizeAttributes(fullProduct.attributes || fullProduct.attributes_map),
        categoryId: fullProduct.category_id || fullProduct.categoryId || ''
      })
      setModal(true)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load product details')
    }
  }

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const validFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!validFiles.length) {
      toast.error('Please select valid image files')
      return
    }

    setImageFiles((prev) => {
      const urlCount = normalizeImages(form.images).length
      const availableSlots = Math.max(0, 5 - urlCount - prev.length)
      const filesToAdd = validFiles.slice(0, availableSlots)
      if (!filesToAdd.length) {
        toast.error('Maximum 5 images allowed (URLs + files)')
        return prev
      }
      toast.success(`${filesToAdd.length} image(s) added`)
      return [...prev, ...filesToAdd]
    })

    event.target.value = ''
  }

  const save = async () => {
    setSaving(true)
    try {
      const selectedImages = normalizeImages(form.images)
      const attributes = (form.attributes || [])
        .map((item) => ({ key: String(item?.key || '').trim(), value: String(item?.value || '').trim() }))
        .filter((item) => item.key && item.value)

      if ((selectedImages.length + imageFiles.length) > 5) {
        toast.error('You can set maximum 5 images per product')
        setSaving(false)
        return
      }

      const formData = new FormData()
      formData.append('name', form.name?.trim() || '')
      formData.append('sku', form.sku || '')
      formData.append('barcode', form.barcode || '')
      formData.append('category_id', form.categoryId ? Number(form.categoryId) : '')
      formData.append('subcategory_id', form.subcategoryId ? Number(form.subcategoryId) : '')
      formData.append('description', form.description || '')
      formData.append('unit', form.unit || 'pcs')
      formData.append('tax_rate', form.gstRate ? Number(form.gstRate) : 0)
      formData.append('attributes', JSON.stringify(attributes))
      formData.append('image_urls', JSON.stringify(selectedImages))
      imageFiles.slice(0, 5).forEach((file) => formData.append('image_files', file))

      if (editing) {
        await updateProduct(editing.id, formData)
        toast.success('Product updated')
      } else {
        await createProduct(formData)
        toast.success('Product added')
      }
      setImageFiles([])
      setModal(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    try { await deleteProduct(confirm.id); toast.success('Deleted'); load() } catch { toast.error('Failed') }
    setConfirm(null)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const removeBulk = async () => {
    if (!selectedIds.length) return
    setBulkDeleting(true)
    try {
      await deleteProductsBulk(selectedIds)
      toast.success(`${selectedIds.length} product(s) deleted`)
      setBulkConfirmOpen(false)
      clearSelection()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bulk delete failed')
    } finally {
      setBulkDeleting(false)
    }
  }

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
  const filteredIds = filtered.map((p) => p.id)
  const selectedFilteredCount = filteredIds.filter((id) => selectedIds.includes(id)).length
  const isAllFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedProducts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const paginatedIds = paginatedProducts.map((p) => p.id)
  const selectedOnPageCount = paginatedIds.filter((id) => selectedIds.includes(id)).length
  const isAllPageSelected = paginatedIds.length > 0 && selectedOnPageCount === paginatedIds.length
  const isSomePageSelected = selectedOnPageCount > 0 && selectedOnPageCount < paginatedIds.length

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      if (isAllPageSelected) {
        return prev.filter((id) => !paginatedIds.includes(id))
      }
      return Array.from(new Set([...prev, ...paginatedIds]))
    })
  }

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      if (isAllFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id))
      }
      return Array.from(new Set([...prev, ...filteredIds]))
    })
  }

  if (loading) return <div className="page-enter"><Header title="Products" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Products" subtitle={`${products.length} products total`} />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search Products</label>
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            onClick={() => setBulkConfirmOpen(true)}
            disabled={selectedIds.length === 0}
            className="btn-secondary border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiDeleteBinLine /> Delete Selected ({selectedIds.length})
          </button>
          {selectedIds.length > 0 && (
            <button onClick={clearSelection} className="btn-secondary">Clear Selection</button>
          )}
          {filtered.length > 0 && (
            <button onClick={toggleSelectAllFiltered} className="btn-secondary">
              {isAllFilteredSelected ? `Unselect Filtered (${filtered.length})` : `Select Filtered (${filtered.length})`}
            </button>
          )}
          <button onClick={openAdd} className="btn-primary ml-auto"><RiAddLine />Add Product</button>
        </div>

        {(filtered.length > pageSize || selectedFilteredCount > 0) && (
          <p className="text-xs text-slate-500 mb-3">
            Filtered selected: <span className="font-semibold text-slate-700">{selectedFilteredCount}</span> / {filtered.length}
          </p>
        )}
        <p className="text-xs text-indigo-600 mb-3">Bulk delete use karne ke liye left side Select checkbox tick karein.</p>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th w-16">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Select</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected
                      }}
                      onChange={toggleSelectAllOnPage}
                    />
                  </th>
                  <th className="table-th">S No</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Price</th>
                  <th className="table-th">MRP</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">GST</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedProducts.map((p, index) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="table-td text-slate-500 font-semibold">{((safePage - 1) * pageSize) + index + 1}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          <img src={p.image || NO_PRODUCT_IMAGE} onError={(e) => { e.currentTarget.src = NO_PRODUCT_IMAGE }} className="w-10 h-10 object-cover rounded-xl" alt="Product" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs">{p.sku}</td>
                    <td className="table-td"><span className="badge badge-blue">{p.categoryName}</span></td>
                    <td className="table-td font-bold text-emerald-600">₹{p.price?.toLocaleString('en-IN')}</td>
                    <td className="table-td text-slate-500 line-through text-xs">₹{p.mrp?.toLocaleString('en-IN')}</td>
                    <td className="table-td">
                      <span className={`badge ${p.stock > 10 ? 'badge-green' : p.stock > 0 ? 'badge-yellow' : 'badge-red'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="table-td">{p.gstRate}%</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600"><RiEditLine /></button>
                        <button onClick={() => setConfirm(p)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><RiDeleteBinLine /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <p className="text-sm text-slate-500">
            Page <span className="font-semibold text-slate-700">{safePage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                const pageNum = start + idx
                if (pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${pageNum === safePage ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name *</label>
            <input className="input-field" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Full product name" />
          </div>
          {[['sku','SKU'],['barcode','Barcode'],['brand','Brand']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{l}</label>
              <input className="input-field" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={l} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
            <select className="input-field" value={form.categoryId} onChange={e => setForm({...form,categoryId:e.target.value})}>
              <option value="">Select category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {[['price','Sale Price (₹)'],['mrp','MRP (₹)'],['cost','Cost Price (₹)']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{l}</label>
              <input className="input-field" type="number" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder="0.00" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">GST Rate</label>
            <select className="input-field" value={form.gstRate} onChange={e => setForm({...form,gstRate:e.target.value})}>
              {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Qty</label>
            <input className="input-field" type="number" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
            <select className="input-field" value={form.unit} onChange={e => setForm({...form,unit:e.target.value})}>
              {['pcs','kg','g','l','ml','box','pack'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Upload Images (Max 5)</label>
            <input className="input-field" type="file" multiple accept="image/*" onChange={handleImageUpload} />
            <p className="text-xs text-slate-400 mt-1">Total images: {normalizeImages(form.images).length + imageFiles.length}/5 (min 0, max 5)</p>
            {imageFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {imageFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== index))}
                      className="p-1 text-slate-500 hover:text-red-500"
                    >
                      <RiCloseLine />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 rounded-xl border border-slate-200 p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">Image Preview</p>
              <p className="text-xs text-slate-400">{normalizeImages(form.images).length + imageFiles.length}/5 selected</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[...normalizeImages(form.images).map((img, index) => ({ src: resolveImage(img), type: 'existing', index })), ...filePreviews.map((preview, index) => ({ ...preview, type: 'new', index }))]
                .slice(0, 5)
                .map((item, index) => (
                  <div key={`${item.type}-${index}`} className="relative h-20 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                    <img src={item.src} alt="Product preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = NO_PRODUCT_IMAGE }} />
                    <button
                      type="button"
                      onClick={() => {
                        if (item.type === 'existing') {
                          const next = normalizeImages(form.images).filter((_, idx) => idx !== item.index)
                          setForm((prev) => ({ ...prev, images: next }))
                          return
                        }
                        setImageFiles((prev) => prev.filter((_, idx) => idx !== item.index))
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/85"
                    >
                      <RiCloseLine className="text-[12px]" />
                    </button>
                  </div>
                ))}
              {Array.from({ length: Math.max(0, 5 - (normalizeImages(form.images).length + imageFiles.length)) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">Product Attributes</label>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs py-1.5" onClick={addPresetAttribute}>
                  <RiAddLine /> Add Selector
                </button>
                <button type="button" className="btn-secondary text-xs py-1.5" onClick={addCustomAttribute}>
                  <RiAddLine /> Add Custom
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {(form.attributes || []).map((attribute, index) => (
                <div key={`attr-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  {attribute.isCustom ? (
                    <input
                      className="input-field"
                      value={attribute.key}
                      onChange={(e) => {
                        const next = [...(form.attributes || [])]
                        next[index] = { ...next[index], key: e.target.value }
                        setForm({ ...form, attributes: next })
                      }}
                      placeholder="Custom key (e.g. Screen Type)"
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={attribute.key}
                      onChange={(e) => {
                        const key = e.target.value
                        const preset = ATTRIBUTE_PRESETS.find((item) => item.key === key)
                        const next = [...(form.attributes || [])]
                        next[index] = {
                          ...next[index],
                          key,
                          value: preset?.values?.length ? (preset.values.includes(next[index].value) ? next[index].value : preset.values[0]) : next[index].value,
                          isCustom: false,
                        }
                        setForm({ ...form, attributes: next })
                      }}
                    >
                      {ATTRIBUTE_PRESETS.map((preset) => (
                        <option key={preset.key} value={preset.key}>{preset.key}</option>
                      ))}
                    </select>
                  )}

                  {(() => {
                    const preset = ATTRIBUTE_PRESETS.find((item) => item.key === attribute.key)
                    const hasSelectorValues = !attribute.isCustom && preset?.values?.length

                    if (hasSelectorValues) {
                      return (
                        <select
                          className="input-field"
                          value={attribute.value}
                          onChange={(e) => {
                            const next = [...(form.attributes || [])]
                            next[index] = { ...next[index], value: e.target.value }
                            setForm({ ...form, attributes: next })
                          }}
                        >
                          {preset.values.map((valueOption) => (
                            <option key={valueOption} value={valueOption}>{valueOption}</option>
                          ))}
                        </select>
                      )
                    }

                    return (
                      <input
                        className="input-field"
                        value={attribute.value}
                        onChange={(e) => {
                          const next = [...(form.attributes || [])]
                          next[index] = { ...next[index], value: e.target.value }
                          setForm({ ...form, attributes: next })
                        }}
                        placeholder={attribute.isCustom ? 'Custom value' : `Value for ${attribute.key || 'attribute'}`}
                      />
                    )
                  })()}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const next = (form.attributes || []).filter((_, idx) => idx !== index)
                      setForm({ ...form, attributes: next.length ? next : [CUSTOM_ATTRIBUTE] })
                    }}
                  >
                    <RiCloseLine />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Selector se common attributes fast add karein; Add Custom se manual attributes bhi add kar sakte hain.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving||!form.name} className="btn-primary">{saving?'Saving...':'Save Product'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove}
        title="Delete Product" message={`Delete "${confirm?.name}"? All stock batches will be removed.`} />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={removeBulk}
        title="Delete Selected Products"
        message={`Delete ${selectedIds.length} selected product(s)? This is a soft delete and products will be marked inactive.`}
        loading={bulkDeleting}
      />
    </div>
  )
}

