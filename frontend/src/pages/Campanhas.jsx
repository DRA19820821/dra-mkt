import { useState, useEffect } from 'react'
import { Megaphone, Plus, X, ChevronRight, CheckCircle, Image as ImageIcon, FileText } from 'lucide-react'
import { campanhasApi, produtosApi, personasApi, copysApi, criativosApi } from '../api'
import toast from 'react-hot-toast'

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [personas, setPersonas] = useState([])
  const [copys, setCopys] = useState([])
  const [criativos, setCriativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [etapa, setEtapa] = useState(1)
  
  const [formData, setFormData] = useState({
    nome: '',
    produto_id: '',
    persona_id: '',
    objetivo: 'conversao',
    tom: 'urgencia',
    copy_id: '',
    criativo_id: '',
    plataforma: 'facebook_instagram',
    orcamento_diario: '',
    notas: '',
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [campRes, prodRes, persRes, copyRes, criaRes] = await Promise.all([
        campanhasApi.listar(),
        produtosApi.listar(),
        personasApi.listar(),
        copysApi.listar({ status: 'aprovado' }),
        criativosApi.listar({ status: 'aprovado' }),
      ])
      setCampanhas(campRes.data)
      setProdutos(prodRes.data || [])
      setPersonas(persRes.data || [])
      setCopys(copyRes.data || [])
      setCriativos(criaRes.data || [])
      
      // Debug
      console.log('Produtos carregados:', prodRes.data?.length || 0)
      console.log('Personas carregadas:', persRes.data?.length || 0)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  async function salvarCampanha(e) {
    e.preventDefault()
    try {
      await campanhasApi.criar(formData)
      toast.success('Campanha criada!')
      setModalAberto(false)
      setEtapa(1)
      setFormData({
        nome: '', produto_id: '', persona_id: '', objetivo: 'conversao',
        tom: 'urgencia', copy_id: '', criativo_id: '',
        plataforma: 'facebook_instagram', orcamento_diario: '', notas: '',
      })
      carregarDados()
    } catch (error) {
      toast.error('Erro ao criar campanha')
    }
  }

  function getStatusBadge(status) {
    const styles = {
      rascunho: 'bg-gray-100 text-gray-700',
      pronto: 'bg-blue-100 text-blue-700',
      ativa: 'bg-green-100 text-green-700',
      pausada: 'bg-yellow-100 text-yellow-700',
      concluida: 'bg-purple-100 text-purple-700',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-[#1E3A5F]" />
            Campanhas
          </h1>
          <p className="text-gray-600 mt-1">
            Unifique copys e criativos em pacotes prontos para anúncios
          </p>
        </div>
        <button
          onClick={() => {
            // Recarregar dados ao abrir modal para garantir que temos os produtos/personas mais recentes
            carregarDados()
            setModalAberto(true)
          }}
          className="btn btn-primary"
        >
          <Plus className="w-5 h-5" />
          Nova Campanha
        </button>
      </div>

      {campanhas.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Megaphone className="w-10 h-10 text-[#1E3A5F]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma campanha criada
          </h3>
          <p className="text-gray-500 mb-6">
            Crie sua primeira campanha unindo copy e criativo
          </p>
          <button onClick={() => setModalAberto(true)} className="btn btn-primary">
            <Plus className="w-5 h-5" />
            Criar Campanha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campanhas.map((camp) => (
            <div key={camp.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(camp.status)}`}>
                  {camp.status}
                </span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{camp.nome}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {camp.produto_nome} → {camp.persona_nome}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {camp.copy_id ? '✓ Copy' : '—'}
                </div>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  {camp.criativo_id ? '✓ Criativo' : '—'}
                </div>
              </div>

              <div className="flex gap-2">
                {camp.status === 'rascunho' && camp.copy_id && camp.criativo_id && (
                  <button
                    onClick={() => campanhasApi.alterarStatus(camp.id, 'pronto').then(carregarDados)}
                    className="btn btn-outline text-sm flex-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Pronto
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Nova Campanha</h2>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarCampanha} className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
              {/* Etapa 1: Informações Básicas */}
              {etapa === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Nome da Campanha *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="form-input"
                      placeholder="Ex: Lançamento Anki OAB Abril"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Produto *</label>
                      <select
                        required
                        value={formData.produto_id}
                        onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                        className="form-input"
                        disabled={produtos.length === 0}
                      >
                        <option value="">
                          {produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Selecione'}
                        </option>
                        {produtos.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      {produtos.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Cadastre um produto primeiro em "Produtos"
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Persona *</label>
                      <select
                        required
                        value={formData.persona_id}
                        onChange={(e) => setFormData({ ...formData, persona_id: e.target.value })}
                        className="form-input"
                        disabled={personas.length === 0}
                      >
                        <option value="">
                          {personas.length === 0 ? 'Nenhuma persona cadastrada' : 'Selecione'}
                        </option>
                        {personas.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      {personas.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Cadastre uma persona primeiro em "Personas"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Objetivo</label>
                      <select
                        value={formData.objetivo}
                        onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                        className="form-input"
                      >
                        <option value="conversao">Conversão</option>
                        <option value="awareness">Awareness</option>
                        <option value="remarketing">Remarketing</option>
                        <option value="lancamento">Lançamento</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Tom</label>
                      <select
                        value={formData.tom}
                        onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                        className="form-input"
                      >
                        <option value="urgencia">Urgência</option>
                        <option value="autoridade">Autoridade</option>
                        <option value="empatia">Empatia</option>
                        <option value="humor">Humor</option>
                        <option value="profissional">Profissional</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    disabled={!formData.nome || !formData.produto_id || !formData.persona_id}
                    className="w-full btn btn-primary"
                  >
                    Próximo <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Etapa 2: Copy e Criativo */}
              {etapa === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Copy (aprovadas)</label>
                    <select
                      value={formData.copy_id}
                      onChange={(e) => setFormData({ ...formData, copy_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Selecionar copy...</option>
                      {copys.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.produto_nome} — {c.objetivo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Criativo (aprovados)</label>
                    <select
                      value={formData.criativo_id}
                      onChange={(e) => setFormData({ ...formData, criativo_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Selecionar criativo...</option>
                      {criativos.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.produto_nome} — {c.formato}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Orçamento Diário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.orcamento_diario}
                      onChange={(e) => setFormData({ ...formData, orcamento_diario: e.target.value })}
                      className="form-input"
                      placeholder="100.00"
                    />
                  </div>

                  <div>
                    <label className="form-label">Notas</label>
                    <textarea
                      rows={3}
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className="form-input"
                      placeholder="Observações sobre a campanha..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEtapa(1)}
                      className="btn btn-outline flex-1"
                    >
                      Voltar
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Criar Campanha
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
