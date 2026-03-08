import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Connecting to API...')
  const [status, setStatus] = useState({
    loading: true,
    dbHealthy: false,
    storageHealthy: false
  })

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    // 1. Check General Backend Greeting
    fetch(`${apiUrl}/hello/`)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Backend is completely unreachable! Check AKS LoadBalancer.'));

    // 2. Check Unified Health (Database + Azure Storage)
    fetch(`${apiUrl}/health/`)
      .then(res => res.json())
      .then(data => {
        setStatus({
          loading: false,
          dbHealthy: data.database === 'connected',
          storageHealthy: data.storage === 'connected'
        });
        if (data.message) setMessage(data.message);
      })
      .catch(() => {
        setStatus({ loading: false, dbHealthy: false, storageHealthy: false });
      });
  }, [])

  // Helper for dynamic card styling
  const cardStyle = (isHealthy) => ({
    display: 'inline-block',
    margin: '10px',
    padding: '20px 30px',
    borderRadius: '12px',
    minWidth: '250px',
    backgroundColor: status.loading ? '#f0f0f0' : (isHealthy ? '#d4edda' : '#f8d7da'),
    border: `2px solid ${isHealthy ? '#c3e6cb' : '#f5c6cb'}`,
    color: isHealthy ? '#155724' : '#721c24',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.4s ease'
  });

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#333' }}>Group Project Dashboard</h1>
      
      <div style={{ marginBottom: '40px', padding: '15px', background: '#fff', borderRadius: '8px', display: 'inline-block', border: '1px solid #ddd' }}>
        <strong>System Notification:</strong> <br/>
        <span style={{ color: '#555' }}>{message}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Database Status Card */}
        <div style={cardStyle(status.dbHealthy)}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase' }}>Database</h3>
          <h2 style={{ margin: 0 }}>
            {status.loading ? '🔍 Checking...' : (status.dbHealthy ? 'Connected ✅' : 'Disconnected ❌')}
          </h2>
        </div>

        {/* Azure Storage Status Card */}
        <div style={cardStyle(status.storageHealthy)}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', textTransform: 'uppercase' }}>Azure Storage</h3>
          <h2 style={{ margin: 0 }}>
            {status.loading ? '🔍 Checking...' : (status.storageHealthy ? 'Connected ✅' : 'Disconnected ❌')}
          </h2>
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          Infrastructure: <strong>Azure Kubernetes Service (AKS)</strong>
        </p>
      </div>
    </div>
  )
}

export default App