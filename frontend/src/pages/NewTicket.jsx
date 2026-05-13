import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ShieldCheckIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function NewTicket() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [priorities, setPriorities] = useState([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors }, setValue, trigger } = useForm()

  useEffect(() => {
    fetchFormData()
  }, [])

  const fetchFormData = async () => {
    try {
      const [catRes, priRes] = await Promise.all([
        axios.get('/api/tickets/categories'),
        axios.get('/api/tickets/priorities')
      ])
      setCategories(catRes.data.categories || [])
      setPriorities(priRes.data.priorities || [])
    } catch (error) {
      console.error('Failed to fetch form data:', error)
    }
  }

  const onSubmit = async (data) => {
    // Validate obligations acceptance
    if (!data.acceptObligations) {
      toast.error('You must accept the client obligations to submit a ticket')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/tickets', {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority
      })

      toast.success('Ticket created successfully')
      navigate(`/tickets/${response.data.ticket.id}`)
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create ticket'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Support Ticket</h1>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Rights Statement */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Your Rights (Constitution of Kenya 2010, Art 47)
            </h3>
            <ul className="text-xs text-blue-800 space-y-1 ml-7 list-disc">
              <li>Right to timely service (e.g., 30 min for user support, 10 days for hardware repair)</li>
              <li>Right to quality assistance and professional courtesy</li>
              <li>Right to confidentiality of your sensitive information</li>
              <li>Right to lodge a complaint if service standards are not met</li>
            </ul>
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Issue Title *</label>
            <input
              {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'Title must be at least 5 characters' } })}
              className="form-input"
              placeholder="Brief description of the issue (e.g., IFMIS voucher submission error)"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Detailed Description *</label>
            <textarea
              {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })}
              rows={6}
              className="form-input"
              placeholder="Include error messages, steps to reproduce, screenshots (attach if available)..."
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="form-label">Service Category *</label>
              <select {...register('category', { required: 'Category is required' })} className="form-input">
                <option value="">Select service...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.code}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Select the service that matches your issue (aligned to Government Service Charter)
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="form-label">Priority *</label>
              <select {...register('priority', { required: 'Priority is required' })} className="form-input">
                <option value="">Select priority...</option>
                {priorities.map(pri => (
                  <option key={pri.id} value={pri.code}>{pri.name}</option>
                ))}
              </select>
              {errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>}
            </div>
          </div>

          {/* Service Standard Info (informative) */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Expected Service Standards</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>• User Support: within 30 minutes</div>
              <div>• Email Account: within 30 minutes</div>
              <div>• Network Diagnosis: site-dependent</div>
              <div>• Hardware Repair: within 10 working days</div>
              <div>• Major Escalation: within 6 weeks</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These standards are per Kakamega County ICT Service Charter & National Treasury guidelines.
            </p>
          </div>

          {/* Client Obligations Acknowledgement */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">Client Obligations</h3>
            <p className="text-xs text-yellow-800 mb-3">
              By submitting this ticket, you acknowledge and agree to:
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('acceptObligations', { required: 'You must accept the obligations' })}
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-xs text-yellow-900">
                I will utilize ICT equipment procedurally and with care. I will provide full, sincere and accurate information. I will relate to ICT staff with courtesy and respect.
              </span>
            </label>
            {errors.acceptObligations && <p className="text-red-600 text-sm mt-1">{errors.acceptObligations.message}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Need help? Visit the <a href="/knowledge-base" className="text-blue-600 hover:underline">Knowledge Base</a> or consult the{' '}
          <a href="#" className="text-blue-600 hover:underline">AI Assistant</a> before creating a ticket.
        </p>
      </div>
    </div>
  )
}