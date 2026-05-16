import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, login, loginWithPKI } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login successful')
      navigate('/dashboard')
    } catch (error) {
      const message = error.response?.data?.error || 'Invalid credentials'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePKILogin = async () => {
    setLoading(true)
    try {
      await loginWithPKI('MOCK-SERIAL-001', 'CN=Treasury Officer, OU=ICT, O=National Treasury, C=KE')
      toast.success('PKI authentication successful')
      navigate('/dashboard')
    } catch (error) {
      const message = error.response?.data?.error || 'PKI authentication failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">TIISGS</h1>
          <p className="text-sm text-gray-600 mt-2">
            Treasury ICT Support &amp; Governance System
          </p>
          <p className="text-xs text-gray-500 mt-1">
            National Treasury, Kenya
          </p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Sign In</h2>
            <p className="text-sm text-gray-600">Access your ICT support account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">OR</span>
              </div>
            </div>

            <button
              onClick={handlePKILogin}
              disabled={loading}
              className="btn-secondary w-full mt-4 border-2 border-blue-600 text-blue-600"
            >
              <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Sign in with Digital Certificate
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                Create one
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Already registered? Use your email + password.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}