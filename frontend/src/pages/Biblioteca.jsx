import { useState, useEffect } from 'react'
import { Library, Star, Trash2, Copy, Check, Filter, Archive, CheckCircle } from 'lucide-react'
import { copysApi } from '../api'
import toast from 'react-hot-toast'

export default function Biblioteca() {
  const [copys, setCopys] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ status: '', favorito: '' })
  const [copiado, setCopiado] = useState(null)

  useEffect(() => {
    carregarCopys()
  }, [filtros])

  async function carregarCopys() {
    try {
      setLoading(true)
      const params = {}
      if (filtros.status) params.status = filtros.status
      if (filtros.favorito) params.favorito = filtros.favorito === 'true'
      
      const { data } = await copysApi.listar(params)
      setCopys(data)
    } catch (error) {
      toast.error('Erro ao carregar copys')
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorito(id) {
    try {
      await copysApi.favoritar(id)
      carregarCopys()
    } catch (error) {
      toast.error('Erro ao atualizar')
    }
  }

  async function alterarStatus(id, status) {
    try {
      await copysApi.alterarStatus(id, status)
      toast.success('Status atualizado!')
      carregarCopys()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  async function deletarCopy(id) {
    if (!confirm('Tem certeza que deseja excluir esta copy?')) return
    try {
      await copysApi.deletar(id)
      toast.success('Copy excluída!')
      carregarCopys()
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  async function copiarCopy(copy) {
    try {
      const { data } = await copysApi.detalhe(copy.id)
      if (data.variantes && data.variantes.length > 0) {
        const var1 = data.variantes[0]
        const texto = `${var1.headline}\n\n${var1.body_text}\n\n${var1.cta}`
        await navigator.clipboard.writeText(texto)
        setCopiado(copy.id)
        setTimeout(() => setCopiado(null), 2000)
        toast.success('Copy copiada!')
      }
    } catch (error) {
      toast.error('Erro ao copiar')
    }
  }

  function getStatusBadge(status) {
    const styles = {
      rascunho: 'bg-gray-100 text-gray-700',
      aprovado: 'bg-green-100 text-green-700',
      usado: 'bg-blue-100 text-blue-700',
      arquivado: 'bg-gray-200 text-gray-500',
    }
    return styles[status] || styles.rascunho
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Library className="w-8 h-8 text-[#1E3A5F]" />
          Biblioteca de Copys
        </h1>
        <p className="text-gray-600">
          Gerencie suas copys aprovadas e favoritas
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] outline-none"
          >
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="aprovado">Aprovado</option>
            <option value="usado">Usado</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <select
            value={filtros.favorito}
            onChange={(e) => setFiltros({ ...filtros, favorito: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A5F] outline-none"
          >
            <option value="">Todos</option>
            <option value="true">Favoritos</option>
          </select>
        </div>
      </div>

      {copys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Library className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma copy encontrada
          </h3>
          <p className="text-gray-500">
            Gere suas primeiras copys na página "Gerar Copy"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copys.map((copy) => (
            <div key={copy.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(copy.status)}`}>
                    {copy.status}
                  </span>
                  {copy.favorito && (
                    <Star className="w-4 h-4 text-[#D4A853] fill-current" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleFavorito(copy.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      copy.favorito ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-gray-400 hover:text-[#D4A853]'
                    }`}
                    title="Favoritar"
                  >
                    <Star className={`w-4 h-4 ${copy.favorito ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => copiarCopy(copy)}
                    className="p-1.5 text-gray-400 hover:text-[#1E3A5F] rounded-lg transition-colors"
                    title="Copiar"
                  >
                    {copiado === copy.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deletarCopy(copy.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {copy.produto_nome}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {copy.persona_nome}
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-4">
                <span className="px-2 py-1 bg-gray-100 rounded">{copy.objetivo}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{copy.tom}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{copy.provider_llm}</span>
              </div>

              <div className="text-xs text-gray-400 mb-4">
                {new Date(copy.created_at).toLocaleDateString('pt-BR')}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                {copy.status !== 'aprovado' && (
                  <button
                    onClick={() => alterarStatus(copy.id, 'aprovado')}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </button>
                )}
                {copy.status !== 'arquivado' && (
                  <button
                    onClick={() => alterarStatus(copy.id, 'arquivado')}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Arquivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
