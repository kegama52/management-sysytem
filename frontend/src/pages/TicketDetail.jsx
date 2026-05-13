import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { format, formatDistanceToNow } from 'date-fns'

export default function TicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTicket()
  }, [id])

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/${id}`)
      setTicket(response.data.ticket)
      setComments(response.data.comments || [])
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      await axios.post(`/api/tickets/${id}/comment`, {
        comment: newComment,
        isInternal
      })
      setNewComment('')
      setIsInternal(false)
      fetchTicket()
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800'
      case 'assigned': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading ticket...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Ticket not found</p>
        <Link to="/tickets" className="btn-primary mt-4 inline-block">
          Back to Tickets
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link to="/tickets" className="text-sm text-blue-600 hover:underline">
                Tickets
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-sm text-gray-500">{ticket.ticketNumber}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`badge ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className="badge" style={{
                backgroundColor: ticket.priority.color + '20',
                color: ticket.priority.color
              }}>
                {ticket.priority.name} Priority
              </span>
              <span className="text-sm text-gray-500">
                Category: {ticket.category.name}
              </span>
            </div>
          </div>

          <div className="text-right text-sm text-gray-500">
            <p>Created: {format(new Date(ticket.createdAt), 'PPpp')}</p>
            {ticket.resolvedAt && (
              <p>Resolved: {format(new Date(ticket.resolvedAt), 'PPpp')}</p>
            )}
          </div>
        </div>

        {/* Reporter Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Reporter</h3>
            <p className="text-gray-900">{ticket.reporter.name}</p>
            <p className="text-sm text-gray-500">{ticket.reporter.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Organization</h3>
            <p className="text-gray-900">{ticket.organization?.directorate}</p>
            <p className="text-sm text-gray-500">{ticket.organization?.unit}</p>
          </div>
        </div>

        {/* Assigned Tech */}
        {ticket.assignedTo && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Assigned ICT Officer</h3>
            <p className="text-gray-900">{ticket.assignedTo.name}</p>
            <p className="text-sm text-gray-500">{ticket.assignedTo.email}</p>
          </div>
        )}

        {/* Description */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Issue Description</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="whitespace-pre-wrap text-gray-700">{ticket.description}</p>
          </div>
        </div>

        {/* Resolution */}
        {ticket.resolutionNotes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Resolution</h3>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Method:</span> {ticket.resolutionMethod}
              </p>
              <p className="whitespace-pre-wrap text-gray-700">{ticket.resolutionNotes}</p>
              {ticket.timeSpent && (
                <p className="text-sm text-gray-500 mt-2">
                  Time spent: {Math.floor(ticket.timeSpent / 60)}h {ticket.timeSpent % 60}m
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Timeline</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Ticket Created</p>
                <p className="text-xs text-gray-500">{format(new Date(ticket.createdAt), 'PPpp')}</p>
              </div>
            </div>
            {ticket.assignedAt && (
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Assigned to ICT Officer</p>
                  <p className="text-xs text-gray-500">{format(new Date(ticket.assignedAt), 'PPpp')}</p>
                </div>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Issue Resolved</p>
                  <p className="text-xs text-gray-500">{format(new Date(ticket.resolvedAt), 'PPpp')}</p>
                </div>
              </div>
            )}
            {ticket.closedAt && (
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Ticket Closed</p>
                  <p className="text-xs text-gray-500">{format(new Date(ticket.closedAt), 'PPpp')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Comments & Updates ({comments.length})</h3>

        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg ${comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <div className="flex items-center gap-2">
                    {comment.isInternal && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                        Internal
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), 'PPpp')}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        {ticket.status !== 'closed' && (
          <form onSubmit={handleAddComment} className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Add Comment</h4>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="form-input mb-2"
              placeholder="Add an update or comment..."
            />
            {ticket.assignedTo && (
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Internal note (visible only to ICT staff)</span>
              </label>
            )}
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="btn-primary"
            >
              {submitting ? 'Sending...' : 'Add Comment'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}