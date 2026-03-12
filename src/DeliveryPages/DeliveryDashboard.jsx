import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getDeliveryOrders } from '../api/endpoints'
import StatCard from '../Components/StatCard'
import { RiListOrdered, RiCheckDoubleLine, RiTimeLine, RiMoneyDollarCircleLine } from 'react-icons/ri'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapDeliveryOrder = (order) => ({
  id: order.id,
  orderId: order.order_number || `#ORD-${order.id}`,
  customerName: order.customer_name || 'Walk-in Customer',
  address: order.shipping_address || order.billing_address || '-',
  total: toNumber(order.total_amount),
  status: String(order.status || 'assigned').toLowerCase(),
  paymentMethod: String(order.payment_method || '').toUpperCase(),
})

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeliveryOrders()
      .then((r) => {
        const rows = r?.data?.data || r?.data?.orders || []
        setOrders(Array.isArray(rows) ? rows.map(mapDeliveryOrder) : [])
      })
      .catch(() => setOrders([
        {id:1,orderId:'#ORD-1021',customerName:'Rahul Sharma',address:'12 MG Road, Mumbai',total:1299,status:'assigned',paymentMethod:'COD'},
        {id:2,orderId:'#ORD-1020',customerName:'Priya Singh',address:'45 FC Road, Pune',total:4599,status:'delivered',paymentMethod:'UPI'},
        {id:3,orderId:'#ORD-1019',customerName:'Amit Kumar',address:'7 Anna Nagar, Chennai',total:899,status:'assigned',paymentMethod:'COD'},
      ]))
      .finally(() => setLoading(false))
  }, [])

  const assigned = orders.filter(o => o.status === 'assigned').length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const cod = orders.filter(o => o.paymentMethod === 'COD' && o.status === 'delivered').reduce((s,o) => s+o.total,0)

  if (loading) return <div className="page-enter"><Header title="Delivery Dashboard" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="My Dashboard" subtitle="Today's delivery overview" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Assigned" value={orders.length} icon={RiListOrdered} color="indigo" />
          <StatCard title="Pending" value={assigned} icon={RiTimeLine} color="orange" />
          <StatCard title="Delivered" value={delivered} icon={RiCheckDoubleLine} color="green" />
          <StatCard title="COD Collected" value={`₹${cod.toLocaleString('en-IN')}`} icon={RiMoneyDollarCircleLine} color="blue" />
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">Today's Orders</h3>
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600 text-sm">{o.orderId}</span>
                    <span className={`badge ${o.status==='delivered'?'badge-green':'badge-yellow'}`}>{o.status}</span>
                    {o.paymentMethod==='COD' && <span className="badge badge-red">COD</span>}
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">{o.customerName}</p>
                  <p className="text-xs text-slate-400">{o.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">₹{o.total?.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
