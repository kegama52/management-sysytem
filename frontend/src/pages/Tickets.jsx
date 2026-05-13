import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { FunnelIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function TicketList() {
  const [tickets, setTickets] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      let url = '/api/tickets'
      if (statusFilter) {
        url += `?status=${statusFilter}`
      }
      const response = await axios.get(url)
      setTickets(response.data.tickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
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

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateWaitTime = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now - created
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    return `${hours}h ${diffMins % 60}m`
  }

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
        <Link to="/tickets/new" className="btn-primary flex items-center">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input w-auto"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500">No tickets found</p>
          <Link to="/tickets/new" className="btn-primary mt-4 inline-block">
            Create your first ticket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="card hover:shadow-md transition-shadow">
              <Link to={`/tickets/${ticket.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge" style={{
                        backgroundColor: ticket.priority.color + '20',
                        color: ticket.priority.color
                      }}>
                        {ticket.priority.name}
                      </span>
                      <span className={`badge ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                      {ticket.title}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {ticket.description}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Ticket: {ticket.ticketNumber}</span>
                      <span>Dept: {ticket.organization?.directorate}</span>
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>

                  {ticket.assignedTo && (
                    <div className="ml-4 text-right">
                      <p className="text-xs text-gray-500">Assigned to</p>
                      <p className="text-sm font-medium text-gray-700">{ticket.assignedTo.name}</p>
                    </div>
                  )}
                </div>
              </Link>

              {ticket.status === 'open' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Waiting for assignment
                    </span>
                    <span className="text-orange-600 font-medium">
                      {calculateWaitTime(ticket.createdAt)} in queue
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}