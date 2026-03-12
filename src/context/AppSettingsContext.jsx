import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getPublicSettings } from '../api/endpoints'

const DEFAULT_SETTINGS = {
  brandName: 'Mart',
  adminPanelName: 'Mart Admin',
  deliveryPanelName: 'Mart Delivery',
  websiteName: 'Mart',
  websiteTagline: 'Your one-stop shop for daily essentials',
  supportEmail: 'support@mart.com',
  supportPhone: '+91 98765 43210',
  storeAddress: '123 Main St, Mumbai, Maharashtra 400001',
  currency: 'INR',
  currencySymbol: '₹',
  logoUrl: '',
}

const AppSettingsContext = createContext(null)

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const response = await getPublicSettings()
      const payload = response?.data?.data || response?.data || {}
      setSettings((prev) => ({ ...prev, ...(payload || {}) }))
    } catch {
      setSettings((prev) => ({ ...prev }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const value = useMemo(() => ({
    settings,
    loading,
    refreshSettings: loadSettings,
    setSettings,
  }), [settings, loading])

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider')
  }
  return context
}
