import { useEffect, useState } from 'react'

const BACKEND_URL = 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <div>
      <h1>WebShop</h1>
      <p>Backend status: {status}</p>
    </div>
  )
}

export default App
