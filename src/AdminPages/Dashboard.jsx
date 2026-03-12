import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Components/Header'
import StatCard from '../Components/StatCard'
import Loader from '../Components/Loader'
import { getOrders, getProducts, getUsers, getPurchasesList, getSalesReport, getStockReport } from '../api/endpoints'
import { RiShoppingBag3Line, RiListOrdered, RiMoneyDollarCircleLine, RiUserLine, RiTruckLine, RiAlertLine, RiFileList3Line, RiBankCardLine } from 'react-icons/ri'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6']

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const shortDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    pendingOrders: 0,
    lowStock: 0,
    todaySales: 0,
    totalPurchases: 0,
    unpaidPurchases: 0,
    salesChart: [],
    categoryChart: [],
    recentOrders: [],
    lowStockItems: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1

        const [ordersRes, productsRes, usersRes, purchasesRes, salesRes, stockRes] = await Promise.all([
          getOrders({ limit: 300 }),
          getProducts({ page: 1, limit: 500 }),
          getUsers(),
          getPurchasesList({ page: 1, limit: 200 }),
          getSalesReport({ year, month }),
          getStockReport(),
        ])

        const orderRows = ordersRes?.data?.data || ordersRes?.data?.orders || []
        const productRows = productsRes?.data?.data?.products || productsRes?.data?.products || productsRes?.data?.data || []
        const userRows = usersRes?.data?.data || usersRes?.data?.users || []
        const purchaseRows = purchasesRes?.data?.data?.purchases || purchasesRes?.data?.purchases || []
        const salesData = salesRes?.data?.data || {}
        const stockRows = stockRes?.data?.data || []

        const orders = Array.isArray(orderRows) ? orderRows : []
        const products = Array.isArray(productRows) ? productRows : []
        const users = Array.isArray(userRows) ? userRows : []
        const purchases = Array.isArray(purchaseRows) ? purchaseRows : []
        const stock = Array.isArray(stockRows) ? stockRows : []

        const pendingOrders = orders.filter((order) => ['pending', 'processing', 'packed', 'shipped'].includes(String(order.status || '').toLowerCase())).length

        const todayLabel = now.toDateString()
        const dailyBreakdown = Array.isArray(salesData?.daily_breakdown) ? salesData.daily_breakdown : []
        const todaySales = dailyBreakdown
          .filter((item) => new Date(item.date).toDateString() === todayLabel)
          .reduce((sum, item) => sum + toNumber(item.sales), 0)

        const salesChart = dailyBreakdown.map((item) => ({
          date: shortDate(item.date),
          sales: toNumber(item.sales),
        }))

        const categoryMap = products.reduce((acc, product) => {
          const key = product.category_name || 'Uncategorized'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})

        const categoryChart = Object.entries(categoryMap)
          .map(([name, count]) => ({ name, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)

        const recentOrders = orders
          .slice(0, 6)
          .map((order) => ({
            id: order.id,
            orderId: order.order_number || `#ORD-${order.id}`,
            customer: order.customer_name || 'Walk-in Customer',
            amount: toNumber(order.total_amount),
            status: String(order.status || 'pending').toLowerCase(),
            date: formatDate(order.created_at),
          }))

        const lowStockItems = stock
          .filter((item) => String(item.stock_status || '').toUpperCase() === 'LOW' || toNumber(item.current_stock) <= toNumber(item.reorder_level))
          .slice(0, 8)
          .map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            stock: toNumber(item.current_stock),
            reorderLevel: toNumber(item.reorder_level),
          }))

        setDashboard({
          totalSales: toNumber(salesData?.summary?.total_sales),
          totalOrders: orders.length,
          totalProducts: products.length,
          totalUsers: users.length,
          pendingOrders,
          lowStock: lowStockItems.length,
          todaySales,
          totalPurchases: purchases.length,
          unpaidPurchases: purchases.filter((purchase) => String(purchase.payment_status || '').toLowerCase() !== 'paid').length,
          salesChart,
          categoryChart,
          recentOrders,
          lowStockItems,
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const statusColor = (s) => ({
    pending: 'badge-yellow', delivered: 'badge-green', processing: 'badge-blue', shipped: 'badge-purple', cancelled: 'badge-red'
  }[s] || 'badge-blue')

  if (loading) return <div className="page-enter"><Header title="Dashboard" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Dashboard" subtitle={`Welcome back! Here's what's happening today.`} />
      <div className="p-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Monthly Revenue" value={`₹${dashboard.totalSales.toLocaleString('en-IN')}`} icon={RiMoneyDollarCircleLine} color="indigo" onClick={() => navigate('/admin/reports')} />
          <StatCard title="Total Orders" value={dashboard.totalOrders.toLocaleString()} icon={RiListOrdered} color="green" onClick={() => navigate('/admin/orders')} />
          <StatCard title="Products" value={dashboard.totalProducts} icon={RiShoppingBag3Line} color="orange" onClick={() => navigate('/admin/products')} />
          <StatCard title="Staff Users" value={dashboard.totalUsers} icon={RiUserLine} color="blue" onClick={() => navigate('/admin/users')} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Today's Sales" value={`₹${dashboard.todaySales.toLocaleString('en-IN')}`} icon={RiMoneyDollarCircleLine} color="purple" onClick={() => navigate('/admin/reports')} />
          <StatCard title="Pending Orders" value={dashboard.pendingOrders} icon={RiTruckLine} color="orange" sub="Needs attention" onClick={() => navigate('/admin/orders')} />
          <StatCard title="Low Stock Items" value={dashboard.lowStock} icon={RiAlertLine} color="red" sub="Below reorder level" onClick={() => navigate('/admin/reports')} />
          <StatCard title="Purchase Invoices" value={dashboard.totalPurchases} icon={RiFileList3Line} color="blue" onClick={() => navigate('/admin/purchases-list')} />
          <StatCard title="Unpaid Purchases" value={dashboard.unpaidPurchases} icon={RiBankCardLine} color="red" onClick={() => navigate('/admin/purchases-list')} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="font-bold text-slate-900 mb-4">Current Month Sales Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dashboard.salesChart} margin={{top:5,right:10,left:0,bottom:5}}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:12,fill:'#94a3b8'}} />
                <YAxis tick={{fontSize:12,fill:'#94a3b8'}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>[`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2.5} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Products by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dashboard.categoryChart} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {(dashboard.categoryChart||[]).map((e,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v=>[`${v} products`,'Count']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {(dashboard.categoryChart||[]).map((c,i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{background: COLORS[i%COLORS.length]}} />
                    <span className="text-slate-600">{c.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Recent Orders</h3>
              <a href="/admin/orders" className="text-indigo-600 text-sm font-semibold hover:underline">View all →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-th">Order ID</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.recentOrders||[]).map(o => (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="table-td font-mono font-semibold text-indigo-600">{o.orderId}</td>
                      <td className="table-td font-medium">{o.customer}</td>
                      <td className="table-td font-bold">₹{o.amount?.toLocaleString('en-IN')}</td>
                      <td className="table-td"><span className={statusColor(o.status)}>{o.status}</span></td>
                      <td className="table-td text-slate-400">{o.date}</td>
                    </tr>
                  ))}

                  {dashboard.recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="table-td text-center text-slate-500 py-8">No orders found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Low Stock Alerts</h3>
            {dashboard.lowStockItems.length ? (
              <div className="space-y-3">
                {dashboard.lowStockItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">SKU: {item.sku || '-'}</p>
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-red-600 font-semibold">Stock: {item.stock}</span>
                      <span className="text-slate-500">Reorder: {item.reorderLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">No low-stock products right now.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
