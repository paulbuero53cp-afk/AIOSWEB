import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Register from './components/screens/Register'
import AgentCatalog from './components/screens/AgentCatalog'
import { LanguageProvider } from './context/LanguageContext'

const path = window.location.pathname;
const isRegister   = path.startsWith('/register');
const isAgentHub   = path.startsWith('/agenthub');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRegister  ? <LanguageProvider><Register /></LanguageProvider>
    : isAgentHub ? <LanguageProvider><AgentCatalog /></LanguageProvider>
    : <App />}
  </StrictMode>,
)
