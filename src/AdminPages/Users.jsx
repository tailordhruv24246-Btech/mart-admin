import React, { useEffect, useMemo, useState } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import ConfirmDialog from '../Components/ConfirmDialog'
import Loader from '../Components/Loader'
import StatCard from '../Components/StatCard'
import {
  createUser,
  deleteUser,
  getCustomerAddresses,
  getCustomerCart,
  getCustomerWishlist,
  getUsers,
  updateUser,
} from '../api/endpoints'
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
  RiSearchLine,
  RiShieldUserLine,
  RiShoppingBagLine,
  RiTruckLine,
  RiUserLine,
  RiUserSettingsLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  role: 'subadmin',
  password: '',
  is_active: true,
  address: '',
  adminDepartment: '',
  subAdminAccess: '',
  salesArea: '',
  deliveryZone: '',
  deliveryShift: '',
}

const STAFF_ROLES = ['admin', 'subadmin', 'salesman', 'delivery']
const ROLE_COLORS = {
  admin: 'badge-purple',
  subadmin: 'badge-blue',
  salesman: 'badge-green',
  delivery: 'badge-yellow',
  customer: 'badge-blue',
}
const ROLE_LABELS = {
  admin: 'Admin',
  subadmin: 'Sub Admin',
  salesman: 'Salesman',
  delivery: 'Delivery',
  customer: 'Customer',
}
const ROLE_ADDRESSES = {
  admin: 'Office Address',
  subadmin: 'Branch Address',
  salesman: 'Coverage Area Address',
  delivery: 'Delivery Hub Address',
}
const ROLE_FORM_HINTS = {
  admin: 'Create a full-access admin account for management operations.',
  subadmin: 'Sub admin gets restricted modules based on assigned access scope.',
  salesman: 'Salesman account is used for walk-in or assigned sales activities.',
  delivery: 'Delivery account is used to track and complete assigned orders.',
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const [viewMode, setViewMode] = useState('staff')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [customerModal, setCustomerModal] = useState(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerInsight, setCustomerInsight] = useState({
    cartItems: [],
    cartSummary: { total_items: 0, subtotal: 0 },
    addresses: [],
    wishlist: [],
  })

  const load = async () => {
    setLoading(true)
    try {
      const response = await getUsers({ include_customers: 1 })
      const list = response?.data?.data || response?.data?.users || response?.data || []
      setUsers(Array.isArray(list) ? list : [])
    } catch (error) {
      setUsers([])
      toast.error(error?.response?.data?.message || 'Users load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const staffUsers = useMemo(() => users.filter((item) => STAFF_ROLES.includes(item.role)), [users])
  const customerUsers = useMemo(() => users.filter((item) => item.role === 'customer'), [users])
  const currentUsers = viewMode === 'customers' ? customerUsers : staffUsers

  const filteredUsers = useMemo(() => {
    return currentUsers.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const active = typeof user.is_active === 'boolean' ? user.is_active : Number(user.is_active) === 1
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? active : !active)
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || [user.name, user.email, user.phone, user.role].some((value) => String(value || '').toLowerCase().includes(q))
      return matchesRole && matchesStatus && matchesSearch
    })
  }, [currentUsers, roleFilter, search, statusFilter])

  const stats = useMemo(() => {
    if (viewMode === 'customers') {
      return {
        total: customerUsers.length,
        active: customerUsers.filter((item) => (typeof item.is_active === 'boolean' ? item.is_active : Number(item.is_active) === 1)).length,
        withPhone: customerUsers.filter((item) => !!item.phone).length,
        recent: customerUsers.filter((item) => {
          const created = new Date(item.createdAt)
          if (Number.isNaN(created.getTime())) return false
          const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 30
        }).length,
      }
    }

    return {
      total: staffUsers.length,
      active: staffUsers.filter((item) => (typeof item.is_active === 'boolean' ? item.is_active : Number(item.is_active) === 1)).length,
      admins: staffUsers.filter((item) => item.role === 'admin' || item.role === 'subadmin').length,
      delivery: staffUsers.filter((item) => item.role === 'delivery').length,
    }
  }, [customerUsers, staffUsers, viewMode])

  const openAddByRole = (role) => {
    setEditing(null)
    setForm({ ...EMPTY, role })
    setModal(true)
  }

  const openEdit = (user) => {
    if (!STAFF_ROLES.includes(user.role)) {
      toast.error('Customer profile edit is not enabled from this screen.')
      return
    }

    setEditing(user)
    setForm({
      ...EMPTY,
      ...user,
      is_active: typeof user.is_active === 'boolean' ? user.is_active : Number(user.is_active) === 1,
      address: user.address || '',
      password: '',
    })
    setModal(true)
  }

  const buildRoleMeta = () => {
    if (form.role === 'admin' && form.adminDepartment?.trim()) return `Department: ${form.adminDepartment.trim()}`
    if (form.role === 'subadmin' && form.subAdminAccess?.trim()) return `Access Scope: ${form.subAdminAccess.trim()}`
    if (form.role === 'salesman' && form.salesArea?.trim()) return `Sales Area: ${form.salesArea.trim()}`
    if (form.role === 'delivery') {
      const deliveryParts = [
        form.deliveryZone?.trim() ? `Zone: ${form.deliveryZone.trim()}` : '',
        form.deliveryShift?.trim() ? `Shift: ${form.deliveryShift.trim()}` : '',
      ].filter(Boolean)
      return deliveryParts.join(' | ')
    }
    return ''
  }

  const save = async () => {
    if (!form.name?.trim() || !form.email?.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!editing && !form.password?.trim()) {
      toast.error('Password is required for new user')
      return
    }

    if (form.role === 'admin' && !form.adminDepartment?.trim()) {
      toast.error('Admin department is required')
      return
    }
    if (form.role === 'subadmin' && !form.subAdminAccess?.trim()) {
      toast.error('Sub Admin access scope is required')
      return
    }
    if (form.role === 'salesman' && !form.salesArea?.trim()) {
      toast.error('Salesman area is required')
      return
    }
    if (form.role === 'delivery' && (!form.deliveryZone?.trim() || !form.deliveryShift?.trim())) {
      toast.error('Delivery zone and shift are required')
      return
    }

    setSaving(true)
    try {
      const roleMeta = buildRoleMeta()
      const addressText = [form.address?.trim(), roleMeta].filter(Boolean).join('\n')

      const payload = {
        name: form.name?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim() || null,
        role: form.role,
        is_active: !!form.is_active,
        address: addressText || null,
      }

      if (form.password?.trim()) payload.password = form.password

      if (editing) {
        await updateUser(editing.id, payload)
        toast.success('User updated')
      } else {
        await createUser(payload)
        toast.success('User created')
      }

      setModal(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const openCustomerInsights = async (user) => {
    setCustomerModal(user)
    setCustomerLoading(true)
    setCustomerInsight({
      cartItems: [],
      cartSummary: { total_items: 0, subtotal: 0 },
      addresses: [],
      wishlist: [],
    })

    try {
      const [cartRes, addressRes, wishlistRes] = await Promise.all([
        getCustomerCart(user.id),
        getCustomerAddresses(user.id),
        getCustomerWishlist(user.id),
      ])

      const cartData = cartRes?.data?.data || {}
      setCustomerInsight({
        cartItems: Array.isArray(cartData?.items) ? cartData.items : [],
        cartSummary: cartData?.summary || { total_items: 0, subtotal: 0 },
        addresses: Array.isArray(addressRes?.data?.data) ? addressRes.data.data : [],
        wishlist: Array.isArray(wishlistRes?.data?.data) ? wishlistRes.data.data : [],
      })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load customer commerce details')
    } finally {
      setCustomerLoading(false)
    }
  }

  const renderRoleSpecificFields = () => {
    if (form.role === 'admin') {
      return (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Department *</label>
          <input
            className="input-field"
            value={form.adminDepartment}
            onChange={e => setForm({ ...form, adminDepartment: e.target.value })}
            placeholder="Ex: Operations, Management"
          />
        </div>
      )
    }

    if (form.role === 'subadmin') {
      return (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Sub Admin Access Scope *</label>
          <input
            className="input-field"
            value={form.subAdminAccess}
            onChange={e => setForm({ ...form, subAdminAccess: e.target.value })}
            placeholder="Ex: Category + Orders + Users"
          />
        </div>
      )
    }

    if (form.role === 'salesman') {
      return (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Sales Area *</label>
          <input
            className="input-field"
            value={form.salesArea}
            onChange={e => setForm({ ...form, salesArea: e.target.value })}
            placeholder="Ex: Sector 21, Main Bazaar"
          />
        </div>
      )
    }

    return (
      <>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Zone *</label>
          <input
            className="input-field"
            value={form.deliveryZone}
            onChange={e => setForm({ ...form, deliveryZone: e.target.value })}
            placeholder="Ex: Zone A, East Route"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Shift *</label>
          <select
            className="input-field"
            value={form.deliveryShift}
            onChange={e => setForm({ ...form, deliveryShift: e.target.value })}
          >
            <option value="">Select Shift</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </select>
        </div>
      </>
    )
  }

  if (loading) return <div className="page-enter"><Header title="Users" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header
        title="User Management"
        subtitle={viewMode === 'customers' ? 'View customer commerce insights (cart, addresses, wishlist)' : 'Manage admin, subadmin, salesman & delivery accounts'}
      />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => { setViewMode('staff'); setRoleFilter('all') }}
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${viewMode === 'staff' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            Staff Users
          </button>
          <button
            onClick={() => { setViewMode('customers'); setRoleFilter('all') }}
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${viewMode === 'customers' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            Customers
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard title={viewMode === 'customers' ? 'Total Customers' : 'Total Staff'} value={stats.total} icon={RiUserLine} color="indigo" />
          <StatCard title="Active" value={stats.active} icon={RiShieldUserLine} color="green" />
          {viewMode === 'customers' ? (
            <>
              <StatCard title="With Phone" value={stats.withPhone} icon={RiCheckboxCircleLine} color="purple" />
              <StatCard title="Joined (30 Days)" value={stats.recent} icon={RiUserSettingsLine} color="orange" />
            </>
          ) : (
            <>
              <StatCard title="Admin Team" value={stats.admins} icon={RiUserSettingsLine} color="purple" />
              <StatCard title="Delivery Team" value={stats.delivery} icon={RiTruckLine} color="orange" />
            </>
          )}
        </div>

        <div className="card mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-10"
                placeholder="Search by name, email, phone or role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className="input-field" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {(viewMode === 'customers' ? ['customer'] : STAFF_ROLES).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>

            <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {viewMode === 'staff' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredUsers.length}</span> users</p>
              <button onClick={() => openAddByRole('subadmin')} className="btn-primary"><RiAddLine />Add User</button>
            </div>
          </>
        )}

        {viewMode === 'customers' && (
          <p className="text-sm text-slate-500 mb-4">Showing <span className="font-semibold text-slate-700">{filteredUsers.length}</span> customers</p>
        )}

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold">{user.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-slate-500">{user.email}</td>
                    <td className="table-td">{user.phone || '-'}</td>
                    <td className="table-td"><span className={`badge ${ROLE_COLORS[user.role] || 'badge-blue'}`}>{ROLE_LABELS[user.role] || user.role}</span></td>
                    <td className="table-td">
                      {(typeof user.is_active === 'boolean' ? user.is_active : Number(user.is_active) === 1)
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-red">Inactive</span>}
                    </td>
                    <td className="table-td text-slate-400">{formatDate(user.createdAt)}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {user.role === 'customer' && (
                          <button onClick={() => openCustomerInsights(user)} className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600" title="View customer commerce details">
                            <RiEyeLine />
                          </button>
                        )}
                        {STAFF_ROLES.includes(user.role) && (
                          <button onClick={() => openEdit(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600" title="Edit user">
                            <RiEditLine />
                          </button>
                        )}
                        <button onClick={() => setConfirm(user)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete user">
                          <RiDeleteBinLine />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No users found for current search/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${ROLE_LABELS[form.role] || 'User'}` : `Add ${ROLE_LABELS[form.role] || 'User'}`} size="md">
        <p className="text-xs text-slate-500 mb-3">{ROLE_FORM_HINTS[form.role]}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[['name', 'Full Name *'], ['email', 'Email *'], ['phone', 'Phone'], ['password', editing ? 'New Password (leave blank to keep)' : 'Password *']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
              <input className="input-field" type={key === 'password' ? 'password' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={label} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Role *</label>
            <select className="input-field" value={form.role} onChange={e => setForm({ ...EMPTY, ...form, role: e.target.value })}>
              {STAFF_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select className="input-field" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">{ROLE_ADDRESSES[form.role]}</label>
            <textarea
              className="input-field min-h-[84px]"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Address / office location"
            />
          </div>

          {renderRoleSpecificFields()}
        </div>
        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving || !form.name || !form.email} className="btn-primary">{saving ? 'Saving...' : 'Save User'}</button>
        </div>
      </Modal>

      <Modal open={!!customerModal} onClose={() => setCustomerModal(null)} title={customerModal ? `Customer Detail: ${customerModal.name}` : 'Customer Detail'} size="xl">
        {customerLoading ? (
          <Loader />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Cart Items</p>
                <p className="text-2xl font-bold text-slate-800">{toNumber(customerInsight.cartSummary.total_items)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Cart Value</p>
                <p className="text-2xl font-bold text-slate-800">₹{toNumber(customerInsight.cartSummary.subtotal).toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Addresses</p>
                <p className="text-2xl font-bold text-slate-800">{customerInsight.addresses.length}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <p className="text-xs text-slate-500">Wishlist Items</p>
                <p className="text-2xl font-bold text-slate-800">{customerInsight.wishlist.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RiShoppingBagLine className="text-indigo-600" />
                  <p className="font-semibold text-slate-800">Cart Detail</p>
                </div>
                {!customerInsight.cartItems.length ? (
                  <p className="text-sm text-slate-500">No cart items found.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerInsight.cartItems.map((item) => (
                      <div key={item.cart_item_id || item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">Qty: {toNumber(item.quantity)} • ₹{toNumber(item.current_price).toFixed(2)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800">₹{(toNumber(item.quantity) * toNumber(item.current_price)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <p className="font-semibold text-slate-800 mb-3">Saved Addresses</p>
                {!customerInsight.addresses.length ? (
                  <p className="text-sm text-slate-500">No addresses saved.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerInsight.addresses.map((address) => (
                      <div key={address.id} className="rounded-lg border border-slate-100 p-2">
                        <p className="text-sm font-semibold text-slate-800">{address.label || 'Address'} {address.is_default ? '(Default)' : ''}</p>
                        <p className="text-xs text-slate-500">{address.recipient_name} • {address.phone}</p>
                        <p className="text-xs text-slate-500 mt-1">{address.full_address || address.address_line}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card p-4">
              <p className="font-semibold text-slate-800 mb-3">Wishlist</p>
              {!customerInsight.wishlist.length ? (
                <p className="text-sm text-slate-500">Wishlist is empty.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {customerInsight.wishlist.map((item) => (
                    <div key={item.wishlist_item_id || item.id} className="rounded-lg border border-slate-100 p-2">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Price: ₹{toNumber(item.current_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await deleteUser(confirm.id)
            toast.success('User deleted')
            load()
          } catch (error) {
            toast.error(error?.response?.data?.message || 'Delete failed')
          }
          setConfirm(null)
        }}
        title="Delete User"
        message={`Delete user "${confirm?.name}"?`}
      />
    </div>
  )
}
