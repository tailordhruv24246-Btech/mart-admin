import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { getSettings, updateSettings, downloadBackup } from '../api/endpoints'
import { useAppSettings } from '../context/AppSettingsContext'
import { RiDownloadLine, RiImageAddLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const DEFAULTS = {
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
  defaultGST: '18',
  invoicePrefix: 'INV',
  orderPrefix: 'ORD',
  lowStockAlert: '10',
  enableSMS: 'false',
  enableEmail: 'true',
  timezone: 'Asia/Kolkata',
  logoUrl: '',
}

export default function Settings() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const { refreshSettings } = useAppSettings()

  useEffect(() => {
    getSettings()
      .then((response) => {
        const payload = response?.data?.data || response?.data || {}
        setForm({ ...DEFAULTS, ...(payload || {}) })
      })
      .catch(() => setForm(DEFAULTS))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, value == null ? '' : String(value))
      })

      if (logoFile) {
        payload.append('logo_file', logoFile)
      }

      const response = await updateSettings(payload)
      const updated = response?.data?.data || response?.data || {}
      setForm((prev) => ({ ...prev, ...(updated || {}) }))
      setLogoFile(null)
      await refreshSettings()
      toast.success('Settings saved! Applied across all panels.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const downloadBackupFile = async () => {
    setBackupLoading(true)
    try {
      const response = await downloadBackup()
      const blob = new Blob([response.data], { type: 'application/json' })
      const contentDisposition = response.headers?.['content-disposition'] || ''
      const fileMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
      const fileName = fileMatch?.[1] || `mart-backup-${new Date().toISOString().slice(0, 10)}.json`

      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      window.URL.revokeObjectURL(url)

      toast.success('Backup downloaded successfully')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Backup download failed')
    } finally {
      setBackupLoading(false)
    }
  }

  const f = (key, label, type = 'text', opts = null) => (
    <div key={key}>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {opts ? (
        <select className="input-field" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}>
          {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input className="input-field" type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
      )}
    </div>
  )

  if (loading) return <div className="page-enter"><Header title="Settings" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Settings" subtitle="Global branding, system preferences, and backup controls" />
      <div className="p-6 space-y-6 max-w-5xl">

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4 text-base">🏷️ Branding & Panel Names</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {f('brandName', 'Brand Name')}
            {f('websiteName', 'Website Name')}
            {f('adminPanelName', 'Admin Panel Name')}
            {f('deliveryPanelName', 'Delivery Panel Name')}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Website Tagline</label>
              <input className="input-field" value={form.websiteTagline || ''} onChange={e => setForm({ ...form, websiteTagline: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Logo</label>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <label className="btn-secondary cursor-pointer">
                  <RiImageAddLine /> Upload Logo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setLogoFile(file)
                      setForm((prev) => ({ ...prev, logoUrl: URL.createObjectURL(file) }))
                    }}
                  />
                </label>
                <input
                  className="input-field flex-1"
                  value={form.logoUrl || ''}
                  onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="Or paste logo URL"
                />
              </div>
              {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="mt-3 w-16 h-16 rounded-xl object-cover border border-slate-200" />}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4 text-base">🏪 Contact & Store Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {f('supportEmail', 'Support Email')}
            {f('supportPhone', 'Support Phone')}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
              <textarea className="input-field" rows={2} value={form.storeAddress || ''} onChange={e => setForm({ ...form, storeAddress: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4 text-base">💰 Financial Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {f('currency', 'Currency', null, [['INR', 'INR - Indian Rupee'], ['USD', 'USD - US Dollar']])}
            {f('currencySymbol', 'Currency Symbol')}
            {f('defaultGST', 'Default GST Rate', null, [['0', '0%'], ['5', '5%'], ['12', '12%'], ['18', '18%'], ['28', '28%']])}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4 text-base">📄 Invoice Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {f('invoicePrefix', 'Invoice Prefix')}
            {f('orderPrefix', 'Order Prefix')}
            {f('lowStockAlert', 'Low Stock Alert (qty)', 'number')}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4 text-base">🔔 Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {f('enableEmail', 'Email Notifications', null, [['true', 'Enabled'], ['false', 'Disabled']])}
            {f('enableSMS', 'SMS Notifications', null, [['true', 'Enabled'], ['false', 'Disabled']])}
            {f('timezone', 'Timezone', null, [['Asia/Kolkata', 'Asia/Kolkata (IST)'], ['UTC', 'UTC'], ['America/New_York', 'America/New_York']])}
          </div>
        </div>

        <div className="card border border-indigo-100 bg-indigo-50/40">
          <h3 className="font-bold text-slate-900 mb-2 text-base">🗂️ Full Backup</h3>
          <p className="text-sm text-slate-600 mb-4">Admin can download full JSON backup of current database tables + app settings.</p>
          <button onClick={downloadBackupFile} disabled={backupLoading} className="btn-secondary">
            <RiDownloadLine /> {backupLoading ? 'Preparing Backup...' : 'Download Full Backup'}
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  )
}
