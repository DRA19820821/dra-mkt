import { useState, useEffect } from 'react'
import { Images, Star, Trash2, Download, X, Filter, CheckCircle } from 'lucide-react'
import { criativosApi } from '../api'
import toast from 'react-hot-toast'

export default function Galeria() {
  const [criativos, setCriativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ status: '', formato: '' })
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => {
    carregarCriativos()
  }, [filtros])

  async function carregarCriativos() {
    try {
      setLoading(true)
      const params = {}
      if (filtros.status) params.status = filtros.status
      if (filtros.formato) params.formato = filtros.formato
      
      const { data } = await criativosApi.listar(params)
      setCriativos(data)
    } catch (error) {
      toast.error('Erro ao carregar criativos')
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorito(id) {
    try {
      await criativosApi.favoritar(id)
      carregarCriativos()
    } catch (error) {
      toast.error('Erro ao atualizar')
    }
  }

  async function alterarStatus(id, status) {
    try {
      await criativosApi.alterarStatus(id, status)
      toast.success(`Criativo ${status === 'aprovado' ? 'aprovado' : 'atualizado'}!`)
      carregarCriativos()
      if (selecionado?.id === id) {
        setSelecionado({ ...selecionado, status })
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  async function deletarCriativo(id) {
    if (!confirm('Tem certeza que deseja excluir este criativo?')) return
    try {
      await criativosApi.deletar(id)
      toast.success('Criativo excluído!')
      carregarCriativos()
      if (selecionado?.id === id) setSelecionado(null)
    } catch (error) {
      toast.error('Erro ao excluir')
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Images className="w-8 h-8 text-[#1E3A5F]" />
          Galeria de Criativos
        </h1>
        <p className="text-gray-600 mt-1">
          Gerencie todas as imagens geradas para seus anúncios
        </p>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar:</span>
          </div>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="form-input w-auto py-1.5 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="aprovado">Aprovado</option>
            <option value="usado">Usado</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <select
            value={filtros.formato}
            onChange={(e) => setFiltros({ ...filtros, formato: e.target.value })}
            className="form-input w-auto py-1.5 text-sm"
          >
            <option value="">Todos os formatos</option>
            <option value="feed_square">Feed Quadrado</option>
            <option value="feed_portrait">Feed Retrato</option>
            <option value="story">Story/Reels</option>
            <option value="feed_landscape">Feed Paisagem</option>
          </select>
        </div>
      </div>

      {criativos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Images className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum criativo encontrado
          </h3>
          <p className="text-gray-500">
            Gere seus primeiros criativos na página "Gerar Criativo"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {criativos.map((criativo) => (
            <div 
              key={criativo.id} 
              className="card overflow-hidden cursor-pointer group relative"
              onClick={() => setSelecionado(criativo)}
            >
              <div className="aspect-square bg-gray-100 relative">
                <img
                  src={criativosApi.thumbnailUrl(criativo.id)}
                  alt={`Criativo ${criativo.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                
                {/* Ações no hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorito(criativo.id)
                    }}
                    className={`p-1.5 rounded-lg ${criativo.favorito ? 'bg-[#D4A853] text-white' : 'bg-white/90 text-gray-600'}`}
                  >
                    <Star className={`w-4 h-4 ${criativo.favorito ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Badge de status */}
                <div className="absolute bottom-2 left-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(criativo.status)}`}>
                    {criativo.status}
                  </span>
                </div>
              </div>
              
              <div className="p-3">
                <p className="font-medium text-sm truncate">{criativo.produto_nome}</p>
                <p className="text-xs text-gray-500">{criativo.formato}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      {selecionado && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelecionado(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{selecionado.produto_nome}</h3>
              <button onClick={() => setSelecionado(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <img
                src={criativosApi.imagemUrl(selecionado.id)}
                alt="Criativo"
                className="w-full h-auto rounded-lg"
              />
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Formato:</span>
                  <p className="font-medium">{selecionado.formato}</p>
                </div>
                <div>
                  <span className="text-gray-500">Modelo:</span>
                  <p className="font-medium">{selecionado.modelo_ia}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium capitalize">{selecionado.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tamanho:</span>
                  <p className="font-medium">{(selecionado.tamanho_bytes / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t flex flex-wrap gap-2">
              {selecionado.status !== 'aprovado' && (
                <button
                  onClick={() => alterarStatus(selecionado.id, 'aprovado')}
                  className="btn bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
              )}
              <a
                href={criativosApi.imagemUrl(selecionado.id)}
                download
                className="btn btn-primary"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <button
                onClick={() => toggleFavorito(selecionado.id)}
                className={`btn ${selecionado.favorito ? 'btn-secondary' : 'btn-outline'}`}
              >
                <Star className={`w-4 h-4 ${selecionado.favorito ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => deletarCriativo(selecionado.id)}
                className="btn btn-outline border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
