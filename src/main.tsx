import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Register from './components/screens/Register'

const isRegister = window.location.pathname.startsWith('/register');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRegister ? <Register /> : <App />}
  </StrictMode>,
)
