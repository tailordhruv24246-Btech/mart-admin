// import React, { createContext, useContext, useState, useEffect } from 'react'
// import { login as apiLogin, getMe } from '../api/endpoints'
// import toast from 'react-hot-toast'

// const AuthContext = createContext(null)

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(() => {
//     try { return JSON.parse(localStorage.getItem('admin_user')) } catch { return null }
//   })
//   const [loading, setLoading] = useState(false)

//   const login = async (email, password) => {
//     setLoading(true)
//     try {
//       const { data } = await apiLogin({ email, password })
//       localStorage.setItem('admin_token', data.token)
//       localStorage.setItem('admin_user', JSON.stringify(data.user))
//       setUser(data.user)
//       toast.success(`Welcome back, ${data.user.name}!`)
//       return data.user
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Login failed')
//       throw err
//     } finally {
//       setLoading(false)
//     }
//   }

//   const logout = () => {
//     localStorage.removeItem('admin_token')
//     localStorage.removeItem('admin_user')
//     setUser(null)
//     toast.success('Logged out successfully')
//   }

//   const hasRole = (...roles) => roles.includes(user?.role)

//   return (
//     <AuthContext.Provider value={{ user, login, logout, loading, hasRole }}>
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export const useAuth = () => useContext(AuthContext)



import React, { createContext, useContext, useState } from 'react'
import { login as apiLogin } from '../api/endpoints'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_user'))
    } catch {
      return null
    }
  })

  const [loading, setLoading] = useState(false)

const login = async (email, password) => {
  setLoading(true)
  try {
    const response = await apiLogin({ email, password })

    // ✅ correct structure
    const token = response.data.data.token
    const user = response.data.data.user

    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))

    setUser(user)

    toast.success(`Welcome back, ${user.name}!`)
    return user
  } catch (err) {
    toast.error(err.response?.data?.message || 'Login failed')
    throw err
  } finally {
    setLoading(false)
  }
}

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const hasRole = (...roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const value = {
    user,
    login,
    logout,
    loading,
    hasRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 👇 Separate stable function (important)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}