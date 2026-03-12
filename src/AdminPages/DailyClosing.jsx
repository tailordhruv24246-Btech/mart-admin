import React, { useEffect, useState } from 'react'
import Header from '../Components/Header'
import Loader from '../Components/Loader'
import { addExpenseEntry, getDailyClosingReport, getExpenseEntries } from '../api/endpoints'
import { RiAddLine, RiMoneyRupeeCircleLine, RiWallet3Line } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function DailyClosing() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [savingExpense, setSavingExpense] = useState(false)
  const [closing, setClosing] = useState(null)
  const [expenses, setExpenses] = useState([])

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    payment_method: 'cash',
    note: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [closingRes, expenseRes] = await Promise.all([
        getDailyClosingReport({ date }),
        getExpenseEntries({ date }),
      ])

      setClosing(closingRes?.data?.data || null)
      setExpenses(expenseRes?.data?.data?.expenses || [])
    } catch (error) {
      setClosing(null)
      setExpenses([])
      toast.error(error?.response?.data?.message || 'Failed to load daily closing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [date])

  const addExpense = async (event) => {
    event.preventDefault()
    const amount = Number(expenseForm.amount)

    if (!expenseForm.category || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Category and valid amount are required')
      return
    }

    setSavingExpense(true)
    try {
      await addExpenseEntry({ ...expenseForm, amount, expense_date: date })
      toast.success('Expense added')
      setExpenseForm({ category: '', amount: '', payment_method: 'cash', note: '' })
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to add expense')
    } finally {
      setSavingExpense(false)
    }
  }

  const pos = closing?.pos || { cash: 0, upi: 0, card: 0, other: 0, total: 0, transactions: 0 }
  const online = closing?.online || { cod: 0, upi: 0, card: 0, other: 0, total: 0, orders: 0 }

  return (
    <div className="page-enter">
      <Header title="Daily Closing Report" subtitle="Cash, UPI, COD, expenses and net collection in one screen" />

      <div className="p-6 space-y-6">
        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {loading ? <Loader /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <p className="text-sm text-slate-500">Gross Collection</p>
                <p className="text-2xl font-black text-indigo-600">₹{Number(closing?.gross_collection || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="card">
                <p className="text-sm text-slate-500">Total Expenses</p>
                <p className="text-2xl font-black text-red-600">₹{Number(closing?.expenses || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="card">
                <p className="text-sm text-slate-500">Net Collection</p>
                <p className="text-2xl font-black text-emerald-600">₹{Number(closing?.net_collection || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="card">
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-2xl font-black text-blue-600">{Number(pos.transactions || 0) + Number(online.orders || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><RiWallet3Line /> POS Collections</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Cash</span><strong>₹{Number(pos.cash || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>UPI</span><strong>₹{Number(pos.upi || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>Card</span><strong>₹{Number(pos.card || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>Other</span><strong>₹{Number(pos.other || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between border-t pt-2"><span>Total</span><strong>₹{Number(pos.total || 0).toLocaleString('en-IN')}</strong></div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><RiMoneyRupeeCircleLine /> Online/Delivery Collections</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>COD</span><strong>₹{Number(online.cod || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>UPI</span><strong>₹{Number(online.upi || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>Card</span><strong>₹{Number(online.card || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between"><span>Other</span><strong>₹{Number(online.other || 0).toLocaleString('en-IN')}</strong></div>
                  <div className="flex justify-between border-t pt-2"><span>Total</span><strong>₹{Number(online.total || 0).toLocaleString('en-IN')}</strong></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <form onSubmit={addExpense} className="card lg:col-span-2 space-y-3">
                <h3 className="font-bold text-slate-900">Add Expense</h3>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Category</label>
                  <input className="input-field" value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Electricity / Delivery / Rent" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Amount</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Payment Method</label>
                  <select className="input-field" value={expenseForm.payment_method} onChange={(e) => setExpenseForm((prev) => ({ ...prev, payment_method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Note</label>
                  <textarea rows={2} className="input-field" value={expenseForm.note} onChange={(e) => setExpenseForm((prev) => ({ ...prev, note: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary" disabled={savingExpense}>{savingExpense ? 'Saving...' : <><RiAddLine /> Add Expense</>}</button>
              </form>

              <div className="card lg:col-span-3 overflow-x-auto">
                <h3 className="font-bold text-slate-900 mb-3">Expense Entries</h3>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="table-th">Time</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Method</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {!expenses.length && (
                      <tr>
                        <td colSpan={5} className="table-td text-center text-slate-500">No expense entries for selected date.</td>
                      </tr>
                    )}
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="table-td">{new Date(expense.created_at).toLocaleTimeString('en-IN')}</td>
                        <td className="table-td">{expense.category}</td>
                        <td className="table-td uppercase">{expense.payment_method}</td>
                        <td className="table-td font-semibold text-red-600">₹{Number(expense.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="table-td max-w-xs truncate" title={expense.note || ''}>{expense.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
