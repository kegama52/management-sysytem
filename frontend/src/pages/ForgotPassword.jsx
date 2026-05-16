import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post('/api/auth/forgot-password', { email })
      setSubmitted(true)
      toast.success('Password reset instructions sent to your email')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset email'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-blue-600">TIISGS</h1>
            <p className="text-sm text-gray-600 mt-2">
              Treasury ICT Support & Governance System
            </p>
            <p className="text-xs text-gray-500 mt-1">
              National Treasury, Kenya
            </p>
          </div>

          <div className="card">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Check Your Email</h2>
              <p className="text-sm text-gray-600 mt-2">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">TIISGS</h1>
          <p className="text-sm text-gray-600 mt-2">
            Treasury ICT Support & Governance System
          </p>
          <p className="text-xs text-gray-500 mt-1">
            National Treasury, Kenya
          </p>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@treasury.go.ke"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}