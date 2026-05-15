import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import AppRouter from './router'
import { AuthProvider } from './context/AuthContext'
import { TemaProvider } from './context/TemaContext'
import { MedicoProvider } from './context/MedicoContext'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TemaProvider>
          <AuthProvider>
            <MedicoProvider>
              <AppRouter />
            </MedicoProvider>
          </AuthProvider>
        </TemaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
