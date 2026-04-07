import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  PenTool, 
  Library, 
  Package, 
  Users,
  BrainCircuit
} from 'lucide-react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/gerar', icon: PenTool, label: 'Gerar Copy' },
  { path: '/biblioteca', icon: Library, label: 'Biblioteca' },
  { path: '/produtos', icon: Package, label: 'Produtos' },
  { path: '/personas', icon: Users, label: 'Personas' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E3A5F] text-white flex flex-col shadow-xl">
        {/* Logo */}
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">DRA Marketing</h1>
              <p className="text-xs text-blue-300">Academia do Raciocínio</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-[#D4A853] text-white font-medium shadow-md'
                        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-800">
          <p className="text-xs text-blue-400 text-center">
            v0.1.0 · Fase 1
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Painel de Marketing
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                Sistema Online
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
