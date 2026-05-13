import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [selectedCategory])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedCategory) params.issueType = selectedCategory
      const response = await axios.get('/api/ai/articles', { params })
      setArticles(response.data.articles)
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    try {
      const params = { q: searchQuery }
      if (selectedCategory) params.category = selectedCategory
      const response = await axios.get('/api/ai/search', { params })
      setSearchResults(response.data.results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewArticle = async (articleId) => {
    try {
      const response = await axios.get(`/api/ai/article/${articleId}`)
      setSelectedArticle(response.data.article)
    } catch (error) {
      console.error('Failed to load article:', error)
    }
  }

  const markHelpful = async (articleId, helpful) => {
    try {
      await axios.post(`/api/ai/feedback/${articleId}`, { helpful })
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle(prev => ({
          ...prev,
          helpfulCount: helpful ? prev.helpfulCount + 1 : prev.helpfulCount
        }))
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const getPriorityColor = (level) => {
    const colors = {
      1: 'text-red-600',
      2: 'text-orange-600',
      3: 'text-yellow-600',
      4: 'text-blue-600',
      5: 'text-green-600'
    }
    return colors[level] || 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Self-Care & Knowledge Base</h1>
      </div>

      {/* Search */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for solutions (e.g., 'IFMIS login', 'printer offline')"
              className="form-input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            Search
          </button>
        </form>

        <div className="mt-4 flex gap-2">
          <span className="text-sm text-gray-600">Quick filters:</span>
          {['IFMIS', 'G-Pay', 'Certificate', 'Printer', 'Network', 'VPN'].map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSearchQuery(tag)
                setSelectedCategory('')
                setTimeout(handleSearch, 0)
              }}
              className="badge bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Articles List */}
        <div className="lg:col-span-1 space-y-4">
          {hasSearched ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">
                Search Results ({searchResults.length})
              </h2>
              {loading ? (
                <p className="text-gray-500">Searching...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-500">No results found. Try different keywords.</p>
              ) : (
                searchResults.map(article => (
                  <div
                    key={article.id}
                    onClick={() => viewArticle(article.id)}
                    className={`card cursor-pointer hover:shadow-md transition-shadow ${
                      selectedArticle?.id === article.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.content.substring(0, 100)}...</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{article.category}</span>
                      <span className={`text-xs font-medium ${getPriorityColor(article.priorityLevel)}`}>
                        Priority {article.priorityLevel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900">All Articles</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                articles.map(article => (
                  <div
                    key={article.id}
                    onClick={() => viewArticle(article.id)}
                    className={`card cursor-pointer hover:shadow-md transition-shadow ${
                      selectedArticle?.id === article.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.content.substring(0, 100)}...</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{article.category}</span>
                      <span className={`text-xs font-medium ${getPriorityColor(article.priorityLevel)}`}>
                        Priority {article.priorityLevel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Article Detail */}
        <div className="lg:col-span-2">
          {selectedArticle ? (
            <div className="card">
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-sm text-blue-600 hover:underline mb-4"
              >
                ← Back to list
              </button>

              <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h1>

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                <span className="badge bg-blue-100 text-blue-800">
                  {selectedArticle.category?.name || 'General'}
                </span>
                <span>Views: {selectedArticle.viewCount}</span>
                <span>Helpful: {selectedArticle.helpfulCount}</span>
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                {selectedArticle.content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-3 text-gray-700">{paragraph}</p>
                ))}
              </div>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags.map(tag => (
                      <span key={tag} className="badge bg-gray-100 text-gray-800 flex items-center gap-1">
                        <TagIcon className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Was this helpful?</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => markHelpful(selectedArticle.id, true)}
                    className="btn-success"
                  >
                    Yes, solved my issue
                  </button>
                  <button
                    onClick={() => markHelpful(selectedArticle.id, false)}
                    className="btn-secondary"
                  >
                    No, need more help
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  If not, you can create a ticket and we'll assist you directly.
                </p>
              </div>
            </div>
          ) : (
            <div className="card text-center py-10">
              <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Article</h3>
              <p className="text-gray-500">
                Choose an article from the list to view detailed troubleshooting steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}