import { useState, useEffect } from 'react'
import { Package, Plus, Edit2, Trash2, X, Save, Boxes } from 'lucide-react'
import { produtosApi } from '../api'
import toast from 'react-hot-toast'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    url_vendas: '',
  })

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
    try {
      setLoading(true)
      const { data } = await produtosApi.listar()
      setProdutos(data)
    } catch (error) {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(produto = null) {
    if (produto) {
      setEditando(produto)
      setFormData({
        nome: produto.nome,
        descricao: produto.descricao || '',
        preco: produto.preco || '',
        url_vendas: produto.url_vendas || '',
      })
    } else {
      setEditando(null)
      setFormData({ nome: '', descricao: '', preco: '', url_vendas: '' })
    }
    setModalAberto(true)
  }

  async function salvarProduto(e) {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        preco: formData.preco ? parseFloat(formData.preco) : null,
      }
      
      if (editando) {
        await produtosApi.atualizar(editando.id, data)
        toast.success('Produto atualizado!')
      } else {
        await produtosApi.criar(data)
        toast.success('Produto criado!')
      }
      
      setModalAberto(false)
      carregarProdutos()
    } catch (error) {
      toast.error('Erro ao salvar produto')
    }
  }

  async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja remover este produto?')) return
    try {
      await produtosApi.deletar(id)
      toast.success('Produto removido!')
      carregarProdutos()
    } catch (error) {
      toast.error('Erro ao remover produto')
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Package className="w-8 h-8 text-[#1E3A5F]" />
            Produtos
          </h1>
          <p className="text-gray-600">
            Cadastre e gerencie os produtos da Academia
          </p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A73] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]"></div>
        </div>
      ) : produtos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Boxes className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum produto cadastrado
          </h3>
          <p className="text-gray-500 mb-6">
            Clique em "Novo Produto" para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtos.map((produto) => (
            <div key={produto.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900">{produto.nome}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModal(produto)}
                    className="p-2 text-gray-500 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletarProduto(produto.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {produto.descricao || 'Sem descrição'}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#D4A853]">
                  {produto.preco ? `R$ ${produto.preco.toFixed(2)}` : 'Preço não definido'}
                </span>
                {produto.url_vendas && (
                  <a
                    href={produto.url_vendas}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1E3A5F] hover:underline"
                  >
                    Ver página →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editando ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={salvarProduto} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                  placeholder="Ex: Anki OAB 1ª Fase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                  placeholder="Descrição do produto..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                    placeholder="97.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Vendas
                  </label>
                  <input
                    type="url"
                    value={formData.url_vendas}
                    onChange={(e) => setFormData({ ...formData, url_vendas: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A73] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
