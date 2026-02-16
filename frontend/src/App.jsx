import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Loading...')
  const [dbStatus, setDbStatus] = useState({ loading: true, healthy: false })

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    // 1. Fetch the Greeting Message
    fetch(`${apiUrl}/api/hello/`)
      .then(res => res.json())
      .then(data => setMessage(data.message || data.hello))
      .catch(err => setMessage('Backend not reachable!'));

    // 2. Fetch the Database Health Status
    fetch(`${apiUrl}/api/health/`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => setDbStatus({ loading: false, healthy: true }))
      .catch(() => setDbStatus({ loading: false, healthy: false }));
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Demo Project Frontend</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Message from Backend: <strong>{message}</strong></p>
      </div>

      {/* --- Database Health Indicator --- */}
      <div style={{
        display: 'inline-block',
        padding: '15px 25px',
        borderRadius: '10px',
        backgroundColor: dbStatus.loading ? '#eee' : (dbStatus.healthy ? '#d4edda' : '#f8d7da'),
        border: `1px solid ${dbStatus.healthy ? '#c3e6cb' : '#f5c6cb'}`,
        color: dbStatus.healthy ? '#155724' : '#721c24'
      }}>
        <h3 style={{ margin: 0 }}>
          Database Status: {dbStatus.loading ? 'Checking...' : (dbStatus.healthy ? 'Connected ✅' : 'Disconnected ❌')}
        </h3>
      </div>
    </div>
  )
}

export default App