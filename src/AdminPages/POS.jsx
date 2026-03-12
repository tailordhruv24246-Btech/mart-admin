import React, { useState, useEffect, useRef, useMemo } from 'react'
import Header from '../Components/Header'
import { getPOSProducts, createPOSSale } from '../api/endpoints'
import { UPLOADS_BASE_URL } from '../api/config'
import { RiSearchLine, RiAddLine, RiSubtractLine, RiDeleteBinLine, RiPrinterLine, RiBarcodeLine, RiShoppingCartLine, RiCloseLine, RiUserLine, RiPhoneLine } from 'react-icons/ri'
import toast from 'react-hot-toast'
import { openWhatsAppMessage } from '../utils/whatsapp'

const NO_PRODUCT_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180"><rect width="240" height="180" fill="#f1f5f9"/><rect x="20" y="20" width="200" height="140" rx="14" fill="#e2e8f0"/><circle cx="88" cy="76" r="14" fill="#cbd5e1"/><path d="M44 134l34-34 28 28 18-18 32 24H44z" fill="#94a3b8"/></svg>`)}`

export default function POS() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [barcode, setBarcode] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [discount, setDiscount] = useState(0)
  const [customer, setCustomer] = useState({ name:'Walk-in', phone:'' })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const searchRef = useRef()
  const barcodeRef = useRef()
  const customerNameRef = useRef()
  const checkoutBtnRef = useRef()

  const normalizeImages = (imagesValue) => {
    if (!imagesValue) return []
    if (Array.isArray(imagesValue)) {
      return imagesValue
        .map((item) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
        .filter(Boolean)
        .slice(0, 5)
    }
    if (typeof imagesValue === 'object') {
      const directUrl = imagesValue?.url || imagesValue?.src
      return directUrl ? [directUrl] : []
    }
    if (typeof imagesValue === 'string') {
      try {
        const parsed = JSON.parse(imagesValue)
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
            .filter(Boolean)
            .slice(0, 5)
        }
        if (parsed && typeof parsed === 'object') {
          const parsedUrl = parsed?.url || parsed?.src
          if (parsedUrl) return [parsedUrl]
        }
        return imagesValue ? [imagesValue] : []
      } catch {
        const splitValues = imagesValue
          .split(',')
          .map((part) => String(part || '').trim())
          .filter(Boolean)
        return splitValues.length ? splitValues.slice(0, 5) : []
      }
    }
    return []
  }

  const resolveImage = (image) => {
    if (!image) return NO_PRODUCT_IMAGE
    if (image.startsWith('/uploads/')) return `${UPLOADS_BASE_URL}${image}`
    if (image.startsWith('uploads/')) return `${UPLOADS_BASE_URL}/${image}`
    return image
  }

  const toUiProduct = (product) => {
    const rawImages = product.images ?? product.image_urls ?? product.image_url ?? product.image
    const images = normalizeImages(rawImages).map(resolveImage)

    return {
      ...product,
      price: Number(product.current_price ?? product.price ?? 0),
      mrp: Number(product.mrp ?? 0),
      stock: Number(product.stock_quantity ?? product.stock ?? 0),
      gstRate: Number(product.tax_rate ?? product.gstRate ?? 0),
      unit: product.unit || 'pcs',
      categoryName: product.category_name || product.categoryName || 'Uncategorized',
      subcategoryName: product.subcategory_name || product.subcategoryName || '',
      images,
      image: images[0] || NO_PRODUCT_IMAGE,
    }
  }

  useEffect(() => {
    getPOSProducts({ is_active: 1, limit: 500 })
      .then((r) => {
        const productsList = r.data?.data?.products || []
        setProducts(Array.isArray(productsList) ? productsList.map(toUiProduct) : [])
      })
      .catch((error) => {
        setProducts([])
        toast.error(error?.response?.data?.message || 'Failed to load products')
      })
      .finally(() => setLoading(false))
  }, [])

  const categoryOptions = useMemo(() => {
    const map = new Map()
    products.forEach((product) => {
      if (!product.category_id) return
      if (!map.has(String(product.category_id))) {
        map.set(String(product.category_id), { id: String(product.category_id), name: product.categoryName || 'Category' })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const categoryQuickOptions = useMemo(() => {
    const counts = new Map()
    products.forEach((product) => {
      if (!product.category_id) return
      const key = String(product.category_id)
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    return categoryOptions.map((category) => ({
      ...category,
      count: counts.get(category.id) || 0,
    }))
  }, [products, categoryOptions])

  const subcategoryOptions = useMemo(() => {
    const map = new Map()
    products.forEach((product) => {
      if (!product.subcategory_id) return
      if (selectedCategory && String(product.category_id) !== selectedCategory) return
      if (!map.has(String(product.subcategory_id))) {
        map.set(String(product.subcategory_id), { id: String(product.subcategory_id), name: product.subcategoryName || 'Sub Category' })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [products, selectedCategory])

  const subcategoryQuickOptions = useMemo(() => {
    const counts = new Map()
    products.forEach((product) => {
      if (!product.subcategory_id) return
      if (selectedCategory && String(product.category_id) !== selectedCategory) return
      const key = String(product.subcategory_id)
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    return subcategoryOptions.map((subcategory) => ({
      ...subcategory,
      count: counts.get(subcategory.id) || 0,
    }))
  }, [products, subcategoryOptions, selectedCategory])

  useEffect(() => {
    setSelectedSubCategory('')
  }, [selectedCategory])

  const filtered = products.filter((p) => {
    if (selectedCategory && String(p.category_id) !== selectedCategory) return false
    if (selectedSubCategory && String(p.subcategory_id) !== selectedSubCategory) return false
    if (!search) return true
    const query = search.toLowerCase()
    return p.name.toLowerCase().includes(query)
      || p.sku.toLowerCase().includes(query)
      || p.barcode?.includes(search)
      || String(p.categoryName || '').toLowerCase().includes(query)
      || String(p.subcategoryName || '').toLowerCase().includes(query)
  })

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === product.id)
      if (ex) {
        if (ex.qty >= product.stock) { toast.error('Out of stock'); return prev }
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      }
      if (product.stock <= 0) { toast.error('Out of stock'); return prev }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) { removeItem(id); return }
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c))
  }

  const removeItem = (id) => setCart(prev => prev.filter(c => c.id !== id))

  const handleBarcode = (e) => {
    if (e.key === 'Enter') {
      const p = products.find(p => p.barcode === barcode)
      if (p) { addToCart(p); setBarcode(''); toast.success(`Added: ${p.name}`) }
      else toast.error(`Product not found: ${barcode}`)
    }
  }

  // Calculations
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const gstBreakdown = cart.reduce((acc, c) => {
    const rate = c.gstRate || 0
    const base = (c.price * c.qty) / (1 + rate/100)
    const gst = c.price * c.qty - base
    acc[rate] = (acc[rate] || 0) + gst
    return acc
  }, {})
  const discountAmt = (subtotal * discount) / 100
  const grandTotal = subtotal - discountAmt

  const checkout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    try {
      const saleData = {
        customer_id: null,
        items: cart.map(c => ({ product_id: c.id, quantity: c.qty, tax_rate: c.gstRate || 0 })),
        payment_method: payMethod.toLowerCase(),
        paid_amount: grandTotal,
        notes: customer.phone ? `Customer: ${customer.name} (${customer.phone})` : `Customer: ${customer.name}`,
      }
      const response = await createPOSSale(saleData)
      const invoice = response.data?.data

      setLastSale({
        invoiceNo: invoice?.sale_number,
        paymentMethod: invoice?.payment_method || payMethod,
        subtotal: invoice?.subtotal ?? subtotal,
        discount: discountAmt,
        grandTotal: invoice?.total_amount ?? grandTotal,
        customer,
        items: cart,
      })
      setInvoiceModal(true)
      setCart([])
      setDiscount(0)
      toast.success('Sale completed! 🎉')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Sale failed')
    }
  }

  const printInvoice = () => window.print()

  const sendPosBillOnWhatsApp = () => {
    if (!lastSale) return

    const itemsBlock = (lastSale.items || [])
      .map((item) => `• ${item.name} x${item.qty} = ₹${(item.price * item.qty).toLocaleString('en-IN')}`)
      .join('\n')

    const message = [
      `Hello ${lastSale.customer?.name || 'Customer'},`,
      '',
      `Your POS bill is ready ✅`,
      `Invoice: ${lastSale.invoiceNo || '-'}`,
      `Amount: ₹${Number(lastSale.grandTotal || 0).toLocaleString('en-IN')}`,
      `Payment: ${lastSale.paymentMethod || '-'}`,
      '',
      'Items:',
      itemsBlock || '• Items details available on request',
      '',
      'Thank you for shopping with us 🙏',
    ].join('\n')

    const sent = openWhatsAppMessage(lastSale.customer?.phone, message)
    if (sent) toast.success('WhatsApp opened with bill message')
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key?.toLowerCase()

      if (event.ctrlKey && key === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (event.ctrlKey && key === 'b') {
        event.preventDefault()
        barcodeRef.current?.focus()
        return
      }

      if (event.altKey && key === 'c') {
        event.preventDefault()
        customerNameRef.current?.focus()
        return
      }

      if (event.altKey && key === 'p') {
        event.preventDefault()
        const methods = ['Cash', 'UPI', 'Card', 'COD']
        const currentIndex = methods.indexOf(payMethod)
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % methods.length : 0
        setPayMethod(methods[nextIndex])
        return
      }

      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        checkoutBtnRef.current?.click()
        return
      }

      if (event.key === 'Escape') {
        setSearch('')
        setBarcode('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [payMethod])

  return (
    <div className="page-enter h-screen flex flex-col overflow-hidden">
      <Header title="POS System" subtitle="Point of Sale" />
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          <div className="p-4 bg-white border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search Products</label>
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} className="input-field pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode</label>
              <RiBarcodeLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={barcodeRef} className="input-field pl-9 w-48" placeholder="Scan barcode..." value={barcode}
                onChange={e => setBarcode(e.target.value)} onKeyDown={handleBarcode} />
            </div>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-2">Quick Categories</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    All
                  </button>
                  {categoryQuickOptions.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedCategory === category.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {category.name} ({category.count})
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="btn-secondary text-xs py-2 px-3 whitespace-nowrap"
                onClick={() => {
                  setSelectedCategory('')
                  setSelectedSubCategory('')
                  setSearch('')
                }}
              >
                Clear
              </button>
            </div>
          </div>
          {selectedCategory && (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 mb-2">Quick Sub Categories</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSubCategory('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selectedSubCategory ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  All
                </button>
                {subcategoryQuickOptions.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => setSelectedSubCategory(subcategory.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedSubCategory === subcategory.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                    {subcategory.name} ({subcategory.count})
                  </button>
                ))}
                {!subcategoryQuickOptions.length && (
                  <span className="text-xs text-slate-500">No sub categories found in selected category</span>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
            {filtered.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="pos-item-card p-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                    <img src={p.image || p.images?.[0] || NO_PRODUCT_IMAGE} onError={(e) => { e.currentTarget.src = NO_PRODUCT_IMAGE }} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold truncate">{p.categoryName || 'Category'}</p>
                    <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 mt-0.5">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{p.sku || '-'}</p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-indigo-600 text-sm">₹{p.price?.toLocaleString('en-IN')}</p>
                    {p.mrp > p.price && <p className="text-[10px] text-slate-400 line-through">₹{p.mrp?.toLocaleString('en-IN')}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${p.stock > 5 ? 'text-emerald-600' : p.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.stock} {p.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">Tap to add</p>
                  </div>
                </div>
              </div>
            ))}

            {!filtered.length && (
              <div className="col-span-full text-center py-10 text-slate-500">
                No products found for selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-96 flex flex-col bg-white overflow-hidden">
          {/* Customer */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Customer</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1"><RiUserLine className="inline mr-1" />Name</label>
                <input ref={customerNameRef} className="input-field text-sm" placeholder="Name" value={customer.name} onChange={e => setCustomer({...customer,name:e.target.value})} />
              </div>
              <div className="w-32">
                <label className="block text-xs text-slate-500 mb-1"><RiPhoneLine className="inline mr-1" />Phone</label>
                <input className="input-field text-sm" placeholder="Phone" value={customer.phone} onChange={e => setCustomer({...customer,phone:e.target.value})} />
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                <RiShoppingCartLine className="text-5xl mb-2" />
                <p className="text-sm">Cart is empty</p>
              </div>
            )}
            {cart.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">₹{c.price} × {c.qty} = <strong className="text-slate-700">₹{(c.price*c.qty).toLocaleString('en-IN')}</strong></p>
                  <p className="text-xs text-slate-400">GST {c.gstRate}%</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(c.id, c.qty-1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"><RiSubtractLine className="text-sm" /></button>
                  <span className="w-8 text-center text-sm font-bold">{c.qty}</span>
                  <button onClick={() => updateQty(c.id, c.qty+1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"><RiAddLine className="text-sm" /></button>
                </div>
                <button onClick={() => removeItem(c.id)} className="text-red-400 hover:text-red-600 p-1"><RiDeleteBinLine /></button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-slate-100 p-4 space-y-3">
            {/* GST Breakdown */}
            {Object.entries(gstBreakdown).filter(([,v]) => v > 0).map(([r,v]) => (
              <div key={r} className="flex justify-between text-xs text-slate-500">
                <span>GST @{r}%</span><span>₹{v.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Discount %</label>
              <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Math.min(100,+e.target.value))}
                className="input-field w-20 text-sm py-1.5" />
              {discount > 0 && <span className="text-sm text-red-500">-₹{discountAmt.toFixed(0)}</span>}
            </div>
            <div className="flex justify-between text-xl font-black text-slate-900 pt-1 border-t border-slate-100">
              <span>Total</span><span>₹{grandTotal.toFixed(0)}</span>
            </div>

            {/* Payment Method */}
            <div className="flex gap-2">
              {['Cash','UPI','Card','COD'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${payMethod===m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{m}</button>
              ))}
            </div>

            <button ref={checkoutBtnRef} onClick={checkout} disabled={cart.length===0}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors disabled:opacity-40">
              Checkout — ₹{grandTotal.toFixed(0)}
            </button>
          </div>
        </div>
      </div>

      <div className="h-11 bg-slate-900 border-t border-slate-700 px-3 flex items-center">
        <div className="w-full overflow-x-auto">
          <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-slate-200">
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Ctrl+F: Search</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Ctrl+B: Barcode</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Alt+C: Customer</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Alt+P: Payment</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Ctrl+Enter: Checkout</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Enter: Scan Add</span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Esc: Clear Search</span>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {invoiceModal && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold">Invoice — {lastSale.invoiceNo}</h2>
              <button onClick={() => setInvoiceModal(false)} className="p-2 rounded-xl hover:bg-slate-100"><RiCloseLine /></button>
            </div>
            <div className="p-6 print-invoice" id="invoice">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-black text-indigo-600">MartAdmin</h1>
                <p className="text-xs text-slate-500 mt-1">Tax Invoice</p>
              </div>
              <div className="text-xs text-slate-600 space-y-1 mb-4">
                <div className="flex justify-between"><span>Invoice No:</span><strong>{lastSale.invoiceNo}</strong></div>
                <div className="flex justify-between"><span>Date:</span><strong>{new Date().toLocaleDateString()}</strong></div>
                <div className="flex justify-between"><span>Customer:</span><strong>{lastSale.customer?.name}</strong></div>
                <div className="flex justify-between"><span>Payment:</span><strong>{lastSale.paymentMethod}</strong></div>
              </div>
              <table className="w-full text-xs mb-4">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">GST</th>
                    <th className="text-right py-2">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSale.items?.map((c, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-1.5">{c.name}</td>
                      <td className="text-right">{c.qty}</td>
                      <td className="text-right">₹{c.price}</td>
                      <td className="text-right">{c.gstRate}%</td>
                      <td className="text-right">₹{c.price*c.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-xs border-t border-slate-200 pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{lastSale.subtotal?.toFixed(2)}</span></div>
                {lastSale.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-₹{lastSale.discount?.toFixed(2)}</span></div>}
                <div className="flex justify-between font-black text-base pt-1"><span>TOTAL</span><span>₹{lastSale.grandTotal?.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={printInvoice} className="btn-primary flex-1 justify-center"><RiPrinterLine />Print Invoice</button>
              <button onClick={sendPosBillOnWhatsApp} className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700">Send Bill on WhatsApp</button>
              <button onClick={() => setInvoiceModal(false)} className="btn-secondary flex-1 justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
