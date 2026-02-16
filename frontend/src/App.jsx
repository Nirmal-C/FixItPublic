import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Connecting to API...')
  const [dbStatus, setDbStatus] = useState({ loading: true, healthy: false })

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    // 1. Check General Backend Greeting
    fetch(`${apiUrl}/hello/`)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Backend is completely unreachable!'));

    // 2. Check Database Specific Health
    fetch(`${apiUrl}/health/`)
      .then(res => res.json())
      .then(data => {
        if (data.database === 'connected') {
          setDbStatus({ loading: false, healthy: true });
        } else {
          setDbStatus({ loading: false, healthy: false });
          setMessage(data.message); 
        }
      })
      .catch(() => {
        setDbStatus({ loading: false, healthy: false });
      });
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Group Project Dashboard</h1>
      
      <div style={{ marginBottom: '30px', padding: '10px', fontSize: '1.2rem' }}>
        System Notification: <br/>
        <strong>{message}</strong>
      </div>

      <div style={{
        display: 'inline-block',
        padding: '20px 40px',
        borderRadius: '12px',
        backgroundColor: dbStatus.loading ? '#f0f0f0' : (dbStatus.healthy ? '#d4edda' : '#f8d7da'),
        border: `2px solid ${dbStatus.healthy ? '#c3e6cb' : '#f5c6cb'}`,
        color: dbStatus.healthy ? '#155724' : '#721c24',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.4s ease'
      }}>
        <h2 style={{ margin: 0 }}>
          Database Status: {dbStatus.loading ? '🔍 Checking...' : (dbStatus.healthy ? 'Connected ✅' : 'Disconnected ❌')}
        </h2>
      </div>
      
      <p style={{ marginTop: '20px', color: '#666' }}>AKS Cluster Environment</p>
    </div>
  )
}

export default App