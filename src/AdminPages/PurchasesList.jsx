import React, { useEffect, useMemo, useState } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getPurchasesList, getSuppliers, getProducts } from '../api/endpoints'
import { RiFilterLine, RiSearchLine, RiRefreshLine, RiBuildingLine, RiShoppingBag3Line, RiCheckboxCircleLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function PurchasesList() {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    q: '',
    supplier_id: '',
    product_id: '',
    payment_status: '',
    from_date: '',
    to_date: '',
    page: 1,
    limit: 20,
  })

  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 })

  const loadMeta = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        getSuppliers(),
        getProducts({ is_active: 1, limit: 500 }),
      ])
      setSuppliers(sRes.data?.data || [])
      setProducts((pRes.data?.data?.products || []).map((p) => ({ id: p.id, name: p.name })))
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load filters')
    }
  }

  const loadRows = async () => {
    setLoading(true)
    try {
      const params = {
        ...filters,
        q: filters.q || undefined,
        supplier_id: filters.supplier_id || undefined,
        product_id: filters.product_id || undefined,
        payment_status: filters.payment_status || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      }
      const response = await getPurchasesList(params)
      const payload = response.data?.data || {}
      setRows(payload.purchases || [])
      setPagination(payload.pagination || { total: 0, page: 1, pages: 1, limit: filters.limit })
    } catch (error) {
      setRows([])
      toast.error(error?.response?.data?.message || 'Failed to load purchases list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMeta() }, [])
  useEffect(() => { loadRows() }, [filters.page, filters.limit])

  const applyFilters = () => {
    setFilters((prev) => ({ ...prev, page: 1 }))
    loadRows()
  }

  const resetFilters = () => {
    setFilters({ q: '', supplier_id: '', product_id: '', payment_status: '', from_date: '', to_date: '', page: 1, limit: 20 })
  }

  useEffect(() => {
    if (!filters.q && !filters.supplier_id && !filters.product_id && !filters.payment_status && !filters.from_date && !filters.to_date && filters.page === 1) {
      loadRows()
    }
  }, [filters.q, filters.supplier_id, filters.product_id, filters.payment_status, filters.from_date, filters.to_date])

  const pageInfo = useMemo(() => `${pagination.total} records`, [pagination.total])

  return (
    <div className="page-enter">
      <Header title="Purchases List" subtitle={pageInfo} />

      <div className="p-6 space-y-4">
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9"
                placeholder="Search invoice / supplier"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1"><RiBuildingLine className="inline mr-1" />Supplier</label>
              <select className="input-field" value={filters.supplier_id} onChange={(e) => setFilters((prev) => ({ ...prev, supplier_id: e.target.value }))}>
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1"><RiShoppingBag3Line className="inline mr-1" />Product</label>
              <select className="input-field" value={filters.product_id} onChange={(e) => setFilters((prev) => ({ ...prev, product_id: e.target.value }))}>
                <option value="">All Products</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1"><RiCheckboxCircleLine className="inline mr-1" />Payment Status</label>
              <select className="input-field" value={filters.payment_status} onChange={(e) => setFilters((prev) => ({ ...prev, payment_status: e.target.value }))}>
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={applyFilters} className="btn-primary flex-1"><RiFilterLine />Apply</button>
              <button onClick={resetFilters} className="btn-secondary"><RiRefreshLine /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">From Date</label>
              <input type="date" className="input-field" value={filters.from_date} onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">To Date</label>
              <input type="date" className="input-field" value={filters.to_date} onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? <Loader /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-th">Invoice</th>
                    <th className="table-th">Supplier</th>
                    <th className="table-th">Products</th>
                    <th className="table-th">Items</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {!rows.length && (
                    <tr><td className="table-td text-center text-slate-400" colSpan={7}>No purchase records found.</td></tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="table-td font-mono font-semibold text-indigo-600">{row.invoice_number}</td>
                      <td className="table-td">{row.supplier_name}</td>
                      <td className="table-td text-xs text-slate-600 max-w-xs truncate" title={row.product_names || ''}>{row.product_names || '-'}</td>
                      <td className="table-td">{row.items_count}</td>
                      <td className="table-td font-semibold">₹{Number(row.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="table-td">
                        <span className={`badge ${row.payment_status === 'paid' ? 'badge-green' : row.payment_status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                          {row.payment_status}
                        </span>
                      </td>
                      <td className="table-td text-slate-500">{row.invoice_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages || 1}</p>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Prev
            </button>
            <button
              className="btn-secondary"
              disabled={pagination.page >= (pagination.pages || 1)}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.min((pagination.pages || 1), prev.page + 1) }))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
