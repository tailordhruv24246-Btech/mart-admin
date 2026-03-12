import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getOrders, getDeliveryBoys, assignDelivery } from '../api/endpoints'
import { RiTruckLine, RiUserLine, RiSearchLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const ASSIGNABLE_STATUSES = ['pending', 'processing', 'packed']

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapOrder = (order) => ({
  id: order.id,
  orderId: order.order_number || `#ORD-${order.id}`,
  customerName: order.customer_name || 'Walk-in Customer',
  address: order.shipping_address || order.billing_address || '-',
  total: toNumber(order.total_amount),
  status: String(order.status || 'pending').toLowerCase(),
  deliveryBoyId: order.delivery_boy_id || null,
  deliveryBoyName: order.delivery_boy_name || '',
})

export default function AssignDelivery() {
  const [orders, setOrders] = useState([])
  const [deliveryBoys, setDeliveryBoys] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState({})
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [ordersRes, deliveryRes] = await Promise.all([
        getOrders({ limit: 200 }),
        getDeliveryBoys(),
      ])

      const orderList = ordersRes?.data?.data || ordersRes?.data?.orders || ordersRes?.data || []
      const deliveryList = deliveryRes?.data?.data || deliveryRes?.data?.users || deliveryRes?.data || []

      setOrders(Array.isArray(orderList) ? orderList.map(mapOrder) : [])
      setDeliveryBoys(Array.isArray(deliveryList) ? deliveryList.filter((user) => user.role === 'delivery') : [])
    } catch (error) {
      setOrders([])
      setDeliveryBoys([])
      toast.error(error?.response?.data?.message || 'Failed to load delivery assignment data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const doAssign = async (orderId, deliveryBoyId) => {
    if (!deliveryBoyId) return
    try {
      await assignDelivery(orderId, { delivery_boy_id: Number(deliveryBoyId) })
      toast.success('Assigned successfully!')
      setAssignments((prev) => ({ ...prev, [orderId]: '' }))
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign')
    }
  }

  const filteredOrders = orders
    .filter((order) => ASSIGNABLE_STATUSES.includes(order.status) && !order.deliveryBoyId)
    .filter((order) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return [order.orderId, order.customerName, order.address].some((value) => String(value || '').toLowerCase().includes(q))
    })

  if (loading) return <div className="page-enter"><Header title="Assign Delivery" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Assign Delivery" subtitle={`${filteredOrders.length} orders pending assignment`} />
      <div className="p-6">
        <div className="card mb-4">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Search order id, customer, address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map(o => (
            <div key={o.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-mono font-bold text-indigo-600">{o.orderId || `#ORD-${o.id}`}</span>
                  <h3 className="font-bold text-slate-900 mt-1">{o.customerName}</h3>
                  <p className="text-sm text-slate-500">{o.address}</p>
                </div>
                <span className="font-bold text-emerald-600">₹{o.total?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex gap-3 items-center mt-4">
                <RiUserLine className="text-slate-400 flex-shrink-0" />
                <select
                  value={assignments[o.id] || o.deliveryBoyId || ''}
                  onChange={e => setAssignments({...assignments,[o.id]:e.target.value})}
                  className="input-field flex-1 text-sm py-2">
                  <option value="">Select delivery boy...</option>
                  {deliveryBoys.map(d => <option key={d.id} value={d.id}>{d.name} — {d.phone || '-'}</option>)}
                </select>
                <button
                  onClick={() => doAssign(o.id, assignments[o.id])}
                  disabled={!assignments[o.id]}
                  className="btn-primary text-sm py-2 flex-shrink-0">
                  <RiTruckLine />Assign
                </button>
              </div>
            </div>
          ))}
        </div>
        {filteredOrders.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-20">
            <RiTruckLine className="text-6xl text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No orders pending assignment</p>
          </div>
        )}
      </div>
    </div>
  )
}
