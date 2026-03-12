import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  )
}
