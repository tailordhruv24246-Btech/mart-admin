import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FiHome, FiTag, FiLayers, FiPackage, FiShoppingCart, FiTruck,
  FiUsers, FiDollarSign, FiBarChart2, FiSettings, FiLogOut,
  FiMenu, FiX, FiShoppingBag, FiChevronDown, FiBell, FiCreditCard
} from 'react-icons/fi'

const navGroups = [
  {
    group: 'Overview',
    items: [
      { to: '/admin', icon: FiHome, label: 'Dashboard', exact: true },
    ]
  },
  {
    group: 'Catalog',
    items: [
      { to: '/admin/categories', icon: FiTag, label: 'Categories' },
      { to: '/admin/subcategories', icon: FiLayers, label: 'Sub Categories' },
      { to: '/admin/products', icon: FiPackage, label: 'Products' },
    ]
  },
  {
    group: 'Sales',
    items: [
      { to: '/admin/pos', icon: FiCreditCard, label: 'POS System' },
      { to: '/admin/orders', icon: FiShoppingCart, label: 'Orders' },
      { to: '/admin/assign-delivery', icon: FiTruck, label: 'Assign Delivery' },
    ]
  },
  {
    group: 'Inventory',
    items: [
      { to: '/admin/suppliers', icon: FiUsers, label: 'Suppliers' },
      { to: '/admin/purchase', icon: FiDollarSign, label: 'Purchase Entry' },
    ]
  },
  {
    group: 'Admin',
    items: [
      { to: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
      { to: '/admin/users', icon: FiUsers, label: 'Staff Users', adminOnly: true },
      { to: '/admin/settings', icon: FiSettings, label: 'Settings', adminOnly: true },
    ]
  }
]

function SidebarLink({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    >
      <item.icon className="text-lg flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColors = {
    admin: 'bg-primary/20 text-primary',
    subadmin: 'bg-amber-500/20 text-amber-400',
    salesman: 'bg-emerald-500/20 text-emerald-400',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-20'} flex-shrink-0 bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <FiShoppingBag className="text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg text-white">Mart Admin</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navGroups.map((group) => {
            const items = group.items.filter(i => !i.adminOnly || hasRole('admin'))
            if (!items.length) return null
            return (
              <div key={group.group} className="mb-4">
                {sidebarOpen && (
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
                    {group.group}
                  </p>
                )}
                {items.map(item => (
                  <SidebarLink key={item.to} item={item} />
                ))}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-dark">
            <div className="w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColors[user?.role] || 'bg-slate-600 text-slate-300'}`}>
                  {user?.role}
                </span>
              </div>
            )}
          </div>
          <button onClick={handleLogout}
            className="sidebar-link w-full mt-1 text-danger hover:bg-danger/10 hover:text-danger">
            <FiLogOut />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors">
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
              <FiBell />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
