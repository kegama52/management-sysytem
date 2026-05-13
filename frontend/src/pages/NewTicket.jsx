import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

export default function NewTicket() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [priorities, setPriorities] = useState([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Ticket</h1>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="form-label">Title</label>
            <input
              {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'Title must be at least 5 characters' } })}
              className="form-input"
              placeholder="Brief description of the issue"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })}
              rows={6}
              className="form-input"
              placeholder="Detailed description of the issue, including any error messages and steps to reproduce..."
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category</label>
              <select {...register('category', { required: 'Category is required' })} className="form-input">
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.code}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className="form-label">Priority</label>
              <select {...register('priority', { required: 'Priority is required' })} className="form-input">
                <option value="">Select priority...</option>
                {priorities.map(pri => (
                  <option key={pri.id} value={pri.code}>{pri.name}</option>
                ))}
              </select>
              {errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority.message}</p>}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Before submitting:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check the Knowledge Base for self-help solutions</li>
              <li>• Try basic troubleshooting: restart computer, check connections</li>
              <li>• Gather error messages and screenshots if available</li>
            </ul>
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
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}