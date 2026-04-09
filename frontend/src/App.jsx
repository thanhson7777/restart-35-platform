import './index.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useSelector } from 'react-redux'
import { CreateProfilePage, LoginPage, RegisterPage } from './pages'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const currentUser = useSelector((state) => state.user.currentUser)

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<h1 className="text-3xl font-bold p-8">RESTART 35 PLATFORM</h1>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/profile/create"
          element={
            <ProtectedRoute>
              <CreateProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App