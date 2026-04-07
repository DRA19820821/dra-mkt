import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  TrendingUp, 
  FileText, 
  Target, 
  ArrowRight,
  Zap,
  Users,
  Package
} from 'lucide-react'
import { copysApi, produtosApi, personasApi } from '../api'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCopys: 0,
    copysAprovadas: 0,
    totalProdutos: 0,
    totalPersonas: 0,
  })
  const [ultimasCopys, setUltimasCopys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [copysRes, prodRes, persRes] = await Promise.all([
        copysApi.listar(),
        produtosApi.listar(),
        personasApi.listar(),
      ])

      const copys = copysRes.data
      setStats({
        totalCopys: copys.length,
        copysAprovadas: copys.filter(c => c.status === 'aprovado').length,
        totalProdutos: prodRes.data.length,
        totalPersonas: persRes.data.length,
      })
      setUltimasCopys(copys.slice(0, 5))
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      if (error.response?.status === 401) {
        toast.error('Você precisa fazer login para acessar')
      }
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Copys Geradas',
      value: stats.totalCopys,
      icon: FileText,
      color: 'blue',
      link: '/biblioteca'
    },
    {
      title: 'Copys Aprovadas',
      value: stats.copysAprovadas,
      icon: TrendingUp,
      color: 'green',
      link: '/biblioteca'
    },
    {
      title: 'Produtos',
      value: stats.totalProdutos,
      icon: Package,
      color: 'amber',
      link: '/produtos'
    },
    {
      title: 'Personas',
      value: stats.totalPersonas,
      icon: Users,
      color: 'purple',
      link: '/personas'
    },
  ]

  const colorClasses = {
    blue: { bg: 'bg-blue-50', icon: 'text-[#1E3A5F]', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-[#D4A853]', border: 'border-amber-200' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo ao <span className="gradient-text">DRA Marketing</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Sistema de automação de marketing digital da Academia do Raciocínio
          </p>
        </div>
        <Link
          to="/gerar"
          className="btn btn-primary self-start"
        >
          <Sparkles className="w-5 h-5" />
          Gerar Nova Copy
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const colors = colorClasses[card.color]
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              to={card.link}
              className={`card stat-card p-6 group ${colors.border}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1E3A5F] group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-1">{card.title}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimas Copys */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#1E3A5F]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Últimas Copys</h2>
                <p className="text-sm text-gray-500">Geradas recentemente</p>
              </div>
            </div>
            <Link
              to="/biblioteca"
              className="text-sm text-[#1E3A5F] hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>
          <div className="p-6">
            {ultimasCopys.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">
                  Nenhuma copy gerada ainda
                </p>
                <Link 
                  to="/gerar" 
                  className="inline-flex items-center gap-1 text-[#1E3A5F] hover:underline font-medium mt-2"
                >
                  Criar sua primeira copy <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {ultimasCopys.map((copy) => (
                  <div
                    key={copy.id}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{copy.produto_nome}</p>
                      <p className="text-sm text-gray-500">
                        {copy.persona_nome} • <span className="capitalize">{copy.objetivo}</span>
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ml-4 ${
                      copy.status === 'aprovado' ? 'bg-green-100 text-green-700' :
                      copy.status === 'rascunho' ? 'bg-gray-100 text-gray-700' :
                      copy.status === 'usado' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {copy.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="card-gradient rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Zap className="w-6 h-6 text-[#D4A853]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Ações Rápidas</h2>
              <p className="text-blue-200 text-sm">Comece por aqui</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/gerar"
              className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 bg-[#D4A853] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Gerar Nova Copy</p>
                <p className="text-sm text-blue-200">Use IA para criar copys em segundos</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/produtos"
              className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Gerenciar Produtos</p>
                <p className="text-sm text-blue-200">Cadastre seus produtos e cursos</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/personas"
              className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Definir Personas</p>
                <p className="text-sm text-blue-200">Crie perfis de público-alvo</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
