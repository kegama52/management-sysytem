import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Footer from './Footer'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  BookOpenIcon,
  CubeIcon,
  QueueListIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Tickets', href: '/tickets', icon: ClipboardDocumentListIcon },
    { name: 'New Ticket', href: '/tickets/new', icon: PlusIcon },
    { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpenIcon },
  ]

  const ictNavigation = [
    { name: 'ICT Queue', href: '/ict-queue', icon: QueueListIcon },
    { name: 'Assets', href: '/assets', icon: CubeIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-600">TIISGS</h1>
        </div>

        <nav className="mt-6 px-4 flex-1">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>

          {(user?.role === 'ict_officer' || user?.role === 'ict_supervisor' || user?.role === 'admin') && (
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ICT Management
              </h3>
              <div className="mt-2 space-y-1">
                {ictNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            <p className="text-xs text-gray-400 truncate">{user?.organization?.directorate}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8 flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  )
}