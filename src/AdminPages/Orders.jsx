import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import Loader from '../Components/Loader'
import StatCard from '../Components/StatCard'
import { getOrders, getOrder, updateOrderStatus, cancelOrder, assignDelivery, getDeliveryBoys } from '../api/endpoints'
import { RiEyeLine, RiTruckLine, RiSearchLine, RiShoppingBagLine, RiTimeLine, RiCheckboxCircleLine, RiCloseCircleLine } from 'react-icons/ri'
import toast from 'react-hot-toast'
import { openWhatsAppMessage } from '../utils/whatsapp'

const STATUSES = ['pending','processing','packed','shipped','delivered','cancelled']
const STATUS_COLORS = { pending:'badge-yellow', processing:'badge-blue', shipped:'badge-purple', delivered:'badge-green', cancelled:'badge-red' }
const PAYMENT_COLORS = { cod: 'badge-yellow', upi: 'badge-green', card: 'badge-blue', online: 'badge-purple' }
const ASSIGNABLE_STATUSES = ['pending', 'processing', 'packed', 'shipped']
const CANCEL_WINDOW_MINUTES = 10
const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing', 'packed']
const CANCEL_WINDOW_MS = CANCEL_WINDOW_MINUTES * 60 * 1000

const getCancelRemainingMs = (order, nowTs) => {
  const status = String(order?.status || '').toLowerCase()
  if (!CANCELLABLE_STATUSES.includes(status)) return 0
  const createdAt = new Date(order?.createdAt || order?.created_at)
  if (Number.isNaN(createdAt.getTime())) return 0
  return Math.max(0, createdAt.getTime() + CANCEL_WINDOW_MS - nowTs)
}

const formatCancelRemaining = (remainingMs) => {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

const isCancellable = (order) => {
  return getCancelRemainingMs(order, Date.now()) > 0
}

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

const mapOrder = (order) => ({
  id: order.id,
  orderId: order.order_number || `#ORD-${order.id}`,
  customerName: order.customer_name || 'Walk-in Customer',
  phone: order.customer_phone || '-',
  address: order.shipping_address || order.billing_address || '-',
  total: toNumber(order.total_amount),
  itemsCount: toNumber(order.item_count || order.items_count),
  status: (order.status || 'pending').toLowerCase(),
  paymentMethod: String(order.payment_method || '-').toUpperCase(),
  createdAt: order.created_at,
  deliveryBoyName: order.delivery_boy_name || '',
  deliveryBoyId: order.delivery_boy_id || '',
  cancelledAt: order.cancelled_at || null,
  cancelledByRole: order.cancelled_by_role || '',
  cancelElapsedMinutes: Number.isFinite(Number(order.cancel_elapsed_minutes)) ? Number(order.cancel_elapsed_minutes) : null,
})

const cancellationAuditLabel = (order) => {
  if (String(order?.status || '').toLowerCase() !== 'cancelled') return ''
  if (!Number.isFinite(order?.cancelElapsedMinutes)) return ''
  const actorRole = String(order?.cancelledByRole || '').toLowerCase()
  const actorLabel = actorRole === 'customer' ? 'Client' : (actorRole ? actorRole.charAt(0).toUpperCase() + actorRole.slice(1) : 'User')
  return `${actorLabel} cancelled in ${order.cancelElapsedMinutes} min`
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [deliveryBoys, setDeliveryBoys] = useState([])
  const [assignModal, setAssignModal] = useState(null)
  const [selectedBoy, setSelectedBoy] = useState('')
  const [nowTs, setNowTs] = useState(Date.now())

  const load = async () => {
    setLoading(true)
    try {
      const [orderRes, deliveryRes] = await Promise.all([
        getOrders({ limit: 200 }),
        getDeliveryBoys(),
      ])

      const ordersList = orderRes?.data?.data || orderRes?.data?.orders || orderRes?.data || []
      const deliveryList = deliveryRes?.data?.data || deliveryRes?.data?.users || deliveryRes?.data || []

      setOrders(Array.isArray(ordersList) ? ordersList.map(mapOrder) : [])
      setDeliveryBoys(Array.isArray(deliveryList) ? deliveryList.filter((user) => user.role === 'delivery' && user.is_active !== false) : [])
    } catch (error) {
      setOrders([])
      setDeliveryBoys([])
      toast.error(error?.response?.data?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const changeStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, { status })
      setOrders((prev) => prev.map((item) => item.id === id ? { ...item, status } : item))
      toast.success('Status updated')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status')
    }
  }

  const openOrder = async (order) => {
    setViewLoading(true)
    setViewOrder(order)
    try {
      const response = await getOrder(order.id)
      const detail = response?.data?.data || response?.data || null
      if (!detail) return

      setViewOrder({
        ...order,
        phone: detail.customer_phone || order.phone,
        address: detail.shipping_address || detail.billing_address || order.address,
        paymentMethod: String(detail.payment_method || order.paymentMethod || '-').toUpperCase(),
        items: Array.isArray(detail.items)
          ? detail.items.map((item) => ({
            name: item.product_name || item.name || 'Item',
            qty: toNumber(item.quantity || item.qty || 0),
            price: toNumber(item.unit_price || item.price || 0),
          }))
          : [],
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load order details')
    } finally {
      setViewLoading(false)
    }
  }

  const doAssign = async () => {
    if (!selectedBoy) return
    try {
      await assignDelivery(assignModal.id, { delivery_boy_id: Number(selectedBoy) })
      toast.success('Delivery assigned')
      setAssignModal(null)
      setSelectedBoy('')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign')
    }
  }

  const doCancelOrder = async (order) => {
    if (!isCancellable(order)) return

    const ok = window.confirm('Cancel this order? This is allowed only in first 10 minutes and will rollback stock.')
    if (!ok) return

    try {
      const { data } = await cancelOrder(order.id, { reason: 'Cancelled by admin' })
      const updated = data?.data || {}
      setOrders((prev) => prev.map((item) => item.id === order.id ? mapOrder({ ...item, ...updated }) : item))
      toast.success('Order cancelled')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to cancel this order')
    }
  }

  const sendOrderOnWhatsApp = (order) => {
    if (!order) return

    const safeItems = Array.isArray(order.items) ? order.items : []
    const itemsBlock = safeItems.length
      ? safeItems.map((item) => `• ${item.name} x${item.qty} = ₹${(item.qty * item.price).toLocaleString('en-IN')}`).join('\n')
      : '• Items details available on request'

    const message = [
      `Hello ${order.customerName || 'Customer'},`,
      '',
      `Your bill is ready ✅`,
      `Order: ${order.orderId || `#ORD-${order.id}`}`,
      `Amount: ₹${toNumber(order.total).toLocaleString('en-IN')}`,
      `Payment: ${order.paymentMethod || '-'}`,
      '',
      'Items:',
      itemsBlock,
      '',
      'Thank you for shopping with us 🙏',
    ].join('\n')

    const sent = openWhatsAppMessage(order.phone, message)
    if (sent) toast.success('WhatsApp opened with bill message')
  }

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matched = [o.orderId, o.customerName, o.phone, o.paymentMethod, o.deliveryBoyName].some((value) => String(value || '').toLowerCase().includes(q))
      if (!matched) return false
    }
    return true
  })

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => ['pending', 'processing', 'packed', 'shipped'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }

  if (loading) return <div className="page-enter"><Header title="Orders" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Orders" subtitle={`${orders.length} total orders`} />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Orders" value={stats.total} icon={RiShoppingBagLine} color="indigo" />
          <StatCard title="In Progress" value={stats.pending} icon={RiTimeLine} color="orange" />
          <StatCard title="Delivered" value={stats.delivered} icon={RiCheckboxCircleLine} color="green" />
          <StatCard title="Cancelled" value={stats.cancelled} icon={RiCloseCircleLine} color="red" />
        </div>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-field pl-9 w-72" placeholder="Search order/customer/phone/payment..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStatusFilter('')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!statusFilter ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>All</button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${statusFilter===s ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{s}</button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-3">Showing <span className="font-semibold text-slate-700">{filtered.length}</span> orders</p>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Order ID</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Items</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="table-td font-mono font-bold text-indigo-600">{o.orderId}</td>
                    <td className="table-td">
                      <p className="font-semibold">{o.customerName}</p>
                      <p className="text-xs text-slate-400">{o.phone}</p>
                    </td>
                    <td className="table-td font-bold">₹{o.total?.toLocaleString('en-IN')}</td>
                    <td className="table-td">{o.itemsCount || o.items?.length || '—'} items</td>
                    <td className="table-td"><span className={`badge ${PAYMENT_COLORS[o.paymentMethod?.toLowerCase()] || 'badge-blue'}`}>{o.paymentMethod}</span></td>
                    <td className="table-td">
                      <select value={o.status} onChange={e => changeStatus(o.id, e.target.value)}
                        className={`badge cursor-pointer border-0 outline-none ${STATUS_COLORS[o.status] || 'badge-blue'} capitalize`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {cancellationAuditLabel(o) && (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">{cancellationAuditLabel(o)}</p>
                      )}
                    </td>
                    <td className="table-td text-slate-400">{formatDate(o.createdAt)}</td>
                    <td className="table-td">
                      <div className="flex flex-col items-start gap-1">
                        {getCancelRemainingMs(o, nowTs) > 0 && (
                          <span className="text-[11px] font-semibold text-red-600">
                            Cancel available for {formatCancelRemaining(getCancelRemainingMs(o, nowTs))}
                          </span>
                        )}
                        <div className="flex gap-2">
                        <button onClick={() => openOrder(o)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><RiEyeLine /></button>
                        <button
                          onClick={() => sendOrderOnWhatsApp(o)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          title="Send Bill on WhatsApp"
                        >
                          Send Bill on WhatsApp
                        </button>
                        {ASSIGNABLE_STATUSES.includes(o.status) && (
                          <button
                            onClick={() => { setAssignModal(o); setSelectedBoy(String(o.deliveryBoyId || '')) }}
                            className={`p-2 rounded-lg ${o.deliveryBoyId ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                            title={o.deliveryBoyId ? 'Reassign delivery boy' : 'Assign delivery boy'}
                          >
                            <RiTruckLine />
                          </button>
                        )}
                        {getCancelRemainingMs(o, nowTs) > 0 && (
                          <button
                            onClick={() => doCancelOrder(o)}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700 hover:bg-red-100"
                            title="Cancel order"
                          >
                            Cancel
                          </button>
                        )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">No orders found for this filter/search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Order Modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.orderId || '#'+viewOrder?.id}`} size="md">
        {viewLoading ? <Loader /> : viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-500">Customer</p><p className="font-semibold">{viewOrder.customerName}</p></div>
              <div><p className="text-slate-500">Phone</p><p className="font-semibold">{viewOrder.phone}</p></div>
              <div><p className="text-slate-500">Total</p><p className="font-bold text-emerald-600">₹{viewOrder.total?.toLocaleString('en-IN')}</p></div>
              <div><p className="text-slate-500">Payment</p><p className="font-semibold">{viewOrder.paymentMethod}</p></div>
              <div className="col-span-2"><p className="text-slate-500">Address</p><p className="font-semibold">{viewOrder.address}</p></div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold text-slate-700 mb-2">Items</p>
              <div className="space-y-2">
                {(viewOrder.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
                    <span className="text-sm font-medium">{item.name} × {item.qty}</span>
                    <span className="font-bold">₹{(item.price*item.qty)?.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {!viewOrder.items?.length && (
                  <div className="text-sm text-slate-500">No items found for this order.</div>
                )}
              </div>
            </div>
            <div className="pt-2 border-t">
              <button
                onClick={() => sendOrderOnWhatsApp(viewOrder)}
                className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700"
              >
                Send Bill on WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Delivery Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Delivery Boy" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Order: <strong>{assignModal?.orderId}</strong></p>
          {assignModal?.deliveryBoyName && (
            <p className="text-xs text-slate-500">Currently assigned: <span className="font-semibold text-slate-700">{assignModal.deliveryBoyName}</span></p>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Delivery Boy</label>
            <select className="input-field" value={selectedBoy} onChange={e => setSelectedBoy(e.target.value)}>
              <option value="">Choose...</option>
              {deliveryBoys.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAssignModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={doAssign} disabled={!selectedBoy} className="btn-primary"><RiTruckLine />Assign</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
