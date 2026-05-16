import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { VoiceProvider } from './context/VoiceContext'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import NewTicket from './pages/NewTicket'
import KnowledgeBase from './pages/KnowledgeBase'
import Assets from './pages/Assets'
import ICTQueue from './pages/ICTQueue'
import AIAssistant from './pages/AIAssistant'
import Layout from './components/Layout'

const queryClient = new QueryClient()

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

   if (loading) {
     return <div style={{ padding: "20px" }}>Loading...</div>
   }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VoiceProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="tickets" element={<TicketList />} />
                <Route path="tickets/new" element={<NewTicket />} />
                <Route path="tickets/:id" element={<TicketDetail />} />
                <Route path="knowledge-base" element={<KnowledgeBase />} />
                <Route path="ai-assistant" element={<AIAssistant />} />
              <Route
                path="ict-queue"
                element={
                  <ProtectedRoute roles={['ict_officer', 'ict_supervisor', 'admin']}>
                    <ICTQueue />
                  </ProtectedRoute>
                }
                />
                <Route
                  path="assets"
                  element={
                    <ProtectedRoute roles={['ict_officer', 'ict_supervisor', 'admin', 'auditor']}>
                      <Assets />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </VoiceProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App