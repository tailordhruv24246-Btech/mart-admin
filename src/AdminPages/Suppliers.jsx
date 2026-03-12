import React, { useState, useEffect } from 'react'
import Header from '../Components/Header'
import Modal from '../Components/Modal'
import ConfirmDialog from '../Components/ConfirmDialog'
import Loader from '../Components/Loader'
import StatCard from '../Components/StatCard'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/endpoints'
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiBuildingLine, RiSearchLine, RiMailLine, RiFileTextLine, RiPhoneLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

const EMPTY = { name:'', contactPerson:'', phone:'', email:'', address:'', gstin:'', bankDetails:'' }

export default function Suppliers() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const toUiSupplier = (supplier) => ({
    ...supplier,
    contactPerson: supplier.contactPerson || '',
    gstin: supplier.gstin || supplier.gst_number || '',
    bankDetails: supplier.bankDetails || supplier.bank_name || '',
  })

  const toApiPayload = (value) => ({
    name: value.name?.trim(),
    email: value.email || null,
    phone: value.phone || null,
    address: value.address || null,
    gst_number: value.gstin || null,
    bank_name: value.bankDetails || null,
  })

  const load = () => {
    getSuppliers()
      .then((r) => {
        const suppliers = r.data?.data || []
        setList(Array.isArray(suppliers) ? suppliers.map(toUiSupplier) : [])
      })
      .catch((error) => {
        setList([])
        toast.error(error?.response?.data?.message || 'Failed to load suppliers')
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (s) => { setEditing(s); setForm({...EMPTY,...s}); setModal(true) }

  const save = async () => {
    if (!form.name?.trim()) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)
    try {
      const payload = toApiPayload(form)
      if (editing) { await updateSupplier(editing.id, payload); toast.success('Supplier updated') }
      else { await createSupplier(payload); toast.success('Supplier added') }
      setModal(false); load()
    } catch (error) { toast.error(error?.response?.data?.message || 'Failed') } finally { setSaving(false) }
  }

  const filteredSuppliers = list.filter((supplier) => {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return [
      supplier.name,
      supplier.contactPerson,
      supplier.phone,
      supplier.email,
      supplier.gstin,
      supplier.address,
    ].some((value) => String(value || '').toLowerCase().includes(query))
  })

  const stats = {
    total: list.length,
    withEmail: list.filter((supplier) => supplier.email).length,
    withGst: list.filter((supplier) => supplier.gstin).length,
    withPhone: list.filter((supplier) => supplier.phone).length,
  }

  if (loading) return <div className="page-enter"><Header title="Suppliers" /><Loader /></div>

  return (
    <div className="page-enter">
      <Header title="Suppliers" subtitle="Manage your supplier master" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Suppliers" value={stats.total} icon={RiBuildingLine} color="indigo" />
          <StatCard title="With Email" value={stats.withEmail} icon={RiMailLine} color="blue" />
          <StatCard title="With GST" value={stats.withGst} icon={RiFileTextLine} color="green" />
          <StatCard title="With Phone" value={stats.withPhone} icon={RiPhoneLine} color="orange" />
        </div>

        <div className="card mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="md:col-span-2 relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-10"
                placeholder="Search supplier by company, phone, email, GST..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="md:justify-self-end">
              <button onClick={openAdd} className="btn-primary w-full md:w-auto"><RiAddLine />Add Supplier</button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredSuppliers.length}</span> of {list.length} suppliers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!filteredSuppliers.length && (
            <div className="card text-sm text-slate-500 md:col-span-2 lg:col-span-3">No suppliers found.</div>
          )}
          {filteredSuppliers.map(s => (
            <div key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <RiBuildingLine className="text-blue-600 text-2xl" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600"><RiEditLine /></button>
                  <button onClick={() => setConfirm(s)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><RiDeleteBinLine /></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-900">{s.name}</h3>
              <p className="text-sm text-slate-500">{s.contactPerson || 'No contact person added'}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>📞 {s.phone || '-'}</p>
                <p>✉️ {s.email || '-'}</p>
                {s.gstin && <p>🏛️ GSTIN: {s.gstin}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[['name','Company Name *'],['contactPerson','Contact Person'],['phone','Phone'],['email','Email'],['gstin','GSTIN'],['address','Address']].map(([k,l]) => (
            <div key={k} className={k==='address'?'md:col-span-2':''}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{l}</label>
              {k==='address'
                ? <textarea className="input-field" rows={2} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} />
                : <input className="input-field" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={l} />
              }
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving||!form.name} className="btn-primary">{saving?'Saving...':'Save'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={async () => {
        try { await deleteSupplier(confirm.id); toast.success('Supplier deleted'); load() } catch (error) { toast.error(error?.response?.data?.message || 'Failed') }
        setConfirm(null)
      }} title="Delete Supplier" message={`Delete "${confirm?.name}"?`} />
    </div>
  )
}
