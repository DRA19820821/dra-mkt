import { useState, useEffect } from 'react'
import { Sparkles, Wand2, RefreshCw, Copy, Check, Save, Globe, BookOpen, Users, Clock, Layers, PenTool, ChevronRight, Star, AlertTriangle, Eye } from 'lucide-react'
import { hotmartApi } from '../api'
import toast from 'react-hot-toast'

export default function GerarProdutoHotmart() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [etapas, setEtapas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [abaAtiva, setAbaAtiva] = useState('estrutura')
  const [copiado, setCopiado] = useState(false)

  const [formData, setFormData] = useState({
    tema: '',
    publico_alvo: '',
    nivel: 'intermediario',
    carga_horaria_total: 20,
    num_modulos: 6,
    estilo_copy: 'vendas',
    provider: '',
    model: '',
    score_threshold: 7.0,
    max_tentativas: 3,
    salvar_automatico: true,
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const { data } = await hotmartApi.listarProviders()
      setProviders(data || [])
      if (data.length > 0 && data[0].models.length > 0) {
        setFormData(prev => ({ ...prev, provider: data[0].provider, model: data[0].models[0].id }))
      }
    } catch {
      toast.error('Erro ao carregar providers')
    } finally {
      setLoading(false)
    }
  }

  const modelsDisponiveis = providers.find(p => p.provider === formData.provider)?.models || []

  async function gerarProduto(e) {
    e.preventDefault()
    if (!formData.tema || !formData.publico_alvo) {
      toast.error('Preencha o tema e o público-alvo')
      return
    }

    setGerando(true)
    setEtapas([])
    setResultado(null)

    try {
      await hotmartApi.gerar(formData, {
        onStatus: (data) => {
          setEtapas(prev => [...prev, data])
        },
        onComplete: (data) => {
          setResultado(data)
          setGerando(false)
          toast.success('Produto gerado com sucesso!')
        },
        onError: (data) => {
          setGerando(false)
          toast.error(data.msg || 'Erro na geração')
          console.error(data)
        },
      })
    } catch (error) {
      setGerando(false)
      toast.error('Erro na conexão')
      console.error(error)
    }
  }

  function copiarHTML() {
    if (!resultado?.copy_vendas?.descricao_html) return
    navigator.clipboard.writeText(resultado.copy_vendas.descricao_html)
    setCopiado(true)
    toast.success('HTML copiado!')
    setTimeout(() => setCopiado(false), 2000)
  }

  async function sincronizarAgora() {
    if (!resultado?.hotmart_produto_id) {
      toast.error('Salve o produto primeiro')
      return
    }
    try {
      const { data } = await hotmartApi.sincronizar(resultado.hotmart_produto_id)
      toast.success(`Sincronizado! ${data.modulos_sync} módulos enviados.`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao sincronizar')
    }
  }

  function getScoreColor(score) {
    if (score >= 8) return 'bg-green-100 text-green-700'
    if (score >= 6) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
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
          <Sparkles className="w-8 h-8 text-[#1E3A5F]" />
          Gerar Produto Hotmart
        </h1>
        <p className="text-gray-600">
          Crie a estrutura completa de um curso + copy de vendas com inteligência artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Formulário */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#D4A853]" />
              Configuração
            </h2>

            <form onSubmit={gerarProduto} className="space-y-4">
              <div>
                <label className="form-label">Tema do produto *</label>
                <input
                  type="text"
                  required
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  className="form-input"
                  placeholder="Ex: Aprovação OAB - Direito Penal"
                />
              </div>

              <div>
                <label className="form-label">Público-alvo *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.publico_alvo}
                  onChange={(e) => setFormData({ ...formData, publico_alvo: e.target.value })}
                  className="form-input"
                  placeholder="Descreva a persona..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nível</label>
                  <select value={formData.nivel} onChange={(e) => setFormData({ ...formData, nivel: e.target.value })} className="form-input">
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Estilo de copy</label>
                  <select value={formData.estilo_copy} onChange={(e) => setFormData({ ...formData, estilo_copy: e.target.value })} className="form-input">
                    <option value="vendas">Vendas</option>
                    <option value="institucional">Institucional</option>
                    <option value="storytelling">Storytelling</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Carga horária (h)</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={formData.carga_horaria_total}
                    onChange={(e) => setFormData({ ...formData, carga_horaria_total: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Módulos</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={formData.num_modulos}
                    onChange={(e) => setFormData({ ...formData, num_modulos: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Configuração IA</h3>
                <div>
                  <label className="form-label">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const prov = e.target.value
                      const models = providers.find(p => p.provider === prov)?.models || []
                      setFormData({ ...formData, provider: prov, model: models[0]?.id || '' })
                    }}
                    className="form-input"
                  >
                    {providers.map(p => (
                      <option key={p.provider} value={p.provider}>{p.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Modelo</label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="form-input"
                  >
                    {modelsDisponiveis.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Score mínimo: {formData.score_threshold}</label>
                  <input
                    type="range"
                    min={6}
                    max={9.5}
                    step={0.5}
                    value={formData.score_threshold}
                    onChange={(e) => setFormData({ ...formData, score_threshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Tentativas máximas</label>
                  <select value={formData.max_tentativas} onChange={(e) => setFormData({ ...formData, max_tentativas: parseInt(e.target.value) })} className="form-input">
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="salvar_auto"
                    checked={formData.salvar_automatico}
                    onChange={(e) => setFormData({ ...formData, salvar_automatico: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="salvar_auto" className="text-sm text-gray-700">Salvar automaticamente no banco</label>
                </div>
              </div>

              <button
                type="submit"
                disabled={gerando}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A73] disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {gerando ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Gerar Produto</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Área Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progresso */}
          {gerando && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Progresso da Geração</h3>
              <div className="space-y-3">
                {etapas.map((etapa, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xs">
                      <Check className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{etapa.msg}</p>
                    </div>
                    {etapa.score && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(etapa.score)}`}>
                        {etapa.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-6 h-6 bg-[#D4A853] rounded-full flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 text-white animate-spin" />
                  </div>
                  <p className="text-sm text-gray-600">Processando...</p>
                </div>
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b flex">
                {[
                  { key: 'estrutura', label: 'Estrutura', icon: Layers },
                  { key: 'copy', label: 'Copy de Vendas', icon: PenTool },
                  { key: 'preview', label: 'Preview', icon: Eye },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAbaAtiva(tab.key)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      abaAtiva === tab.key
                        ? 'border-[#1E3A5F] text-[#1E3A5F]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {abaAtiva === 'estrutura' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#1E3A5F]" />
                        Estrutura do Curso
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(resultado.revisao_estrutura?.score_geral || 0)}`}>
                        Score: {(resultado.revisao_estrutura?.score_geral || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(resultado.estrutura?.modulos || []).map((modulo, i) => (
                        <div key={i} className="border rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-8 h-8 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {i + 1}
                            </span>
                            <div>
                              <h4 className="font-medium">{modulo.nome}</h4>
                              <p className="text-sm text-gray-500">{modulo.descricao}</p>
                            </div>
                          </div>
                          {modulo.aulas?.length > 0 && (
                            <div className="ml-11 mt-2 space-y-1">
                              {modulo.aulas.map((aula, j) => (
                                <div key={j} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                                  <ChevronRight className="w-3 h-3 text-gray-400" />
                                  <span className="flex-1">{aula.nome}</span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{aula.tipo}</span>
                                  <span className="text-xs text-gray-400">{aula.duracao_minutos}min</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {abaAtiva === 'copy' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-[#1E3A5F]" />
                        Copy de Vendas
                      </h3>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(resultado.revisao_copy?.score_geral || 0)}`}>
                          Score: {(resultado.revisao_copy?.score_geral || 0).toFixed(1)}
                        </span>
                        <button onClick={copiarHTML} className="p-2 hover:bg-gray-100 rounded-lg" title="Copiar HTML">
                          {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-500 uppercase">Título</span>
                        <p className="text-xl font-bold text-gray-900">{resultado.copy_vendas?.titulo}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-500 uppercase">Subtítulo</span>
                        <p className="text-lg text-gray-700">{resultado.copy_vendas?.subtitulo}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-500 uppercase">Descrição Curta</span>
                        <p className="text-gray-700">{resultado.copy_vendas?.descricao_curta}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">HTML da Página</span>
                        <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-auto max-h-96">
                          {resultado.copy_vendas?.descricao_html}
                        </pre>
                      </div>
                      <div className="p-4 bg-[#D4A853]/10 rounded-xl">
                        <span className="text-xs font-medium text-gray-500 uppercase">CTA</span>
                        <p className="text-lg font-semibold text-[#1E3A5F]">{resultado.copy_vendas?.cta}</p>
                      </div>
                    </div>
                  </div>
                )}

                {abaAtiva === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Preview da Página de Vendas</h3>
                      <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        Preview aproximado
                      </div>
                    </div>
                    <div
                      className="border rounded-xl p-6 prose max-w-none bg-white"
                      dangerouslySetInnerHTML={{ __html: resultado.copy_vendas?.descricao_html || '<p>Sem conteúdo</p>' }}
                    />
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                {resultado.hotmart_produto_id && (
                  <button onClick={sincronizarAgora} className="btn bg-[#F04E23] hover:bg-[#D94420] text-white">
                    <Globe className="w-5 h-5" />
                    Sincronizar com Hotmart
                  </button>
                )}
                <button onClick={() => { setResultado(null); setEtapas([]) }} className="btn btn-outline">
                  <RefreshCw className="w-5 h-5" />
                  Gerar Novo
                </button>
              </div>
            </div>
          )}

          {!resultado && !gerando && (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#1E3A5F]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pronto para gerar seu produto!
              </h3>
              <p className="text-gray-500">
                Preencha o formulário e clique em "Gerar Produto"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
