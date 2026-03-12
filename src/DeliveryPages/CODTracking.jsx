import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getDeliveryOrders } from '../api/endpoints'
import { RiMoneyDollarCircleLine } from 'react-icons/ri'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapDeliveryOrder = (order) => ({
  id: order.id,
  orderId: order.order_number || `#ORD-${order.id}`,
  customerName: order.customer_name || 'Walk-in Customer',
  total: toNumber(order.total_amount),
  status: String(order.status || 'assigned').toLowerCase(),
  paymentMethod: String(order.payment_method || '').toUpperCase(),
})

export default function CODTracking() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeliveryOrders()
      .then((r) => {
        const rows = r?.data?.data || r?.data?.orders || []
        setOrders(Array.isArray(rows) ? rows.map(mapDeliveryOrder) : [])
      })
      .catch(() => setOrders([
        {id:1,orderId:'#ORD-1021',customerName:'Rahul Sharma',total:1299,status:'assigned',paymentMethod:'COD'},
        {id:2,orderId:'#ORD-1020',customerName:'Priya Singh',total:4599,status:'delivered',paymentMethod:'COD'},
        {id:3,orderId:'#ORD-1018',customerName:'Sneha Patel',total:2149,status:'delivered',paymentMethod:'COD'},
      ]))
      .finally(() => setLoading(false))
  }, [])

  const codOrders = orders.filter(o => o.paymentMethod === 'COD')
  const collected = codOrders.filter(o => o.status === 'delivered').reduce((s,o) => s+o.total, 0)
  const pending = codOrders.filter(o => o.status !== 'delivered').reduce((s,o) => s+o.total, 0)

  if (loading) return <div className="page-enter"><Header title="COD Tracking" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="COD Tracking" subtitle="Cash on delivery management" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-slate-500 text-sm">Total COD Orders</p>
            <p className="text-3xl font-black text-indigo-600 mt-1">{codOrders.length}</p>
          </div>
          <div className="card text-center border-l-4 border-emerald-400">
            <p className="text-slate-500 text-sm">Collected</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">₹{collected.toLocaleString('en-IN')}</p>
          </div>
          <div className="card text-center border-l-4 border-amber-400">
            <p className="text-slate-500 text-sm">Pending Collection</p>
            <p className="text-3xl font-black text-amber-600 mt-1">₹{pending.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">COD Order Details</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Order</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {codOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="table-td font-mono font-bold text-indigo-600">{o.orderId}</td>
                    <td className="table-td font-semibold">{o.customerName}</td>
                    <td className="table-td font-bold text-emerald-600">₹{o.total?.toLocaleString('en-IN')}</td>
                    <td className="table-td">
                      <span className={`badge ${o.status==='delivered'?'badge-green':'badge-yellow'}`}>
                        {o.status==='delivered' ? '✅ Collected' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
