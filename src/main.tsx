import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Register from './components/screens/Register'
import { LanguageProvider } from './context/LanguageContext'

const isRegister = window.location.pathname.startsWith('/register');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRegister
      ? <LanguageProvider><Register /></LanguageProvider>
      : <App />}
  </StrictMode>,
)
