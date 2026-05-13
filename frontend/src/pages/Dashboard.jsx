import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    assignedTickets: 0,
    resolvedToday: 0,
    avgTTR: 0,
    myTickets: 0
  })
  const [recentTickets, setRecentTickets] = useState([])
  const [loading, setLoading] = useState(true)

  // AI Assistant state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiFaqs, setAiFaqs] = useState([])
  const [aiMessage, setAiMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, aiSuggestions])

  const fetchDashboardData = async () => {
    try {
      const [ticketsRes] = await Promise.all([
        axios.get('/api/tickets?limit=20')
      ])

      const tickets = ticketsRes.data.tickets

      setStats({
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        assignedTickets: tickets.filter(t => t.status === 'assigned').length,
        resolvedToday: tickets.filter(t => t.status === 'resolved' && new Date(t.resolvedAt).toDateString() === new Date().toDateString()).length,
        avgTTR: 120,
        myTickets: tickets.filter(t => t.assignedTo?.id === 'current-user').length
      })

      setRecentTickets(tickets.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAiConsult = async (e) => {
    e?.preventDefault()
    if (!aiQuery.trim()) return

    const userQuery = aiQuery.trim()
    setAiLoading(true)
    setAiQuery('')
    setAiMessage('')
    setAiSuggestions([])
    setAiFaqs([])

    // Add user message to chat
    setChatHistory(prev => [...prev, { type: 'user', text: userQuery }])

    try {
      const response = await axios.post('/api/ai/chat', {
        query: userQuery,
        userId: 'current-user'
      })

      const data = response.data

      setAiSuggestions(data.suggestions || [])
      setAiFaqs(data.faqs || [])
      setAiMessage(data.message || '')

      // Add AI response to chat
      setChatHistory(prev => [...prev, {
        type: 'ai',
        text: data.message,
        suggestions: data.suggestions,
        faqs: data.faqs
      }])
    } catch (error) {
      console.error('AI consultation failed:', error)
      setAiMessage('Sorry, I encountered an error. Please try again or create a ticket.')
      setChatHistory(prev => [...prev, {
        type: 'ai',
        text: 'Sorry, I encountered an error. Please try again or create a ticket.',
        suggestions: [],
        faqs: []
      }])
    } finally {
      setAiLoading(false)
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

  const getPriorityBadge = (priority) => {
    if (!priority) return null
    const colors = {
      'Critical': 'badge-critical',
      'High': 'badge-high',
      'Medium': 'badge-medium',
      'Low': 'badge-low'
    }
    return <span className={`badge ${colors[priority.name] || 'badge-medium'}`}>{priority.name}</span>
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/tickets/new" className="btn-primary flex items-center">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 p-3 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.assignedTickets}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/knowledge-base"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <BookOpenIcon className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Self-Help</span>
            </Link>
            <Link
              to="/tickets/new"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Report Issue</span>
            </Link>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
            <Link to="/tickets" className="text-sm text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <p className="text-gray-500 text-sm">No tickets yet</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {ticket.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(ticket.priority)}
                      <span className={`badge text-xs ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="text-sm font-medium text-green-800">IFMIS</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-sm font-medium text-blue-800">G-Pay</p>
              <p className="text-xs text-blue-600">Operational</p>
            </div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="text-sm font-medium text-green-800">PKI Services</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
       </div>

      {/* AI Assistant Panel */}
      {aiOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <button
              onClick={() => setAiOpen(false)}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && !aiLoading && (
              <div className="text-center text-gray-500 py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Ask me anything about ICT support, systems, or procedures.</p>
                <p className="text-xs mt-2">I can help with IFMIS, G-Pay, printers, certificates, and more.</p>
              </div>
            )}

            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Consulting knowledge base...
                  </div>
                </div>
              </div>
            )}

            {/* Current suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Suggested solutions:</p>
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setChatHistory(prev => [...prev, {
                        type: 'ai',
                        text: `**${suggestion.title}**\n${suggestion.content.substring(0, 200)}...`,
                        suggestions: [],
                        faqs: []
                      }])
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{suggestion.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{suggestion.content.substring(0, 120)}...</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            suggestion.priorityLevel <= 2 ? 'bg-red-100 text-red-700' :
                            suggestion.priorityLevel === 3 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            Priority {suggestion.priorityLevel}
                          </span>
                          <span className="text-xs text-gray-400">{suggestion.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQ suggestions */}
            {aiFaqs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Related FAQs:</p>
                {aiFaqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setAiQuery(`Tell me about: ${faq.title}`)
                      handleAiConsult({ preventDefault: () => {} })
                    }}
                  >
                    <p className="text-sm text-blue-600 hover:underline">{faq.title}</p>
                    <p className="text-xs text-gray-500">{faq.category}</p>
                  </div>
                ))}
              </div>
            )}

            {aiMessage && chatHistory.length === 0 && (
              <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-sm">
                {aiMessage}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200">
            {aiSuggestions.length === 0 && aiMessage && !aiLoading && (
              <div className="mb-2">
                <button
                  onClick={() => {
                    setChatHistory(prev => [...prev, {
                      type: 'user',
                      text: 'I need to create a ticket'
                    }])
                    setAiMessage('I can help you create a ticket. Please provide the issue details.')
                    setAiQuery('I need to create a ticket for: ')
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Create a ticket for this issue →
                </button>
              </div>
            )}
            <form onSubmit={handleAiConsult} className="flex gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about IFMIS, G-Pay, printers..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={aiLoading}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant Toggle Button */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
          title="Ask AI Assistant"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}