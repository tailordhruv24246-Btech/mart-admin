import React, { useEffect, useState } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getReorderSuggestions } from '../api/endpoints'
import { RiDownloadLine, RiRefreshLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const exportCSV = (rows, filename) => {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [
    keys.join(','),
    ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReorderSuggestions() {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [leadDays, setLeadDays] = useState(7)
  const [data, setData] = useState({ suggestions: [], total_items: 0, total_estimated_cost: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const response = await getReorderSuggestions({ days, lead_days: leadDays })
      setData(response?.data?.data || { suggestions: [], total_items: 0, total_estimated_cost: 0 })
    } catch (error) {
      setData({ suggestions: [], total_items: 0, total_estimated_cost: 0 })
      toast.error(error?.response?.data?.message || 'Failed to load reorder suggestions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page-enter">
      <Header
        title="Low Stock Auto Reorder List"
        subtitle="Daily purchase suggestion based on reorder levels and sales velocity"
      />

      <div className="p-6 space-y-6">
        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sales window (days)</label>
            <input type="number" min="1" className="input-field" value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Lead time (days)</label>
            <input type="number" min="1" className="input-field" value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value) || 7)} />
          </div>
          <button className="btn-primary" onClick={load}><RiRefreshLine /> Refresh Suggestions</button>
          <button
            className="btn-secondary"
            onClick={() => exportCSV(data.suggestions || [], `reorder_suggestions_${new Date().toISOString().split('T')[0]}.csv`)}
          >
            <RiDownloadLine /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <p className="text-slate-500 text-sm">Suggested Items</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{Number(data.total_items || 0)}</p>
          </div>
          <div className="card">
            <p className="text-slate-500 text-sm">Estimated Purchase Cost</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹{Number(data.total_estimated_cost || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="card overflow-x-auto p-0">
          {loading ? <Loader /> : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Current Stock</th>
                  <th className="table-th">Reorder Level</th>
                  <th className="table-th">Avg Daily Sale</th>
                  <th className="table-th">Suggested Qty</th>
                  <th className="table-th">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!data.suggestions?.length && (
                  <tr>
                    <td className="table-td text-center text-slate-500" colSpan={7}>No reorder suggestions right now.</td>
                  </tr>
                )}

                {(data.suggestions || []).map((item) => (
                  <tr key={item.id}>
                    <td className="table-td font-semibold">{item.name}</td>
                    <td className="table-td font-mono text-xs">{item.sku || '-'}</td>
                    <td className="table-td">{Number(item.current_stock || 0)}</td>
                    <td className="table-td">{Number(item.reorder_level || 0)}</td>
                    <td className="table-td">{Number(item.avg_daily_sale || 0).toFixed(2)}</td>
                    <td className="table-td font-bold text-orange-600">{Number(item.suggested_qty || 0)}</td>
                    <td className="table-td font-semibold">₹{Number(item.estimated_cost || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
