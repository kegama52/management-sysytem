import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  QueueListIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function ICTQueue() {
  const [queue, setQueue] = useState({ pendingCount: 0, tickets: [] })
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchQueue()
    fetchOfficers()
    const interval = setInterval(fetchQueue, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchQueue = async () => {
    try {
      const response = await axios.get('/api/tickets/queue/pending')
      setQueue(response.data)
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    }
  }

  const fetchOfficers = async () => {
    try {
      const response = await axios.get('/api/users/ict-officers')
      setOfficers(response.data.officers)
    } catch (error) {
      console.error('Failed to fetch officers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (ticketId, officerId) => {
    try {
      await axios.post(`/api/tickets/${ticketId}/assign`, { officerId })
      toast.success('Ticket assigned')
      fetchQueue()
      fetchOfficers()
    } catch (error) {
      console.error('Failed to assign:', error)
    }
  }

  const getUrgencyColor = (urgency) => {
    if (urgency <= 15) return 'text-red-600 bg-red-100'
    if (urgency <= 30) return 'text-orange-600 bg-orange-100'
    if (urgency <= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'on_break': return 'bg-blue-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const formatWaitTime = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const availableOfficers = officers.filter(o => o.status === 'available').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ICT Support Queue</h1>
        <div className="flex items-center gap-4">
          <span className="badge bg-red-100 text-red-800 text-lg py-2">
            {queue.pendingCount} Pending
          </span>
          <span className="text-sm text-gray-600">
            {availableOfficers} officers available
          </span>
        </div>
      </div>

      {/* Officer Status */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Officer Availability</h2>
        {loading ? (
          <p className="text-gray-500">Loading officers...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {officers.map((officer) => (
              <div
                key={officer.id}
                className={`p-4 border rounded-lg ${
                  officer.currentTicket ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{officer.lastName}</span>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(officer.status)}`}></div>
                </div>
                <p className="text-sm text-gray-600 truncate">{officer.email}</p>
                <p className="text-xs text-gray-500 mt-1">{officer.unit?.name}</p>
                {officer.currentTicket && (
                  <p className="text-xs text-yellow-700 mt-2 font-medium">
                    Currently assigned
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Tickets */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <QueueListIcon className="h-5 w-5" />
          Pending Tickets ({queue.tickets.length})
        </h2>

        {queue.tickets.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">No pending tickets. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge`} style={{
                        backgroundColor: ticket.priority.color + '20',
                        color: ticket.priority.color
                      }}>
                        {ticket.priority.name}
                      </span>
                      <span className="badge bg-red-100 text-red-800">
                        {ticket.status}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Reporter: {ticket.reporterName}</span>
                      <span>Dept: {ticket.directorateName}</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatWaitTime(ticket.waitMinutes)}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${getUrgencyColor(ticket.urgency)}`}>
                      {ticket.urgency}m left
                    </div>
                    <button
                      onClick={() => handleAssign(ticket.id, 'available-officer-id')}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Assign to Me
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <ClockIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{queue.pendingCount}</p>
          <p className="text-sm text-gray-600">Awaiting Response</p>
        </div>
        <div className="card text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {queue.tickets.filter(t => t.urgency < 30).length}
          </p>
           <p className="text-sm text-gray-600">Urgent (&lt; 30m)</p>
        </div>
        <div className="card text-center">
          <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {officers.filter(o => o.status === 'available').length}
          </p>
          <p className="text-sm text-gray-600">Available Officers</p>
        </div>
      </div>
    </div>
  )
}