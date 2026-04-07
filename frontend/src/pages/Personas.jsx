import { useState, useEffect } from 'react'
import { Users, Plus, Edit2, Trash2, X, Save, UserCircle, Tag } from 'lucide-react'
import { personasApi } from '../api'
import toast from 'react-hot-toast'

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    faixa_etaria: '',
    interesses: [],
    dores: [],
    objetivos: [],
  })
  const [novoItem, setNovoItem] = useState({ interesses: '', dores: '', objetivos: '' })

  useEffect(() => {
    carregarPersonas()
  }, [])

  async function carregarPersonas() {
    try {
      setLoading(true)
      const { data } = await personasApi.listar()
      setPersonas(data)
    } catch (error) {
      toast.error('Erro ao carregar personas')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(persona = null) {
    if (persona) {
      setEditando(persona)
      setFormData({
        nome: persona.nome,
        descricao: persona.descricao || '',
        faixa_etaria: persona.faixa_etaria || '',
        interesses: persona.interesses || [],
        dores: persona.dores || [],
        objetivos: persona.objetivos || [],
      })
    } else {
      setEditando(null)
      setFormData({
        nome: '',
        descricao: '',
        faixa_etaria: '',
        interesses: [],
        dores: [],
        objetivos: [],
      })
    }
    setNovoItem({ interesses: '', dores: '', objetivos: '' })
    setModalAberto(true)
  }

  function adicionarItem(campo) {
    const valor = novoItem[campo].trim()
    if (!valor) return
    setFormData({ ...formData, [campo]: [...formData[campo], valor] })
    setNovoItem({ ...novoItem, [campo]: '' })
  }

  function removerItem(campo, index) {
    setFormData({
      ...formData,
      [campo]: formData[campo].filter((_, i) => i !== index),
    })
  }

  async function salvarPersona(e) {
    e.preventDefault()
    try {
      if (editando) {
        await personasApi.atualizar(editando.id, formData)
        toast.success('Persona atualizada!')
      } else {
        await personasApi.criar(formData)
        toast.success('Persona criada!')
      }
      setModalAberto(false)
      carregarPersonas()
    } catch (error) {
      toast.error('Erro ao salvar persona')
    }
  }

  async function deletarPersona(id) {
    if (!confirm('Tem certeza que deseja remover esta persona?')) return
    try {
      await personasApi.deletar(id)
      toast.success('Persona removida!')
      carregarPersonas()
    } catch (error) {
      toast.error('Erro ao remover persona')
    }
  }

  function TagInput({ label, campo, items, placeholder }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => removerItem(campo, i)}
                className="hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={novoItem[campo]}
            onChange={(e) => setNovoItem({ ...novoItem, [campo]: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarItem(campo))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none text-sm"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => adicionarItem(campo)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-[#1E3A5F]" />
            Personas
          </h1>
          <p className="text-gray-600">
            Defina os perfis de público-alvo para suas campanhas
          </p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A73] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Persona
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]"></div>
        </div>
      ) : personas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCircle className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma persona cadastrada
          </h3>
          <p className="text-gray-500 mb-6">
            Clique em "Nova Persona" para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <div key={persona.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900">{persona.nome}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirModal(persona)}
                    className="p-2 text-gray-500 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletarPersona(persona.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {persona.descricao || 'Sem descrição'}
              </p>
              
              {persona.faixa_etaria && (
                <div className="text-sm text-gray-500 mb-3">
                  <span className="font-medium">Faixa etária:</span> {persona.faixa_etaria}
                </div>
              )}
              
              {persona.dores && persona.dores.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase">Dores</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {persona.dores.slice(0, 3).map((dor, i) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                        {dor}
                      </span>
                    ))}
                    {persona.dores.length > 3 && (
                      <span className="px-2 py-1 text-gray-400 text-xs">+{persona.dores.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editando ? 'Editar Persona' : 'Nova Persona'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={salvarPersona} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Ex: Concurseiro OAB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Faixa Etária
                  </label>
                  <input
                    type="text"
                    value={formData.faixa_etaria}
                    onChange={(e) => setFormData({ ...formData, faixa_etaria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                    placeholder="Ex: 22-35"
                  />
                </div>
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
                  placeholder="Descreva a persona..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TagInput
                  label="Interesses"
                  campo="interesses"
                  items={formData.interesses}
                  placeholder="Adicionar interesse"
                />
                <TagInput
                  label="Dores"
                  campo="dores"
                  items={formData.dores}
                  placeholder="Adicionar dor"
                />
                <TagInput
                  label="Objetivos"
                  campo="objetivos"
                  items={formData.objetivos}
                  placeholder="Adicionar objetivo"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
