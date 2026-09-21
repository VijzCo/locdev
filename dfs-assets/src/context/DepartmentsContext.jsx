// src/context/DepartmentsContext.jsx
// Fetches departments from Firestore and shares them globally.
// - departments      → string[]  (for all dropdowns)
// - departmentDocs   → object[]  (full docs, for the management page)
// - reload()         → re-fetches after add/edit/delete
// Falls back to DEFAULT_DEPARTMENTS if Firestore is empty or unreachable.

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchDepartments } from '@/services/firebase/departments'
import { useAuth } from './AuthContext'

export const DEFAULT_DEPARTMENTS = [
  'IT', 'HR', 'Finance', 'Operations', 'Management',
]

const DepartmentsContext = createContext({
  departments:    DEFAULT_DEPARTMENTS,
  departmentDocs: [],
  loading:        false,
  reload:         () => {},
})

export function DepartmentsProvider({ children }) {
  const { user } = useAuth()
  const [departmentDocs, setDepartmentDocs] = useState([])
  const [departments, setDepartments]       = useState(DEFAULT_DEPARTMENTS)
  const [loading, setLoading]               = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const docs = await fetchDepartments()
      if (docs.length > 0) {
        setDepartmentDocs(docs)
        setDepartments(docs.map(d => d.name))
      } else {
        // Firestore empty — seed the UI with defaults
        // (user can add real ones from the Departments page)
        setDepartmentDocs([])
        setDepartments(DEFAULT_DEPARTMENTS)
      }
    } catch (err) {
      console.warn('DepartmentsContext: could not load from Firestore, using defaults.', err.message)
      setDepartmentDocs([])
      setDepartments(DEFAULT_DEPARTMENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  return (
    <DepartmentsContext.Provider value={{ departments, departmentDocs, loading, reload: load }}>
      {children}
    </DepartmentsContext.Provider>
  )
}

export function useDepartments() {
  return useContext(DepartmentsContext)
}
