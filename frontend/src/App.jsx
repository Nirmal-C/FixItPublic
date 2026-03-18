import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './components/Toast'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReportIssuePage from './pages/ReportIssuePage'
import ViewRequestsPage from './pages/ViewRequestsPage'
import TrackIssuePage from './pages/TrackIssuePage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import TicketsPage from './pages/admin/TicketsPage'
import AILogPage from './pages/admin/AILogPage'
import UsersPage from './pages/admin/UsersPage'

// Root component - sets up routing and wraps everything in context providers.
// ThemeProvider and ToastProvider need to be outside the Router so all pages
// can access them without prop drilling.
// AdminAuthProvider sits inside those two (so it can use toast) but outside the Router
// so both the login page and the protected admin layout share the same auth state.
function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="report" element={<ReportIssuePage />} />
            <Route path="requests" element={<ViewRequestsPage />} />
            <Route path="track" element={<TrackIssuePage />} />
            <Route path="track/:id" element={<TrackIssuePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Admin login — standalone page, no sidebar */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin protected pages — AdminLayout handles the auth guard */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage />} />
            <Route index element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="ai-log" element={<AILogPage />} />
          </Route>
        </Routes>
      </Router>
    </AdminAuthProvider>
    </ToastProvider>
    </ThemeProvider>
  )
}

export default App
