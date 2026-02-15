import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    // Get the API URL from environment variables
    // If it's undefined, it defaults to an empty string (relative path)
    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    fetch(`${apiUrl}/hello/`)
      .then(res => res.json())
      .then(data => setMessage(data.message || data.hello))
      .catch(err => {
        console.error("Fetch error:", err);
        setMessage('Backend not reachable yet!');
      })
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Demo Project Frontend</h1>
      <p>Message from Backend: <strong>{message}</strong></p>
    </div>
  )
}

export default App