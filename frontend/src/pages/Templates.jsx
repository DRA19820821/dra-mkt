import { useState, useEffect } from 'react'
import { FileCode, Plus, Edit2, Trash2, X, Save, RefreshCw } from 'lucide-react'
import { templatesApi } from '../api'
import toast from 'react-hot-toast'

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    tipo_campanha: 'conversao',
    template_gerador: '',
    template_revisor: '',
  })

  useEffect(() => {
    carregarTemplates()
  }, [])

  async function carregarTemplates() {
    try {
      setLoading(true)
      const { data } = await templatesApi.listar()
      setTemplates(data)
    } catch (error) {
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  async function carregarDefaults() {
    try {
      const { data } = await templatesApi.defaults()
      setFormData({
        ...formData,
        template_gerador: data.template_gerador,
        template_revisor: data.template_revisor,
      })
      toast.success('Templates padrão carregados!')
    } catch (error) {
      toast.error('Erro ao carregar defaults')
    }
  }

  function abrirModal(template = null) {
    if (template) {
      setEditando(template)
      setFormData({
        nome: template.nome,
        tipo_campanha: template.tipo_campanha,
        template_gerador: template.template_gerador,
        template_revisor: template.template_revisor,
      })
    } else {
      setEditando(null)
      setFormData({
        nome: '',
        tipo_campanha: 'conversao',
        template_gerador: '',
        template_revisor: '',
      })
    }
    setModalAberto(true)
  }

  async function salvarTemplate(e) {
    e.preventDefault()
    try {
      if (editando) {
        await templatesApi.atualizar(editando.id, formData)
        toast.success('Template atualizado!')
      } else {
        await templatesApi.criar(formData)
        toast.success('Template criado!')
      }
      setModalAberto(false)
      carregarTemplates()
    } catch (error) {
      toast.error('Erro ao salvar template')
    }
  }

  async function deletarTemplate(id) {
    if (!confirm('Tem certeza?')) return
    try {
      await templatesApi.deletar(id)
      toast.success('Template removido!')
      carregarTemplates()
    } catch (error) {
      toast.error('Erro ao remover')
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileCode className="w-8 h-8 text-[#1E3A5F]" />
            Templates de Prompt
          </h1>
          <p className="text-gray-600 mt-1">
            Personalize os prompts usados na geração de copys
          </p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Novo Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileCode className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum template criado
          </h3>
          <p className="text-gray-500 mb-6">
            Crie templates personalizados ou carregue os padrões do sistema
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => abrirModal()} className="btn btn-primary">
              <Plus className="w-5 h-5" />
              Criar Template
            </button>
            <button onClick={carregarDefaults} className="btn btn-outline">
              <RefreshCw className="w-5 h-5" />
              Carregar Padrões
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{template.nome}</h3>
                  <span className="text-sm text-gray-500 capitalize">{template.tipo_campanha}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirModal(template)}
                    className="p-2 text-gray-500 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletarTemplate(template.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Prompt Gerador</span>
                  <p className="text-sm text-gray-700 line-clamp-3 mt-1">
                    {template.template_gerador}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando ? 'Editar Template' : 'Novo Template'}
              </h2>
              <div className="flex items-center gap-2">
                {!editando && (
                  <button
                    onClick={carregarDefaults}
                    className="btn btn-outline text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Carregar Padrões
                  </button>
                )}
                <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={salvarTemplate} className="p-6 overflow-y-auto max-h-[calc(90vh-150px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="form-input"
                    placeholder="Ex: Template Urgência OAB"
                  />
                </div>
                <div>
                  <label className="form-label">Tipo de Campanha</label>
                  <select
                    value={formData.tipo_campanha}
                    onChange={(e) => setFormData({ ...formData, tipo_campanha: e.target.value })}
                    className="form-input"
                  >
                    <option value="conversao">Conversão</option>
                    <option value="awareness">Awareness</option>
                    <option value="remarketing">Remarketing</option>
                    <option value="lancamento">Lançamento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Prompt do Gerador *</label>
                <p className="text-xs text-gray-500 mb-2">
                  Placeholders disponíveis: {'{produto_nome}'}, {'{produto_descricao}'}, {'{persona_nome}'}, {'{persona_descricao}'}, {'{persona_dores}'}, {'{persona_objetivos}'}, {'{objetivo_campanha}'}, {'{tom}'}, {'{num_variantes}'}
                </p>
                <textarea
                  rows={10}
                  required
                  value={formData.template_gerador}
                  onChange={(e) => setFormData({ ...formData, template_gerador: e.target.value })}
                  className="form-input font-mono text-sm"
                  placeholder="Digite o prompt para o gerador de copys..."
                />
              </div>

              <div>
                <label className="form-label">Prompt do Revisor *</label>
                <p className="text-xs text-gray-500 mb-2">
                  Placeholders disponíveis: {'{produto_nome}'}, {'{persona_nome}'}, {'{persona_descricao}'}, {'{objetivo_campanha}'}, {'{tom}'}, {'{variantes_json}'}
                </p>
                <textarea
                  rows={8}
                  required
                  value={formData.template_revisor}
                  onChange={(e) => setFormData({ ...formData, template_revisor: e.target.value })}
                  className="form-input font-mono text-sm"
                  placeholder="Digite o prompt para o revisor de copys..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
