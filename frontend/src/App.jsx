import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './components/Toast'
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext'
import { CitizenAuthProvider } from './contexts/CitizenAuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReportIssuePage from './pages/ReportIssuePage'
import ViewRequestsPage from './pages/ViewRequestsPage'
import TrackIssuePage from './pages/TrackIssuePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CitizenDashboardPage from './pages/CitizenDashboardPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import TicketsPage from './pages/admin/TicketsPage'
import AILogPage from './pages/admin/AILogPage'
import UsersPage from './pages/admin/UsersPage'

function HomeRedirect() {
  const { isAuthenticated } = useAdminAuth()
  if (isAuthenticated) return <Navigate to="/admin" replace />
  return <HomePage />
}

function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AdminAuthProvider>
    <CitizenAuthProvider>
      <Router>
        <Routes>
          {/* Public routes — wrapped in Layout (Navbar + Footer) */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="report" element={<ReportIssuePage />} />
            <Route path="requests" element={<ViewRequestsPage />} />
            <Route path="track" element={<TrackIssuePage />} />
            <Route path="track/:id" element={<TrackIssuePage />} />
            <Route path="dashboard" element={<CitizenDashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Citizen auth — standalone pages (no Layout sidebar) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin protected pages */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage />} />
            <Route index element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="ai-log" element={<AILogPage />} />
          </Route>
        </Routes>
      </Router>
    </CitizenAuthProvider>
    </AdminAuthProvider>
    </ToastProvider>
    </ThemeProvider>
  )
}

export default App
