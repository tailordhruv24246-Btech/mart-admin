import React, { useMemo, useState } from 'react'
import { RiBellLine } from 'react-icons/ri'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/AppSettingsContext'
import { useNotifications } from '../context/NotificationContext'

const formatTime = (value) => {
  if (!value) return 'now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'now'

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function Header({ title, subtitle }) {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const { connected, notifications, unreadCount, markAllRead, clearNotifications } = useNotifications()
  const [openPanel, setOpenPanel] = useState(false)
  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications])

  return (
    <header className="header-shell px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {settings.logoUrl
          ? <img src={settings.logoUrl} alt="Brand" className="w-9 h-9 rounded-xl object-cover border border-slate-200" />
          : null}
        <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5 leading-5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => {
              const next = !openPanel
              setOpenPanel(next)
              if (next) markAllRead()
            }}
            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900 relative border border-transparent hover:border-slate-200"
          >
            <RiBellLine className="text-xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {openPanel && (
            <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">{connected ? 'Live connected' : 'Reconnecting...'}</p>
                </div>
                <button onClick={clearNotifications} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Clear
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {latestNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
                ) : (
                  latestNotifications.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatTime(item.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-5">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-sm text-slate-500 border border-slate-200 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <span className="font-medium text-slate-700">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
