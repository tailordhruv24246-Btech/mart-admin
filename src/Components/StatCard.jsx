import React from 'react'
export default function StatCard({ title, value, icon: Icon, color = 'indigo', change, sub, onClick }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`stat-card w-full text-left ${onClick ? 'cursor-pointer hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-semibold">{title}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ring-1 ring-white ${colors[color]}`}>
          <Icon className="text-2xl" />
        </div>
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-3 font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
        </p>
      )}
    </Wrapper>
  )
}
