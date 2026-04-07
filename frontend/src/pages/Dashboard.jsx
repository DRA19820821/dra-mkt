import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, FileText, Target, ArrowRight } from 'lucide-react'
import { copysApi, produtosApi, personasApi } from '../api'
import { Link } from 'react-router-dom'

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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo ao DRA Marketing
        </h1>
        <p className="text-gray-600">
          Sistema de automação de marketing digital da Academia do Raciocínio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalCopys}</h3>
          <p className="text-sm text-gray-600">Copys geradas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Aprovadas</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.copysAprovadas}</h3>
          <p className="text-sm text-gray-600">Copys aprovadas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-[#D4A853]" />
            </div>
            <span className="text-sm text-gray-500">Recursos</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalProdutos + stats.totalPersonas}</h3>
          <p className="text-sm text-gray-600">{stats.totalProdutos} produtos, {stats.totalPersonas} personas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">IA</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">5</h3>
          <p className="text-sm text-gray-600">Providers disponíveis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Últimas Copys */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimas Copys Geradas</h2>
            <Link
              to="/biblioteca"
              className="text-sm text-[#1E3A5F] hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-6">
            {ultimasCopys.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma copy gerada ainda.{' '}
                <Link to="/gerar" className="text-[#1E3A5F] hover:underline">
                  Gerar agora
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {ultimasCopys.map((copy) => (
                  <div
                    key={copy.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{copy.produto_nome}</p>
                      <p className="text-sm text-gray-500">
                        {copy.persona_nome} • {copy.objetivo} • {copy.tom}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      copy.status === 'aprovado' ? 'bg-green-100 text-green-700' :
                      copy.status === 'rascunho' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
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
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2A4A73] rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D4A853]" />
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/gerar"
              className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Sparkles className="w-5 h-5 text-[#D4A853]" />
              <div>
                <p className="font-medium">Gerar Nova Copy</p>
                <p className="text-sm text-blue-100">Crie copys com IA em segundos</p>
              </div>
            </Link>
            <Link
              to="/produtos"
              className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              <div>
                <p className="font-medium">Gerenciar Produtos</p>
                <p className="text-sm text-blue-100">Cadastre seus produtos</p>
              </div>
            </Link>
            <Link
              to="/personas"
              className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-medium">Definir Personas</p>
                <p className="text-sm text-blue-100">Crie perfis de público-alvo</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
