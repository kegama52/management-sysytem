import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const API_URL = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
      // Optional: Uncomment to enable auto-login in development (non-blocking)
      // if (import.meta.env.DEV) {
      //   login('kevohkevi110@gmail.com', 'Password123').catch(() => {})
      // }
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`)
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const loginWithPKI = async (certificateSerial, certificateDn) => {
    const response = await axios.post(`${API_URL}/auth/login-pki`, {
      certificate_serial: certificateSerial,
      certificate_dn: certificateDn
    })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    login,
    loginWithPKI,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}