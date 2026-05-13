import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    governmentId: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        setLoading(false)
        return
      }

      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        setLoading(false)
        return
      }

      if (!formData.acceptTerms) {
        toast.error('Please accept the terms and conditions')
        setLoading(false)
        return
      }

      // Prepare payload - only include optional fields if they have values
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }

      if (formData.phoneNumber.trim()) {
        payload.phoneNumber = formData.phoneNumber.trim()
      }
      if (formData.governmentId.trim()) {
        payload.governmentId = formData.governmentId.trim()
      }

      console.log('Registering with payload:', { ...payload, password: '***' });

      // Register via API
      const response = await axios.post('/api/auth/register', payload)

      // Auto-login after successful registration
      const { token, user } = response.data
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error.response?.status, error.response?.data || error.message);
      const message = error.response?.data?.error || error.message || 'Registration failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">TIISGS</h1>
          <p className="text-sm text-gray-600 mt-2">
            Treasury ICT Support & Governance System
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Create your account to access ICT services
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Create New Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="you@treasury.go.ke"
                required
              />
            </div>

            <div>
              <label className="form-label">Phone Number (optional)</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="form-input"
                placeholder="+254700000000"
              />
            </div>

            <div>
              <label className="form-label">Government ID (optional)</label>
              <input
                type="text"
                name="governmentId"
                value={formData.governmentId}
                onChange={handleChange}
                className="form-input"
                placeholder="GOV-123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your official government employee number
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <ul className="list-disc pl-5 space-y-1">
                <li>Minimum 8 characters</li>
                <li>Accounts are automatically assigned to Budget Unit</li>
                <li>Role: Officer (can be changed by admin later)</li>
              </ul>
            </div>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 mr-2"
                required
              />
              <span className="text-sm text-gray-700">
                I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact ICT Support Unit
          </p>
        </div>
      </div>
    </div>
  )
}