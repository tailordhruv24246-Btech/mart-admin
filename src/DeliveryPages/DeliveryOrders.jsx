import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import Modal from '../Components/Modal'
import { getDeliveryOrders, markDelivered } from '../api/endpoints'
import { RiCheckLine, RiMapPinLine, RiPhoneLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapDeliveryOrder = (order) => ({
  id: order.id,
  orderId: order.order_number || `#ORD-${order.id}`,
  customerName: order.customer_name || 'Walk-in Customer',
  phone: order.customer_phone || '-',
  address: order.shipping_address || order.billing_address || '-',
  total: toNumber(order.total_amount),
  status: String(order.status || 'assigned').toLowerCase(),
  paymentMethod: String(order.payment_method || '').toUpperCase(),
  items: Array.isArray(order.items) ? order.items : [],
})

export default function DeliveryOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [deliverModal, setDeliverModal] = useState(null)
  const [notes, setNotes] = useState('')

  const load = () => {
    getDeliveryOrders()
      .then((r) => {
        const rows = r?.data?.data || r?.data?.orders || []
        setOrders(Array.isArray(rows) ? rows.map(mapDeliveryOrder) : [])
      })
      .catch(() => setOrders([
        {id:1001,orderId:'#ORD-1021',customerName:'Rahul Sharma',phone:'9876543210',address:'12 MG Road, Bandra, Mumbai 400050',total:1299,status:'assigned',paymentMethod:'COD',items:[{name:'Prestige Cooker',qty:1,price:1299}]},
        {id:1002,orderId:'#ORD-1022',customerName:'Priya Singh',phone:'9876543211',address:'45 FC Road, Shivajinagar, Pune 411005',total:4599,status:'assigned',paymentMethod:'UPI',items:[{name:'Samsung Galaxy S24',qty:1,price:4599}]},
        {id:1003,orderId:'#ORD-1019',customerName:'Amit Kumar',phone:'9876543212',address:'7 Anna Nagar East, Chennai 600102',total:899,status:'delivered',paymentMethod:'COD'},
      ]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const doDeliver = async () => {
    try {
      await markDelivered(deliverModal.id)
      toast.success('Marked as delivered! ✅')
      setDeliverModal(null); setNotes(''); load()
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <div className="page-enter"><Header title="My Orders" /><Loader /></div>

  const pending = orders.filter(o => o.status === 'assigned')
  const done = orders.filter(o => o.status === 'delivered')

  return (
    <div className="page-enter">
      <Header title="My Orders" subtitle={`${pending.length} pending · ${done.length} delivered`} />
      <div className="p-6 space-y-6">

        {pending.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>Pending Deliveries
            </h3>
            <div className="space-y-3">
              {pending.map(o => (
                <div key={o.id} className="card border-l-4 border-amber-400">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-600">{o.orderId}</span>
                      <h3 className="font-bold text-slate-900 mt-1 text-lg">{o.customerName}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <RiPhoneLine className="flex-shrink-0" /><span>{o.phone}</span>
                      </div>
                      <div className="flex items-start gap-1 text-sm text-slate-500 mt-0.5">
                        <RiMapPinLine className="flex-shrink-0 mt-0.5" /><span>{o.address}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-black text-emerald-600 text-xl">₹{o.total?.toLocaleString('en-IN')}</p>
                      {o.paymentMethod === 'COD' && <span className="badge badge-red mt-1">COD — Collect Cash</span>}
                    </div>
                  </div>
                  {o.items && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {o.items.map((item, i) => (
                        <p key={i} className="text-sm text-slate-600">{item.name} × {item.qty} — ₹{item.price}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setDeliverModal(o)} className="btn-primary mt-4 w-full justify-center">
                    <RiCheckLine />Mark as Delivered
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>Completed
            </h3>
            <div className="space-y-3">
              {done.map(o => (
                <div key={o.id} className="card border-l-4 border-emerald-400 opacity-80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-600">{o.orderId}</span>
                      <p className="font-semibold text-slate-700 mt-1">{o.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">₹{o.total?.toLocaleString('en-IN')}</p>
                      <span className="badge badge-green mt-1">Delivered ✓</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <Modal open={!!deliverModal} onClose={() => setDeliverModal(null)} title="Confirm Delivery" size="sm">
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800">Order: {deliverModal?.orderId}</p>
            <p className="text-sm text-emerald-700">{deliverModal?.customerName}</p>
            <p className="text-xl font-black text-emerald-700 mt-1">₹{deliverModal?.total?.toLocaleString('en-IN')}</p>
            {deliverModal?.paymentMethod === 'COD' && (
              <div className="mt-2 p-2 bg-red-100 rounded-lg">
                <p className="text-xs font-bold text-red-700">⚠️ COD Order — Collect ₹{deliverModal?.total?.toLocaleString('en-IN')} in cash</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Notes (optional)</label>
            <textarea className="input-field" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Left at door, handed to security, etc..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeliverModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={doDeliver} className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700">
              <RiCheckLine />Confirm Delivered
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
