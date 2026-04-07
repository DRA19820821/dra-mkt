import { useState, useEffect } from 'react'
import { 
  Library, Star, Trash2, Copy, Check, Filter, Archive, 
  CheckCircle, X, Sparkles, ChevronRight, TrendingUp
} from 'lucide-react'
import { copysApi } from '../api'
import toast from 'react-hot-toast'

export default function Biblioteca() {
  const [copys, setCopys] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ status: '', favorito: '' })
  const [copiado, setCopiado] = useState(null)
  const [copySelecionada, setCopySelecionada] = useState(null)
  const [detalhes, setDetalhes] = useState(null)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)

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

  async function verDetalhes(copy) {
    try {
      setCopySelecionada(copy)
      setLoadingDetalhes(true)
      const { data } = await copysApi.detalhe(copy.id)
      setDetalhes(data)
    } catch (error) {
      toast.error('Erro ao carregar detalhes')
    } finally {
      setLoadingDetalhes(false)
    }
  }

  async function toggleFavorito(id, e) {
    e.stopPropagation()
    try {
      await copysApi.favoritar(id)
      carregarCopys()
      if (detalhes && detalhes.id === id) {
        setDetalhes({ ...detalhes, favorito: !detalhes.favorito })
      }
    } catch (error) {
      toast.error('Erro ao atualizar')
    }
  }

  async function alterarStatus(id, status, e) {
    e?.stopPropagation()
    try {
      await copysApi.alterarStatus(id, status)
      toast.success('Status atualizado!')
      carregarCopys()
      if (detalhes && detalhes.id === id) {
        setDetalhes({ ...detalhes, status })
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  async function deletarCopy(id, e) {
    e?.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta copy?')) return
    try {
      await copysApi.deletar(id)
      toast.success('Copy excluída!')
      carregarCopys()
      if (copySelecionada?.id === id) {
        setCopySelecionada(null)
        setDetalhes(null)
      }
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  async function copiarVariante(variante) {
    const texto = `${variante.headline}\n\n${variante.body_text}\n\n${variante.cta}`
    await navigator.clipboard.writeText(texto)
    setCopiado(variante.id)
    setTimeout(() => setCopiado(null), 2000)
    toast.success('Copy copiada!')
  }

  function getStatusBadge(status) {
    const styles = {
      rascunho: 'bg-gray-100 text-gray-700 border-gray-200',
      aprovado: 'bg-green-100 text-green-700 border-green-200',
      usado: 'bg-blue-100 text-blue-700 border-blue-200',
      arquivado: 'bg-gray-200 text-gray-500 border-gray-300',
    }
    return styles[status] || styles.rascunho
  }

  function getScoreColor(score) {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Carregando biblioteca...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Library className="w-8 h-8 text-[#1E3A5F]" />
            Biblioteca de Copys
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas copys aprovadas e favoritas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar por:</span>
          </div>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="form-input w-auto py-1.5 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="rascunho">📝 Rascunho</option>
            <option value="aprovado">✅ Aprovado</option>
            <option value="usado">🚀 Usado</option>
            <option value="arquivado">📦 Arquivado</option>
          </select>
          <select
            value={filtros.favorito}
            onChange={(e) => setFiltros({ ...filtros, favorito: e.target.value })}
            className="form-input w-auto py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">⭐ Favoritos</option>
          </select>
          {(filtros.status || filtros.favorito) && (
            <button
              onClick={() => setFiltros({ status: '', favorito: '' })}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {copys.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Library className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma copy encontrada
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {filtros.status || filtros.favorito 
              ? 'Tente ajustar os filtros para ver mais resultados'
              : 'Gere suas primeiras copys na página "Gerar Copy"'}
          </p>
          {!filtros.status && !filtros.favorito && (
            <a
              href="/dra-mkt/gerar"
              className="btn btn-primary inline-flex"
            >
              <Sparkles className="w-5 h-5" />
              Gerar Copy
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copys.map((copy) => (
            <div 
              key={copy.id} 
              onClick={() => verDetalhes(copy)}
              className="card p-6 cursor-pointer group hover:border-[#1E3A5F]/30"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(copy.status)}`}>
                    {copy.status}
                  </span>
                  {copy.favorito && (
                    <Star className="w-4 h-4 text-[#D4A853] fill-current" />
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => toggleFavorito(copy.id, e)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      copy.favorito ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-gray-400 hover:text-[#D4A853]'
                    }`}
                    title="Favoritar"
                  >
                    <Star className={`w-4 h-4 ${copy.favorito ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => deletarCopy(copy.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {copy.produto_nome}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {copy.persona_nome}
              </p>

              <div className="flex flex-wrap gap-2 text-xs mb-4">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md capitalize">
                  {copy.objetivo}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md capitalize">
                  {copy.tom}
                </span>
                <span className="px-2 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-md">
                  {copy.provider_llm}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {new Date(copy.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#1E3A5F] font-medium">
                  Ver detalhes <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {copySelecionada && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setCopySelecionada(null)
            setDetalhes(null)
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetalhes ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : detalhes ? (
              <>
                {/* Header do Modal */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#1E3A5F] to-[#2A4A73] text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium bg-white/20`}>
                          {detalhes.status}
                        </span>
                        <span className="text-sm text-blue-200">
                          {new Date(detalhes.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold">{detalhes.produto_nome}</h2>
                      <p className="text-blue-200">{detalhes.persona_nome}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCopySelecionada(null)
                        setDetalhes(null)
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {/* Info geral */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize">
                      Objetivo: {detalhes.objetivo}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm capitalize">
                      Tom: {detalhes.tom}
                    </span>
                    <span className="px-3 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full text-sm">
                      {detalhes.provider_llm} / {detalhes.model_llm}
                    </span>
                  </div>

                  {/* Variantees */}
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#1E3A5F]" />
                    Variantes Geradas ({detalhes.variantes?.length || 0})
                  </h3>

                  <div className="space-y-4">
                    {detalhes.variantes?.map((varItem, idx) => {
                      const score = varItem.score_revisor || 0
                      return (
                        <div key={varItem.id} className="card p-5 border-l-4 border-l-[#1E3A5F]">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </span>
                              {score > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(score)}`}>
                                    {score.toFixed(1)}
                                  </div>
                                  <span className="text-sm text-gray-500">Score</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => copiarVariante(varItem)}
                              className="btn btn-ghost text-sm"
                            >
                              {copiado === varItem.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              Copiar
                            </button>
                          </div>

                          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Headline</span>
                              <p className="text-lg font-semibold text-gray-900">{varItem.headline}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Body</span>
                              <p className="text-gray-700 whitespace-pre-wrap">{varItem.body_text}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CTA</span>
                              <p className="text-[#D4A853] font-semibold">{varItem.cta}</p>
                            </div>
                          </div>

                          {varItem.feedback_revisor && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Feedback do Revisor</span>
                              <p className="text-sm text-blue-800 mt-1">{varItem.feedback_revisor}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer com ações */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3">
                  {detalhes.status !== 'aprovado' && (
                    <button
                      onClick={(e) => alterarStatus(detalhes.id, 'aprovado', e)}
                      className="btn bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </button>
                  )}
                  {detalhes.status !== 'usado' && (
                    <button
                      onClick={(e) => alterarStatus(detalhes.id, 'usado', e)}
                      className="btn bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Check className="w-4 h-4" />
                      Marcar como Usado
                    </button>
                  )}
                  {detalhes.status !== 'arquivado' && (
                    <button
                      onClick={(e) => alterarStatus(detalhes.id, 'arquivado', e)}
                      className="btn bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      <Archive className="w-4 h-4" />
                      Arquivar
                    </button>
                  )}
                  <button
                    onClick={(e) => toggleFavorito(detalhes.id, e)}
                    className={`btn ${detalhes.favorito ? 'btn-secondary' : 'btn-outline'}`}
                  >
                    <Star className={`w-4 h-4 ${detalhes.favorito ? 'fill-current' : ''}`} />
                    {detalhes.favorito ? 'Favoritado' : 'Favoritar'}
                  </button>
                  <button
                    onClick={(e) => deletarCopy(detalhes.id, e)}
                    className="btn btn-outline border-red-300 text-red-600 hover:bg-red-50 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
