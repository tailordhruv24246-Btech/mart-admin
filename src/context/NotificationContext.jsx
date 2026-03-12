import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../api/config'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

const ADMIN_ROLES = new Set(['admin', 'subadmin', 'salesman'])

const getSocketBaseUrl = () => API_BASE_URL.replace(/\/api\/?$/, '')

const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880

    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.26)

    setTimeout(() => ctx.close().catch(() => {}), 300)
  } catch {
    // Ignore browser autoplay/audio context restrictions.
  }
}

const shouldShowDesktopNotification = () => {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden' && 'Notification' in window
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const role = String(user?.role || '').toLowerCase()

    if (!token || !ADMIN_ROLES.has(role)) {
      setConnected(false)
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(getSocketBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${token}`,
      },
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('admin:notification', (payload) => {
      const notification = {
        id: payload?.id || `${Date.now()}`,
        type: payload?.type || 'info',
        title: payload?.title || 'Notification',
        message: payload?.message || 'You have a new update.',
        priority: payload?.priority || 'normal',
        createdAt: payload?.createdAt || new Date().toISOString(),
        meta: payload?.meta || {},
      }

      setNotifications((prev) => [notification, ...prev].slice(0, 50))
      setUnreadCount((prev) => prev + 1)

      toast.success(`${notification.title}: ${notification.message}`, {
        duration: notification.priority === 'high' ? 7000 : 4500,
      })

      playNotificationSound()

      if (shouldShowDesktopNotification() && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message })
      }
    })

    socket.on('connect_error', () => {
      setConnected(false)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user?.id, user?.role])

  const markAllRead = () => setUnreadCount(0)

  const clearNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const value = useMemo(() => ({
    connected,
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
  }), [connected, notifications, unreadCount])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
