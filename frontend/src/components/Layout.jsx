import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  PenTool, 
  Library, 
  Package, 
  Users,
  BrainCircuit,
  Menu,
  X,
  ChevronRight,
  Image as ImageIcon,
  Megaphone,
  Images,
  FileCode
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/gerar', icon: PenTool, label: 'Gerar Copy' },
  { path: '/criativos', icon: ImageIcon, label: 'Gerar Criativo' },
  { path: '/campanhas', icon: Megaphone, label: 'Campanhas' },
  { path: '/biblioteca', icon: Library, label: 'Biblioteca' },
  { path: '/galeria', icon: Images, label: 'Galeria' },
  { path: '/produtos', icon: Package, label: 'Produtos' },
  { path: '/personas', icon: Users, label: 'Personas' },
  { path: '/templates', icon: FileCode, label: 'Templates' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gradient-to-b from-[#1E3A5F] to-[#152A45] 
          text-white flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4A853] to-[#B8933F] rounded-xl flex items-center justify-center shadow-lg">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight">DRA Marketing</h1>
              <p className="text-xs text-blue-300/80">Academia do Raciocínio</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    end={path === '/'}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                      ${isActive
                        ? 'bg-[#D4A853] text-white font-medium shadow-lg'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                    <span>{label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-xs text-blue-300/70 mb-1">Versão</p>
            <p className="text-sm font-medium">v0.3.0 — Fase 3</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <span className="text-[#1E3A5F] font-medium">DRA-MKT</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium">
                  {navItems.find(item => 
                    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
                  )?.label || 'Dashboard'}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Sistema Online
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
