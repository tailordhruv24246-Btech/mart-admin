import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getSalesReport, getStockReport, getPurchaseReport } from '../api/endpoints'
import { RiDownloadLine, RiBarChartLine } from 'react-icons/ri'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const numberValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getStatusBadge = (status) => {
  const upper = String(status || '').toUpperCase()
  if (upper === 'LOW') return 'badge-yellow'
  if (upper === 'OUT') return 'badge-red'
  return 'badge-green'
}

const formatShortDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value || '-')
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function Reports() {
  const [tab, setTab] = useState('sales')
  const [salesData, setSalesData] = useState({ summary: null, daily: [] })
  const [stockData, setStockData] = useState([])
  const [purchaseData, setPurchaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    const loadReports = async () => {
      const [year, month] = monthFilter.split('-')
      setLoading(true)
      try {
        const [salesRes, stockRes, purchaseRes] = await Promise.all([
          getSalesReport({ year, month }),
          getStockReport(),
          getPurchaseReport(),
        ])

        const sales = salesRes?.data?.data || {}
        const stock = stockRes?.data?.data || []
        const purchase = purchaseRes?.data?.data || null

        setSalesData({
          summary: {
            totalSales: numberValue(sales?.summary?.total_sales),
            totalOrders: numberValue(sales?.summary?.total_transactions),
            avgOrderValue: numberValue(sales?.summary?.total_transactions)
              ? numberValue(sales?.summary?.total_sales) / numberValue(sales?.summary?.total_transactions)
              : 0,
            grossProfit: numberValue(sales?.summary?.total_profit),
          },
          daily: Array.isArray(sales?.daily_breakdown)
            ? sales.daily_breakdown.map((item) => ({
              date: formatShortDate(item.date),
              sales: numberValue(item.sales),
              orders: numberValue(item.transactions),
            }))
            : [],
        })

        setStockData(Array.isArray(stock)
          ? stock.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            stock: numberValue(item.current_stock),
            reorderLevel: numberValue(item.reorder_level),
            status: item.stock_status,
            category: item.category,
          }))
          : [])

        setPurchaseData(purchase)
      } catch (error) {
        setSalesData({ summary: null, daily: [] })
        setStockData([])
        setPurchaseData(null)
        toast.error(error?.response?.data?.message || 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [monthFilter])

  const exportCSV = (data, filename) => {
    if (!data?.length) return
    const keys = Object.keys(data[0])
    const csv = [
      keys.join(','),
      ...data.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="page-enter"><Header title="Reports" /><Loader /></div>
  const s = salesData

  return (
    <div className="page-enter">
      <Header title="Reports & Analytics" subtitle="Business performance insights" />
      <div className="p-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          {['sales','stock','purchases'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${tab===t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </div>

        {tab === 'sales' && (
          <div className="space-y-6">
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Month</label>
                  <input
                    type="month"
                    className="input-field"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                ['Total Revenue','₹'+s.summary?.totalSales?.toLocaleString('en-IN'),'indigo'],
                ['Total Orders',s.summary?.totalOrders,'green'],
                ['Avg Order Value','₹'+s.summary?.avgOrderValue?.toLocaleString('en-IN'),'blue'],
                ['Gross Profit','₹'+s.summary?.grossProfit?.toLocaleString('en-IN'),'orange'],
              ].map(([l,v,c]) => (
                <div key={l} className="card text-center">
                  <p className="text-slate-500 text-sm">{l}</p>
                  <p className={`text-2xl font-black mt-1 ${c==='indigo'?'text-indigo-600':c==='green'?'text-green-600':c==='blue'?'text-blue-600':'text-orange-600'}`}>{v}</p>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Daily Sales</h3>
                <button onClick={() => exportCSV(s.daily, 'sales_report.csv')} className="btn-secondary text-sm py-1.5">
                  <RiDownloadLine />Export CSV
                </button>
              </div>
              {s.daily?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={s.daily} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} />
                    <YAxis tick={{fontSize:11,fill:'#94a3b8'}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v=>[`₹${numberValue(v).toLocaleString('en-IN')}`,'Sales']} />
                    <Bar dataKey="sales" fill="#4f46e5" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-slate-500">No sales data found for selected month.</div>
              )}
            </div>
          </div>
        )}

        {tab === 'stock' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Current Stock Report</h3>
              <button onClick={() => exportCSV(stockData,'stock_report.csv')} className="btn-secondary text-sm py-1.5">
                <RiDownloadLine />Export CSV
              </button>
            </div>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="table-th">Product</th>
                      <th className="table-th">SKU</th>
                      <th className="table-th">Stock</th>
                      <th className="table-th">Value</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stockData.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="table-td font-semibold">{p.name}</td>
                        <td className="table-td font-mono text-xs">{p.sku}</td>
                        <td className="table-td font-bold">{p.stock}</td>
                        <td className="table-td">Reorder: {p.reorderLevel}</td>
                        <td className="table-td">
                          <span className={`badge ${getStatusBadge(p.status)}`}>{String(p.status || 'OK')}</span>
                        </td>
                      </tr>
                    ))}

                    {stockData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">No stock data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'purchases' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Profit Report</h3>
              <button
                onClick={() => {
                  const rows = Array.isArray(purchaseData?.by_category)
                    ? purchaseData.by_category.map((r) => ({ category: r.category, revenue: numberValue(r.revenue), profit: numberValue(r.profit) }))
                    : []
                  exportCSV(rows, 'profit_by_category.csv')
                }}
                className="btn-secondary text-sm py-1.5"
              >
                <RiDownloadLine />Export CSV
              </button>
            </div>

            {purchaseData?.overall ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-xl font-bold text-slate-900">₹{numberValue(purchaseData.overall.total_revenue).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Total Cost</p>
                    <p className="text-xl font-bold text-slate-900">₹{numberValue(purchaseData.overall.total_cost).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Gross Profit</p>
                    <p className="text-xl font-bold text-emerald-600">₹{numberValue(purchaseData.overall.gross_profit).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Profit Margin</p>
                    <p className="text-xl font-bold text-indigo-600">{numberValue(purchaseData.overall.profit_margin_percent).toFixed(2)}%</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="table-th">Category</th>
                        <th className="table-th">Revenue</th>
                        <th className="table-th">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(purchaseData.by_category || []).map((row, idx) => (
                        <tr key={`${row.category || 'uncategorized'}-${idx}`} className="hover:bg-slate-50">
                          <td className="table-td">{row.category || 'Uncategorized'}</td>
                          <td className="table-td">₹{numberValue(row.revenue).toLocaleString('en-IN')}</td>
                          <td className="table-td">₹{numberValue(row.profit).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      {(purchaseData.by_category || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-slate-500">No category-wise profit data available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <RiBarChartLine className="text-6xl text-slate-200 mb-4" />
                <p className="text-slate-500">Profit report data not available</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
