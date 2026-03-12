import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppSettingsProvider } from './context/AppSettingsContext'
import { NotificationProvider } from './context/NotificationContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import Layout from './Components/Layout'

// Pages
import Login from './AdminPages/Login'
import Dashboard from './AdminPages/Dashboard'
import Categories from './AdminPages/Categories'
import SubCategories from './AdminPages/SubCategories'
import Products from './AdminPages/Products'
import ExcelImport from './AdminPages/ExcelImport'
import Orders from './AdminPages/Orders'
import AssignDelivery from './AdminPages/AssignDelivery'
import Suppliers from './AdminPages/Suppliers'
import Purchases from './AdminPages/Purchases'
import PurchasesList from './AdminPages/PurchasesList'
import POS from './AdminPages/POS'
import Reports from './AdminPages/Reports'
import Users from './AdminPages/Users'
import Settings from './AdminPages/Settings'
import InventoryAdjustments from './AdminPages/InventoryAdjustments'
import DailyClosing from './AdminPages/DailyClosing'
import ReorderSuggestions from './AdminPages/ReorderSuggestions'

// Delivery pages
import DeliveryDashboard from './DeliveryPages/DeliveryDashboard'
import DeliveryOrders from './DeliveryPages/DeliveryOrders'
import CODTracking from './DeliveryPages/CODTracking'

const ADMIN_ROLES = ['admin', 'subadmin', 'salesman']

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role==='delivery'?'/delivery/dashboard':'/admin/dashboard'} /> : <Login />} />
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Admin Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute roles={ADMIN_ROLES}>
          <Layout>
            <Routes>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="categories" element={<Categories />} />
              <Route path="subcategories" element={<SubCategories />} />
              <Route path="products" element={<Products />} />
              <Route path="import" element={<ExcelImport />} />
              <Route path="orders" element={<Orders />} />
              <Route path="delivery-assign" element={<AssignDelivery />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="purchases-list" element={<PurchasesList />} />
              <Route path="inventory-adjustments" element={<InventoryAdjustments />} />
              <Route path="daily-closing" element={<DailyClosing />} />
              <Route path="reorder-suggestions" element={<ReorderSuggestions />} />
              <Route path="pos" element={<POS />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="dashboard" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Delivery Routes */}
      <Route path="/delivery/*" element={
        <ProtectedRoute roles={['delivery', 'admin', 'subadmin']}>
          <Layout>
            <Routes>
              <Route path="dashboard" element={<DeliveryDashboard />} />
              <Route path="orders" element={<DeliveryOrders />} />
              <Route path="cod" element={<CODTracking />} />
              <Route path="*" element={<Navigate to="dashboard" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-6xl mb-4">🚫</p>
            <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
            <p className="text-slate-500 mt-2">You don't have permission to view this page.</p>
            <a href="/login" className="btn-primary mt-6 inline-flex">Back to Login</a>
          </div>
        </div>
      } />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppSettingsProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" toastOptions={{
              style: {
                borderRadius: '14px',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
              }
            }} />
          </BrowserRouter>
        </AppSettingsProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
