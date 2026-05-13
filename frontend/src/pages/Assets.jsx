import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', status: '', search: '' })

  useEffect(() => {
    fetchAssets()
    fetchTypes()
    fetchStatuses()
  }, [filter])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.type) params.type = filter.type
      if (filter.status) params.status = filter.status
      if (filter.search) params.search = filter.search

      const response = await axios.get('/api/assets', { params })
      setAssets(response.data.assets)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTypes = async () => {
    try {
      const response = await axios.get('/api/assets/types')
      setAssetTypes(response.data.types)
    } catch (error) {
      console.error('Failed to fetch types:', error)
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await axios.get('/api/assets/statuses')
      setStatuses(response.data.statuses)
    } catch (error) {
      console.error('Failed to fetch statuses:', error)
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'STOCK': 'bg-blue-100 text-blue-800',
      'MAINT': 'bg-yellow-100 text-yellow-800',
      'RET': 'bg-gray-100 text-gray-800',
      'LOST': 'bg-red-100 text-red-800'
    }
    return <span className={`badge ${colors[status] || 'bg-gray-100'}`}>{status}</span>
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'computing': '💻',
      'peripheral': '🖨️',
      'network': '📡',
      'storage': '💾',
      'other': '📦'
    }
    return icons[category] || '📦'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
        <button className="btn-primary flex items-center">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by asset tag, serial, or location..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="form-input pl-10"
            />
          </div>

          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="form-input w-auto"
          >
            <option value="">All Types</option>
            {assetTypes.map(type => (
              <option key={type.id} value={type.code}>{type.name}</option>
            ))}
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="form-input w-auto"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status.id} value={status.code}>{status.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="card text-center py-10">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryIcon(asset.type.category)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{asset.type.name}</h3>
                    <p className="text-sm text-gray-500">{asset.assetTag}</p>
                  </div>
                </div>
                {getStatusBadge(asset.status.code)}
              </div>

              {asset.serialNumber && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">S/N:</span> {asset.serialNumber}
                </p>
              )}

              {asset.location && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Location:</span> {asset.location}
                </p>
              )}

              {asset.assignedTo && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Assigned to:</span> {asset.assignedTo.name}
                </p>
              )}

              {asset.warrantyExpiry && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Warranty:</span> {new Date(asset.warrantyExpiry).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Added: {new Date(asset.createdAt).toLocaleDateString()}
                </span>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {['ACTIVE', 'STOCK', 'MAINT', 'RET', 'LOST'].map(status => {
          const count = assets.filter(a => a.status.code === status).length
          const colors = {
            'ACTIVE': 'bg-green-100 border-green-200',
            'STOCK': 'bg-blue-100 border-blue-200',
            'MAINT': 'bg-yellow-100 border-yellow-200',
            'RET': 'bg-gray-100 border-gray-200',
            'LOST': 'bg-red-100 border-red-200'
          }
          return (
            <div key={status} className={`card border ${colors[status]}`}>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}