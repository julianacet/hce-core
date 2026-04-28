import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './router'
import { AuthProvider } from './context/AuthContext'
import { TemaProvider } from './context/TemaContext'
import { MedicoProvider } from './context/MedicoContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TemaProvider>
      <AuthProvider>
        <MedicoProvider>
          <AppRouter />
        </MedicoProvider>
      </AuthProvider>
    </TemaProvider>
  </StrictMode>,
)
