import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, X, Eye, Edit3, Trash2, RefreshCw, Download, Globe, ChevronRight, Package, FileText, Image as ImageIcon } from 'lucide-react'
import { hotmartApi } from '../api'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  local: 'bg-gray-100 text-gray-700',
  sincronizado: 'bg-green-100 text-green-700',
  erro: 'bg-red-100 text-red-700',
}

export default function HotmartProdutos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalDetalhes, setModalDetalhes] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [editando, setEditando] = useState(false)
  const [syncLoading, setSyncLoading] = useState(null)
  const [importando, setImportando] = useState(false)
  const [formData, setFormData] = useState({ nome: '', descricao_curta: '', descricao_completa: '', categoria: 'ONLINE_COURSE', formato: 'online_course', idioma: 'pt_BR' })

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    try {
      setLoading(true)
      const { data } = await hotmartApi.listarProdutos()
      setProdutos(data || [])
    } catch {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  async function carregarDetalhes(produto) {
    try {
      const { data } = await hotmartApi.detalheProduto(produto.id)
      setProdutoSelecionado(data)
      setModalDetalhes(true)
    } catch {
      toast.error('Erro ao carregar detalhes')
    }
  }

  async function sincronizar(id) {
    setSyncLoading(id)
    try {
      const { data } = await hotmartApi.sincronizar(id)
      toast.success(`Sincronizado! ${data.modulos_sync} módulos, ${data.aulas_sync} aulas, ${data.planos_sync} planos.`)
      carregarProdutos()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao sincronizar')
    } finally {
      setSyncLoading(null)
    }
  }

  async function importar() {
    setImportando(true)
    try {
      const { data } = await hotmartApi.importar()
      toast.success(`${data.importados} produtos importados da Hotmart`)
      carregarProdutos()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar')
    } finally {
      setImportando(false)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    try {
      if (editando && produtoSelecionado) {
        await hotmartApi.atualizarProduto(produtoSelecionado.id, formData)
      } else {
        await hotmartApi.criarProduto(formData)
      }
      toast.success(editando ? 'Atualizado!' : 'Criado!')
      fecharModal()
      carregarProdutos()
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  async function deletar(id) {
    if (!confirm('Tem certeza?')) return
    try {
      await hotmartApi.deletarProduto(id)
      toast.success('Excluído!')
      carregarProdutos()
      if (produtoSelecionado?.id === id) setModalDetalhes(false)
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  function abrirCriar() {
    setEditando(false)
    setFormData({ nome: '', descricao_curta: '', descricao_completa: '', categoria: 'ONLINE_COURSE', formato: 'online_course', idioma: 'pt_BR' })
    setModalAberto(true)
  }

  function abrirEditar(produto) {
    setEditando(true)
    setProdutoSelecionado(produto)
    setFormData({
      nome: produto.nome || '',
      descricao_curta: produto.descricao_curta || '',
      descricao_completa: produto.descricao_completa || '',
      categoria: produto.categoria || 'ONLINE_COURSE',
      formato: produto.formato || 'online_course',
      idioma: produto.idioma || 'pt_BR',
    })
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(false)
    setProdutoSelecionado(null)
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#1E3A5F]" />
            Produtos Hotmart
          </h1>
          <p className="text-gray-600 mt-1">Gerencie seus produtos e cursos na Hotmart</p>
        </div>
        <div className="flex gap-3">
          <button onClick={importar} disabled={importando} className="btn btn-outline">
            <Download className="w-5 h-5" />
            {importando ? 'Importando...' : 'Importar'}
          </button>
          <button onClick={abrirCriar} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Novo Produto
          </button>
        </div>
      </div>

      {produtos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum produto criado</h3>
          <p className="text-gray-500 mb-6">Crie seu primeiro produto ou importe da Hotmart</p>
          <div className="flex justify-center gap-3">
            <button onClick={importar} disabled={importando} className="btn btn-outline">
              <Download className="w-5 h-5" />
              Importar da Hotmart
            </button>
            <button onClick={abrirCriar} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Criar Produto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {produtos.map(produto => (
            <div key={produto.id} className="card p-5 space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[produto.status_sync] || STATUS_COLORS.local}`}>
                    {produto.status_sync === 'sincronizado' ? 'Sincronizado' : produto.status_sync === 'erro' ? 'Erro' : 'Local'}
                  </span>
                  <h3 className="font-semibold text-lg mt-2">{produto.nome}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{produto.descricao_curta}</p>
                </div>
              </div>

              <div className="flex gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {produto.total_modulos || 0} módulos
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {produto.total_planos || 0} planos
                </div>
              </div>

              {produto.preco_minimo && (
                <div className="text-sm font-medium text-[#1E3A5F]">
                  A partir de R$ {Number(produto.preco_minimo).toFixed(2)}
                </div>
              )}

              {produto.score_ia && (
                <div className="text-sm text-gray-500">
                  Score IA: <span className="font-medium text-[#D4A853]">{produto.score_ia.toFixed(1)}</span>
                </div>
              )}

              <div className="pt-3 border-t flex gap-2">
                <button onClick={() => carregarDetalhes(produto)} className="flex-1 btn btn-outline text-sm">
                  <Eye className="w-4 h-4" />
                  Detalhes
                </button>
                <button onClick={() => sincronizar(produto.id)} disabled={syncLoading === produto.id} className="flex-1 btn bg-[#F04E23] hover:bg-[#D94420] text-white text-sm">
                  <Globe className="w-4 h-4" />
                  {syncLoading === produto.id ? 'Sync...' : 'Sincronizar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editando ? 'Editar' : 'Novo'} Produto Hotmart</h2>
              <button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div>
                <label className="form-label">Nome *</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Descrição Curta</label>
                <input type="text" value={formData.descricao_curta} onChange={(e) => setFormData({ ...formData, descricao_curta: e.target.value })} className="form-input" placeholder="Até 160 caracteres" />
              </div>
              <div>
                <label className="form-label">Descrição Completa (HTML)</label>
                <textarea rows={4} value={formData.descricao_completa} onChange={(e) => setFormData({ ...formData, descricao_completa: e.target.value })} className="form-input" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Categoria</label>
                  <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="form-input">
                    <option value="ONLINE_COURSE">Curso Online</option>
                    <option value="EBOOK">E-book</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="MEMBERSHIP">Assinatura</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Formato</label>
                  <input type="text" value={formData.formato} onChange={(e) => setFormData({ ...formData, formato: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Idioma</label>
                  <input type="text" value={formData.idioma} onChange={(e) => setFormData({ ...formData, idioma: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">{editando ? 'Atualizar' : 'Criar'}</button>
                <button type="button" onClick={fecharModal} className="btn btn-outline">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {modalDetalhes && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[produtoSelecionado.status_sync] || STATUS_COLORS.local}`}>
                  {produtoSelecionado.status_sync === 'sincronizado' ? 'Sincronizado' : produtoSelecionado.status_sync === 'erro' ? 'Erro' : 'Local'}
                </span>
                <h2 className="text-xl font-semibold">{produtoSelecionado.nome}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(produtoSelecionado)} className="p-2 hover:bg-gray-200 rounded-lg"><Edit3 className="w-5 h-5" /></button>
                <button onClick={() => { deletar(produtoSelecionado.id); setModalDetalhes(false) }} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                <button onClick={() => setModalDetalhes(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {produtoSelecionado.descricao_completa && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-3">Descrição de Vendas</h3>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: produtoSelecionado.descricao_completa }} />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h3 className="font-semibold mb-3">Estrutura do Curso</h3>
                  {produtoSelecionado.modulos?.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum módulo cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      {produtoSelecionado.modulos.map((modulo, i) => (
                        <div key={modulo.id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <span className="w-6 h-6 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                            {modulo.nome}
                          </div>
                          {modulo.aulas?.length > 0 && (
                            <ul className="mt-2 ml-8 space-y-1">
                              {modulo.aulas.map((aula) => (
                                <li key={aula.id} className="text-sm text-gray-600 flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3" />
                                  {aula.nome} <span className="text-xs text-gray-400">({aula.tipo}, {aula.duracao_minutos}min)</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card p-4">
                  <h3 className="font-semibold mb-3">Planos de Preço</h3>
                  {produtoSelecionado.planos?.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum plano cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {produtoSelecionado.planos.map(plano => (
                        <div key={plano.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <div className="font-medium text-sm">{plano.nome}</div>
                            <div className="text-xs text-gray-500">{plano.tipo} • {plano.periodicidade || 'único'}</div>
                          </div>
                          <div className="font-semibold text-[#1E3A5F]">
                            R$ {Number(plano.preco).toFixed(2)}
                            {plano.max_parcelas > 1 && <span className="text-xs text-gray-500 font-normal"> em {plano.max_parcelas}x</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
