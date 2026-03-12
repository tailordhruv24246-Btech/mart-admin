import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/AppSettingsContext'
import {
  RiDashboardLine, RiShoppingBag3Line, RiListOrdered, RiTruckLine,
  RiBarChartLine, RiSettings4Line, RiLogoutBoxLine, RiStoreLine,
  RiPriceTag3Line, RiApps2Line, RiFileExcel2Line, RiUserLine,
  RiBuildingLine, RiShoppingCartLine, RiMenuLine,
  RiArrowRightSLine
} from 'react-icons/ri'

const ADMIN_LINKS = [
  { to: '/admin/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
  {
    label: 'Products',
    icon: RiShoppingBag3Line,
    groupKey: 'products',
    children: [
      { to: '/admin/categories', icon: RiApps2Line, label: 'Categories' },
      { to: '/admin/subcategories', icon: RiPriceTag3Line, label: 'Sub-Cats' },
      { to: '/admin/products', icon: RiShoppingBag3Line, label: 'Items' },
      { to: '/admin/import', icon: RiFileExcel2Line, label: 'Import' },
    ],
  },
  {
    label: 'Sales',
    icon: RiStoreLine,
    groupKey: 'sales',
    children: [
      { to: '/admin/pos', icon: RiStoreLine, label: 'POS' },
      { to: '/admin/orders', icon: RiListOrdered, label: 'Orders' },
      { to: '/admin/delivery-assign', icon: RiTruckLine, label: 'Dispatch' },
    ],
  },
  {
    label: 'Stock',
    icon: RiBuildingLine,
    groupKey: 'stock',
    children: [
      { to: '/admin/suppliers', icon: RiBuildingLine, label: 'Suppliers' },
      { to: '/admin/purchases', icon: RiShoppingCartLine, label: 'Purchases' },
      { to: '/admin/purchases-list', icon: RiListOrdered, label: 'Invoices' },
      { to: '/admin/inventory-adjustments', icon: RiPriceTag3Line, label: 'Returns' },
      { to: '/admin/reorder-suggestions', icon: RiBarChartLine, label: 'Reorder' },
    ],
  },
  {
    label: 'Reports',
    icon: RiBarChartLine,
    groupKey: 'reports',
    children: [
      { to: '/admin/daily-closing', icon: RiStoreLine, label: 'Daily Close' },
      { to: '/admin/reports', icon: RiBarChartLine, label: 'Analytics' },
    ],
  },
  {
    label: 'Admin',
    icon: RiSettings4Line,
    groupKey: 'admin',
    children: [
      { to: '/admin/users', icon: RiUserLine, label: 'Users' },
      { to: '/admin/settings', icon: RiSettings4Line, label: 'Settings' },
    ],
  },
]

const DELIVERY_LINKS = [
  { to: '/delivery/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
  { to: '/delivery/orders', icon: RiListOrdered, label: 'My Orders' },
  { to: '/delivery/cod', icon: RiShoppingCartLine, label: 'COD Tracking' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { settings } = useAppSettings()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState({ products: true, sales: false, stock: false, reports: false, admin: false })
  const isDelivery = user?.role === 'delivery'
  const links = isDelivery ? DELIVERY_LINKS : ADMIN_LINKS
  const panelName = isDelivery ? (settings.deliveryPanelName || 'Mart Delivery') : (settings.adminPanelName || 'Mart Admin')
  const logoUrl = settings.logoUrl || ''

  useEffect(() => {
    if (isDelivery) return

    const activeGroup = ADMIN_LINKS.find((link) =>
      Array.isArray(link.children) && link.children.some((child) => location.pathname.startsWith(child.to))
    )

    if (activeGroup?.groupKey) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.groupKey]: true }))
    }
  }, [location.pathname, isDelivery])

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 transition-all duration-300`}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

      <div className="sidebar-surface absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-slate-900/30" aria-hidden="true" />
      <div className="relative z-10 flex flex-col h-full">
      
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Brand" className="w-8 h-8 rounded-lg object-cover bg-white" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <RiStoreLine className="text-white text-lg" />
              </div>
            )}
            <span className="text-white font-bold text-lg tracking-tight">{panelName}</span>
          </div>
        )}
        {collapsed && (logoUrl
          ? <img src={logoUrl} alt="Brand" className="w-8 h-8 rounded-lg object-cover bg-white mx-auto" />
          : <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <RiStoreLine className="text-white text-lg" />
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto border border-transparent hover:border-white/20">
          {collapsed ? <RiArrowRightSLine /> : <RiMenuLine />}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {links.map((link, i) => {
          if (link.type === 'section') {
            return !collapsed ? (
              <p key={i} className="text-xs font-bold text-slate-500 uppercase tracking-widest pt-4 pb-1 px-2">{link.label}</p>
            ) : <div key={i} className="my-2 border-t border-white/10" />
          }

          if (Array.isArray(link.children)) {
            const GroupIcon = link.icon
            const isChildActive = link.children.some((child) => location.pathname.startsWith(child.to))
            const isOpen = Boolean(openGroups[link.groupKey])

            return (
              <div key={`group-${link.groupKey}`} className="space-y-1">
                <button
                  onClick={() => !collapsed && setOpenGroups((prev) => ({ ...prev, [link.groupKey]: !isOpen }))}
                  className={`sidebar-link w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} ${isChildActive ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <GroupIcon className="text-lg flex-shrink-0" />
                    {!collapsed && <span>{link.label}</span>}
                  </span>
                  {!collapsed && (
                    <RiArrowRightSLine className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="ml-3 space-y-1 border-l border-white/15 pl-3">
                    {link.children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) => `sidebar-link py-2.5 text-xs ${isActive ? 'active' : ''}`}
                        >
                          <ChildIcon className="text-base flex-shrink-0" />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const Icon = link.icon
          return (
            <NavLink key={link.to} to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
              <Icon className="text-lg flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={logout}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}>
          <RiLogoutBoxLine className="text-lg flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
      </div>
    </aside>
  )
}
