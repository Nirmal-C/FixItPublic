import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReportIssuePage from './pages/ReportIssuePage'
import ViewRequestsPage from './pages/ViewRequestsPage'

// Root component - sets up routing and wraps everything in context providers.
// ThemeProvider and ToastProvider need to be outside the Router so all pages
// can access them without prop drilling.
function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="report" element={<ReportIssuePage />} />
            <Route path="requests" element={<ViewRequestsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
    </ThemeProvider>
  )
}

export default App
