// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin } from '../api'

const AppContext = createContext({})

export function AppProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('nexus-theme') === 'dark')
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('nexus_token') || null,
    user:  JSON.parse(localStorage.getItem('nexus_user') || 'null'),
  }))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('nexus-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleDark = useCallback(() => setDark(d => !d), [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    if (data.success) {
      localStorage.setItem('nexus_token', data.token)
      localStorage.setItem('nexus_user', JSON.stringify(data.user))
      setAuth({ token: data.token, user: data.user })
    }
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('nexus_token')
    localStorage.removeItem('nexus_user')
    setAuth({ token: null, user: null })
  }, [])

  return (
    <AppContext.Provider value={{ dark, toggleDark, auth, login, logout }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
