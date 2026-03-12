import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import Loader from '../Components/Loader'
import { getPurchases, createPurchase, createPurchaseEntry, getSuppliers, getProducts } from '../api/endpoints'
import { RiAddLine, RiDeleteBinLine, RiFileExcel2Line, RiDownloadLine, RiUploadLine, RiCloseLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ supplierId:'', invoiceNo:'', invoiceDate:new Date().toISOString().slice(0,10), items:[] })
  const [entryMode, setEntryMode] = useState('form')
  const [importFile, setImportFile] = useState(null)
  const [importRows, setImportRows] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [saving, setSaving] = useState(false)

  const mapInvoice = (invoice) => ({
    id: invoice.id,
    invoiceNo: invoice.invoice_number,
    supplierName: invoice.supplier_name,
    itemsCount: 0,
    totalAmount: Number(invoice.total_amount || 0),
    status: invoice.payment_status || 'unpaid',
    date: invoice.invoice_date,
  })

  const mapProduct = (product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    price: Number(product.current_price ?? product.price ?? 0),
  })

  const load = () => {
    Promise.all([getPurchases(), getSuppliers(), getProducts({ is_active: 1, limit: 500 })])
      .then(([p, s, pr]) => {
        const purchasesList = p.data?.data || []
        const suppliersList = s.data?.data || []
        const productsList = pr.data?.data?.products || []

        setPurchases(Array.isArray(purchasesList) ? purchasesList.map(mapInvoice) : [])
        setSuppliers(Array.isArray(suppliersList) ? suppliersList : [])
        setProducts(Array.isArray(productsList) ? productsList.map(mapProduct) : [])
      })
      .catch((error) => {
        setPurchases([])
        setSuppliers([])
        setProducts([])
        toast.error(error?.response?.data?.message || 'Failed to load purchase data')
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const addItem = () => setForm(f => ({...f, items:[...f.items,{productId:'',qty:1,purchasePrice:'',sellingPrice:'',mrp:'',taxRate:0,batch:'',expiry:''}]}))
  const updateItem = (i, k, v) => setForm(f => ({...f, items: f.items.map((item,idx) => idx===i ? {...item,[k]:v} : item)}))
  const removeItem = (i) => setForm(f => ({...f, items: f.items.filter((_,idx) => idx!==i)}))

  const total = form.items.reduce((s,i) => s + ((+i.qty||0)*(+i.purchasePrice||0)), 0)

  const resetModalState = () => {
    setForm({ supplierId:'', invoiceNo:'', invoiceDate:new Date().toISOString().slice(0,10), items:[] })
    setEntryMode('form')
    setImportFile(null)
    setImportRows([])
    setPreviewRows([])
  }

  const parseExcel = async (file) => {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws)
  }

  const normalizeHeader = (key) => String(key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  const getRowValue = (row, aliases = []) => {
    const normalizedAliases = aliases.map(normalizeHeader)
    for (const [key, value] of Object.entries(row || {})) {
      if (normalizedAliases.includes(normalizeHeader(key))) return value
    }
    return undefined
  }

  const toNumber = (value, fallback = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
    const raw = String(value ?? '').trim()
    if (!raw) return fallback
    const cleaned = raw.replace(/,/g, '').replace(/[^0-9.-]/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = [[
      'productId', 'sku', 'name', 'qty', 'purchasePrice', 'sellingPrice', 'mrp', 'taxRate', 'batch', 'expiry'
    ]]
    const sample = [[
      '1', 'SAM-S24', 'Samsung Galaxy S24', '5', '65000', '79999', '84999', '18', 'BATCH-001', '2027-12-31'
    ]]
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PurchaseItems')
    XLSX.writeFile(wb, 'purchase_import_template.xlsx')
  }

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportFile(file)
    try {
      const rows = await parseExcel(file)
      setImportRows(Array.isArray(rows) ? rows : [])
      setPreviewRows(Array.isArray(rows) ? rows.slice(0, 5) : [])
      toast.success(`Loaded ${rows.length || 0} rows from Excel`)
    } catch {
      setImportRows([])
      setPreviewRows([])
      toast.error('Failed to parse Excel file')
    }
  }

  const resolveProductFromExcelRow = (row) => {
    const byId = getRowValue(row, ['productId', 'product_id', 'product id', 'id'])
    if (byId) {
      const foundById = products.find((product) => Number(product.id) === Number(byId))
      if (foundById) return foundById
    }

    const bySku = String(getRowValue(row, ['sku', 'product_sku', 'product sku']) ?? '').trim().toLowerCase()
    if (bySku) {
      const foundBySku = products.find((product) => String(product.sku || '').trim().toLowerCase() === bySku)
      if (foundBySku) return foundBySku
    }

    const byBarcode = String(getRowValue(row, ['barcode', 'bar_code', 'bar code']) ?? '').trim().toLowerCase()
    if (byBarcode) {
      const foundByBarcode = products.find((product) => String(product.barcode || '').trim().toLowerCase() === byBarcode)
      if (foundByBarcode) return foundByBarcode
    }

    const byName = String(getRowValue(row, ['name', 'productName', 'product_name', 'product name']) ?? '').trim().toLowerCase()
    if (byName) {
      const foundByName = products.find((product) => String(product.name || '').trim().toLowerCase() === byName)
      if (foundByName) return foundByName
    }

    return null
  }

  const normalizeItemsPayload = (rows) => {
    let invalidCount = 0

    const items = rows
    .map((row) => {
      const product = resolveProductFromExcelRow(row)
      const qty = toNumber(getRowValue(row, ['qty', 'quantity', 'qnty', 'qtypcs', 'stock', 'opening_stock', 'openingstock']), 0)
      const purchasePrice = toNumber(getRowValue(row, ['purchasePrice', 'purchase_price', 'buyRate', 'buy_rate', 'cost', 'cost_price']), 0)
      const sellingPrice = toNumber(getRowValue(row, ['sellingPrice', 'selling_price', 'sellRate', 'sell_rate', 'price', 'sale_price']), 0)

      if (!product || qty <= 0 || purchasePrice <= 0 || sellingPrice <= 0) {
        invalidCount += 1
        return null
      }

      return {
        product_id: Number(product.id),
        quantity: qty,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        mrp: toNumber(getRowValue(row, ['mrp']), 0) || null,
        tax_rate: toNumber(getRowValue(row, ['taxRate', 'tax_rate', 'gst', 'gstrate']), 0),
        expiry_date: getRowValue(row, ['expiry', 'expiry_date', 'expiry date']) || null,
        batch_number: getRowValue(row, ['batch', 'batch_number', 'batch no', 'batchno']) || null,
      }
    })
    .filter(Boolean)

    return { items, invalidCount }
  }

  const save = async () => {
    const sourceRows = entryMode === 'excel' ? importRows : form.items
    if (!form.supplierId || sourceRows.length === 0) { toast.error('Fill all required fields'); return }
    setSaving(true)
    try {
      const { items: itemsPayload, invalidCount } = normalizeItemsPayload(sourceRows)
      if (!itemsPayload.length) {
        throw new Error(`No valid purchase rows found. Valid columns: productId/sku/name/barcode, qty(or stock), purchasePrice(or cost), sellingPrice(or price). Invalid rows: ${invalidCount}`)
      }

      const computedSubtotal = itemsPayload.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0)
      const invoicePayload = {
        invoice_number: form.invoiceNo || `PUR-${Date.now()}`,
        supplier_id: Number(form.supplierId),
        invoice_date: form.invoiceDate,
        subtotal: computedSubtotal,
        total_amount: computedSubtotal,
      }

      const invoiceResponse = await createPurchase(invoicePayload)
      const invoiceId = invoiceResponse.data?.data?.id

      if (!invoiceId || itemsPayload.length === 0) {
        throw new Error('Invalid purchase data')
      }

      await createPurchaseEntry({ invoice_id: invoiceId, items: itemsPayload })
      toast.success(entryMode === 'excel' ? 'Purchase imported from Excel' : 'Purchase entry saved')
      setModal(false)
      resetModalState()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="page-enter"><Header title="Purchases" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Purchase Entry" subtitle="Record supplier purchases" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-2 justify-end mb-4">
          <button
            onClick={() => {
              resetModalState()
              setEntryMode('excel')
              setModal(true)
            }}
            className="btn-secondary"
          >
            <RiFileExcel2Line />Import via Excel
          </button>
          <button onClick={() => { resetModalState(); setEntryMode('form'); setModal(true) }} className="btn-primary"><RiAddLine />New Purchase</button>
        </div>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Invoice No</th>
                  <th className="table-th">Supplier</th>
                  <th className="table-th">Items</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!purchases.length && (
                  <tr>
                    <td className="table-td text-center text-slate-400" colSpan={6}>No purchases found.</td>
                  </tr>
                )}
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-td font-mono font-bold text-indigo-600">{p.invoiceNo}</td>
                    <td className="table-td font-medium">{p.supplierName}</td>
                    <td className="table-td">{p.itemsCount} items</td>
                    <td className="table-td font-bold">₹{p.totalAmount?.toLocaleString('en-IN')}</td>
                    <td className="table-td"><span className={`badge ${p.status==='paid'?'badge-green':'badge-yellow'}`}>{p.status}</span></td>
                    <td className="table-td text-slate-400">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase Entry" size="xl">
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntryMode('form')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${entryMode==='form' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Form Entry
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('excel')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${entryMode==='excel' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Excel Import
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier *</label>
              <select className="input-field" value={form.supplierId} onChange={e => setForm({...form,supplierId:e.target.value})}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Invoice No</label>
              <input className="input-field" value={form.invoiceNo} onChange={e => setForm({...form,invoiceNo:e.target.value})} placeholder="SUP-INV-001" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input className="input-field" type="date" value={form.invoiceDate} onChange={e => setForm({...form,invoiceDate:e.target.value})} />
            </div>
          </div>

          {entryMode === 'form' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Items</p>
                <button onClick={addItem} className="btn-primary text-xs py-1.5"><RiAddLine />Add Item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <select className="input-field text-sm py-2" value={item.productId} onChange={e => {
                        const selected = products.find((p) => String(p.id) === e.target.value)
                        updateItem(i, 'productId', e.target.value)
                        if (selected && !item.sellingPrice) updateItem(i, 'sellingPrice', selected.price)
                      }}>
                        <option value="">Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input className="input-field text-sm py-2" type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(i,'qty',e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input className="input-field text-sm py-2" type="number" placeholder="Buy Rate" value={item.purchasePrice} onChange={e => updateItem(i,'purchasePrice',e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input className="input-field text-sm py-2" type="number" placeholder="Sell Rate" value={item.sellingPrice} onChange={e => updateItem(i,'sellingPrice',e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <input className="input-field text-sm py-2" placeholder="Batch" value={item.batch} onChange={e => updateItem(i,'batch',e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <input className="input-field text-sm py-2" type="date" value={item.expiry} onChange={e => updateItem(i,'expiry',e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600"><RiDeleteBinLine /></button>
                    </div>
                  </div>
                ))}
                {form.items.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No items added yet</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Excel Import</p>
                <button type="button" onClick={downloadTemplate} className="btn-secondary text-xs py-1.5">
                  <RiDownloadLine /> Download Template
                </button>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                <RiFileExcel2Line className="text-4xl text-slate-300 mb-1" />
                <p className="text-slate-500 text-sm font-medium">{importFile ? importFile.name : 'Click to upload .xlsx file'}</p>
                <p className="text-slate-400 text-xs mt-1">Columns: productId/sku/name/barcode, qty(or stock), purchasePrice(or cost), sellingPrice(or price), mrp, taxRate, batch, expiry</p>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelFile} className="hidden" />
              </label>

              {previewRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Preview (first 5 rows)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>{Object.keys(previewRows[0]).map((key) => <th key={key} className="table-th">{key}</th>)}</tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-slate-50">
                            {Object.values(row).map((value, colIndex) => <td key={colIndex} className="table-td">{String(value ?? '')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Rows loaded: {importRows.length}</div>
                </div>
              )}

              {importFile && (
                <button type="button" onClick={() => { setImportFile(null); setImportRows([]); setPreviewRows([]) }} className="btn-secondary text-xs py-1.5">
                  <RiCloseLine /> Clear Excel
                </button>
              )}
            </div>
          )}

          {entryMode === 'form' && form.items.length > 0 && (
            <div className="text-right">
              <span className="text-lg font-black text-slate-900">Total: ₹{total.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? (entryMode === 'excel' ? 'Importing...' : 'Saving...') : (entryMode === 'excel' ? <><RiUploadLine />Import Purchase</> : 'Save Purchase')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
