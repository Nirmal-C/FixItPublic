import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    // We point to localhost:8000 because your BROWSER is making the request
    fetch('http://localhost:8000/api/hello/')
      .then(res => res.json())
      .then(data => setMessage(data.message || data.hello))
      .catch(err => setMessage('Backend not reachable yet!'))
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Group Project Frontend</h1>
      <p>Message from Backend: <strong>{message}</strong></p>
    </div>
  )
}

export default App