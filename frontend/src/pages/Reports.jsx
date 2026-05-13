import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  ChartBarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

export default function Reports() {
  const [ttrData, setTtrData] = useState([])
  const [officerData, setOfficerData] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAllData()
  }, [dateRange])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [ttrRes, officerRes, statsRes] = await Promise.all([
        axios.get('/api/reports/ttr-report', { params: dateRange }),
        axios.get('/api/reports/officer-performance', { params: dateRange }),
        axios.get('/api/reports/system-stats')
      ])

      setTtrData(ttrRes.data.report)
      setOfficerData(officerRes.data.officers)
      setSystemStats(statsRes.data.stats)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const avgTTR = ttrData.length > 0
    ? Math.round(ttrData.reduce((sum, d) => sum + d.avgTTR, 0) / ttrData.length)
    : 0

  const totalResolved = officerData.reduce((sum, o) => sum + (o.ticketsResolved || 0), 0)
  const totalHours = officerData.reduce((sum, o) => sum + (o.totalHours || 0), 0)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ICT Performance Reports</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="form-input w-auto"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="form-input w-auto"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Tickets</p>
              <p className="text-2xl font-bold">{systemStats?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold">{totalResolved}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Avg TTR</p>
              <p className="text-2xl font-bold">{avgTTR} min</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">Hours Logged</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Directorates TTR */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5" />
          Directorate TTR Report
        </h2>
        {ttrData.length === 0 ? (
          <p className="text-gray-500">No data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Directorate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg TTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min TTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max TTR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ttrData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.directorate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.totalTickets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.resolved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={row.avgTTR > 180 ? 'text-red-600' : 'text-green-600'}>
                        {row.avgTTR} min
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.minTTR} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.maxTTR} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Officer Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          ICT Officer Performance
        </h2>
        {officerData.length === 0 ? (
          <p className="text-gray-500">No officer data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Resolution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {officerData.map((officer, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {officer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {officer.role.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {officer.totalAssigned}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {officer.ticketsResolved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {officer.avgResolutionTime ? (
                        <span className={officer.avgResolutionTime > 180 ? 'text-red-600' : 'text-green-600'}>
                          {officer.avgResolutionTime} min
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {officer.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}