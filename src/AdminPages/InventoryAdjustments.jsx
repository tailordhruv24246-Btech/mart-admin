import React, { useEffect, useMemo, useState } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import {
  createInventoryAdjustment,
  getInventoryAdjustments,
  getProducts,
} from '../api/endpoints'
import { RiErrorWarningLine, RiRefreshLine, RiToolsLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const ADJUSTMENT_TYPES = [
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'damage', label: 'Damage Out' },
  { value: 'expired', label: 'Expired Out' },
  { value: 'manual_in', label: 'Manual Stock In' },
  { value: 'manual_out', label: 'Manual Stock Out' },
]

export default function InventoryAdjustments() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ total_loss: 0, total_out_qty: 0, total_in_qty: 0 })

  const [filters, setFilters] = useState({
    adjustment_type: '',
    product_id: '',
    from_date: '',
    to_date: '',
  })

  const [form, setForm] = useState({
    product_id: '',
    adjustment_type: 'damage',
    quantity: 1,
    reason: '',
    reference_no: '',
    purchase_price: '',
    selling_price: '',
    mrp: '',
    batch_number: '',
  })

  const loadMeta = async () => {
    const response = await getProducts({ is_active: 1, limit: 500 })
    const productRows = response?.data?.data?.products || []
    setProducts(Array.isArray(productRows) ? productRows : [])
  }

  const loadRows = async () => {
    setLoading(true)
    try {
      const response = await getInventoryAdjustments({
        ...filters,
        adjustment_type: filters.adjustment_type || undefined,
        product_id: filters.product_id || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        page: 1,
        limit: 100,
      })

      const payload = response?.data?.data || {}
      setRows(payload.adjustments || [])
      setSummary(payload.summary || { total_loss: 0, total_out_qty: 0, total_in_qty: 0 })
    } catch (error) {
      setRows([])
      setSummary({ total_loss: 0, total_out_qty: 0, total_in_qty: 0 })
      toast.error(error?.response?.data?.message || 'Failed to load inventory adjustments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([loadMeta(), loadRows()]).catch(() => {})
  }, [])

  const submit = async (event) => {
    event.preventDefault()

    if (!form.product_id || !form.adjustment_type || Number(form.quantity) <= 0) {
      toast.error('Product, type and quantity are required')
      return
    }

    setSaving(true)
    try {
      await createInventoryAdjustment({
        ...form,
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        mrp: form.mrp ? Number(form.mrp) : undefined,
      })

      toast.success('Inventory adjustment saved')
      setForm((prev) => ({ ...prev, quantity: 1, reason: '', reference_no: '' }))
      await loadRows()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save adjustment')
    } finally {
      setSaving(false)
    }
  }

  const selectedType = useMemo(() => String(form.adjustment_type || ''), [form.adjustment_type])
  const showManualInPricing = selectedType === 'manual_in'

  return (
    <div className="page-enter">
      <Header
        title="Purchase Return / Damage Entry"
        subtitle="Track damaged, expired and return inventory with automatic loss impact"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-slate-500 text-sm">Total Loss</p>
            <p className="text-2xl font-black text-red-600 mt-1">₹{Number(summary.total_loss || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="card">
            <p className="text-slate-500 text-sm">Total Stock Out</p>
            <p className="text-2xl font-black text-orange-600 mt-1">{Number(summary.total_out_qty || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="card">
            <p className="text-slate-500 text-sm">Total Stock In</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{Number(summary.total_in_qty || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <RiToolsLine /> New Adjustment Entry
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Product</label>
              <select className="input-field" value={form.product_id} onChange={(e) => setForm((prev) => ({ ...prev, product_id: e.target.value }))} required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Adjustment Type</label>
              <select className="input-field" value={form.adjustment_type} onChange={(e) => setForm((prev) => ({ ...prev, adjustment_type: e.target.value }))}>
                {ADJUSTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Quantity</label>
              <input type="number" min="1" className="input-field" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Reference No</label>
              <input className="input-field" placeholder="INV-1002 / MANUAL" value={form.reference_no} onChange={(e) => setForm((prev) => ({ ...prev, reference_no: e.target.value }))} />
            </div>
          </div>

          {showManualInPricing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Purchase Price</label>
                <input type="number" min="0" step="0.01" className="input-field" value={form.purchase_price} onChange={(e) => setForm((prev) => ({ ...prev, purchase_price: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Selling Price</label>
                <input type="number" min="0" step="0.01" className="input-field" value={form.selling_price} onChange={(e) => setForm((prev) => ({ ...prev, selling_price: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">MRP</label>
                <input type="number" min="0" step="0.01" className="input-field" value={form.mrp} onChange={(e) => setForm((prev) => ({ ...prev, mrp: e.target.value }))} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <textarea className="input-field" rows={2} value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Damage reason / supplier return note" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Adjustment'}</button>
          </div>
        </form>

        <div className="card space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Type</label>
              <select className="input-field" value={filters.adjustment_type} onChange={(e) => setFilters((prev) => ({ ...prev, adjustment_type: e.target.value }))}>
                <option value="">All Types</option>
                {ADJUSTMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input type="date" className="input-field" value={filters.from_date} onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input type="date" className="input-field" value={filters.to_date} onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))} />
            </div>
            <button className="btn-secondary" onClick={loadRows}><RiRefreshLine /> Refresh</button>
          </div>

          {loading ? <Loader /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Product</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Loss</th>
                    <th className="table-th">Ref</th>
                    <th className="table-th">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {!rows.length && (
                    <tr>
                      <td className="table-td text-center text-slate-500" colSpan={7}>No adjustments found.</td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="table-td">{new Date(row.created_at).toLocaleString('en-IN')}</td>
                      <td className="table-td">{row.product_name}</td>
                      <td className="table-td capitalize">{String(row.adjustment_type).replaceAll('_', ' ')}</td>
                      <td className="table-td font-semibold">{row.quantity}</td>
                      <td className="table-td text-red-600 font-semibold">₹{Number(row.total_loss || 0).toLocaleString('en-IN')}</td>
                      <td className="table-td">{row.reference_no || '-'}</td>
                      <td className="table-td max-w-xs truncate" title={row.reason || ''}>{row.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 flex items-start gap-2">
            <RiErrorWarningLine className="mt-0.5" />
            Damage/Expired entries reduce stock immediately and update loss tracking for profitability visibility.
          </p>
        </div>
      </div>
    </div>
  )
}
