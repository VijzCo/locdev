// src/context/AuthContext.jsx
// If a Firebase Auth user exists but has no Firestore profile yet,
// we set user = null so the app redirects cleanly instead of crashing.
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import { fetchUserProfile } from '@/services/firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await fetchUserProfile(firebaseUser.uid)
          // Profile exists → normal sign-in
          if (profile) {
            setUser(profile)
          } else {
            // Auth account exists but Firestore doc is missing.
            // Happens when user was created in Firebase Console without a profile.
            // Sign them out cleanly so they hit /setup.
            console.warn('No Firestore profile found for this Auth user.')
            setUser(null)
          }
        } catch (err) {
          console.error('Failed to load user profile:', err)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
