import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Loading...')
  const [dbStatus, setDbStatus] = useState({ loading: true, healthy: false })

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    fetch(`${apiUrl}/health/`)
      .then(res => res.json())
      .then(data => {
        // Even if DB is down, the backend is reachable, so we show the message
        setMessage(data.message || 'Connected to Backend');
        
        // Check the specific database key we defined in Django
        if (data.database === 'connected') {
          setDbStatus({ loading: false, healthy: true });
        } else {
          setDbStatus({ loading: false, healthy: false });
        }
      })
      .catch(err => {
        // This only triggers if the entire Django container is crashed/stopped
        console.error("Fetch error:", err);
        setMessage('Backend not reachable!');
        setDbStatus({ loading: false, healthy: false });
      });
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Group Project Frontend</h1>
      
      <div style={{ marginBottom: '20px' }}>
        {/* This message will now show "Backend is live, but Database is down" 
            instead of "Backend not reachable" when the DB is off */}
        <p>System Message: <strong>{message}</strong></p>
      </div>

      <div style={{
        display: 'inline-block',
        padding: '15px 25px',
        borderRadius: '10px',
        backgroundColor: dbStatus.loading ? '#eee' : (dbStatus.healthy ? '#d4edda' : '#f8d7da'),
        border: `1px solid ${dbStatus.healthy ? '#c3e6cb' : '#f5c6cb'}`,
        color: dbStatus.healthy ? '#155724' : '#721c24',
        transition: 'all 0.5s ease' // Smooth color transition for the demo
      }}>
        <h3 style={{ margin: 0 }}>
          Database Status: {dbStatus.loading ? 'Checking...' : (dbStatus.healthy ? 'Connected ✅' : 'Disconnected ❌')}
        </h3>
      </div>
    </div>
  )
}

export default App