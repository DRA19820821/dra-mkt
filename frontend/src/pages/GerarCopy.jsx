import { useState, useEffect } from 'react'
import { PenTool, Wand2, Sparkles, Copy, Check, Star, RefreshCw } from 'lucide-react'
import { produtosApi, personasApi, copysApi } from '../api'
import toast from 'react-hot-toast'

export default function GerarCopy() {
  const [produtos, setProdutos] = useState([])
  const [personas, setPersonas] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState(null)
  
  const [formData, setFormData] = useState({
    produto_id: '',
    persona_id: '',
    objetivo: 'conversao',
    tom: 'urgencia',
    provider: '',
    model: '',
    num_variantes: 3,
    score_threshold: 7.0,
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [prodRes, persRes, provRes] = await Promise.all([
        produtosApi.listar(),
        personasApi.listar(),
        copysApi.listarProviders(),
      ])
      setProdutos(prodRes.data)
      setPersonas(persRes.data)
      setProviders(provRes.data)
      
      // Selecionar primeiro provider/modelo por padrão
      if (provRes.data.length > 0 && provRes.data[0].models.length > 0) {
        setFormData(prev => ({
          ...prev,
          provider: provRes.data[0].provider,
          model: provRes.data[0].models[0].id,
        }))
      }
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const modelsDisponiveis = providers.find(p => p.provider === formData.provider)?.models || []

  async function gerarCopys(e) {
    e.preventDefault()
    
    if (!formData.produto_id || !formData.persona_id) {
      toast.error('Selecione um produto e uma persona')
      return
    }

    setGerando(true)
    setProgresso('Iniciando geração...')
    setResultado(null)

    try {
      await copysApi.gerar(formData, {
        onStatus: (data) => {
          setProgresso(data.msg || 'Processando...')
        },
        onComplete: (data) => {
          setResultado(data)
          setGerando(false)
          setProgresso('')
          toast.success('Copys geradas com sucesso!')
        },
        onError: (data) => {
          setGerando(false)
          setProgresso('')
          toast.error(data.msg || 'Erro ao gerar copys')
          console.error('Erro:', data)
        },
      })
    } catch (error) {
      setGerando(false)
      setProgresso('')
      toast.error('Erro na conexão')
      console.error(error)
    }
  }

  function copiarCopy(variante) {
    const texto = `${variante.headline}\n\n${variante.body_text}\n\n${variante.cta}`
    navigator.clipboard.writeText(texto)
    toast.success('Copy copiada!')
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
          <PenTool className="w-8 h-8 text-[#1E3A5F]" />
          Gerador de Copys
        </h1>
        <p className="text-gray-600">
          Crie copys persuasivas com inteligência artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#D4A853]" />
            Configuração da Campanha
          </h2>

          <form onSubmit={gerarCopys} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produto *
              </label>
              <select
                required
                value={formData.produto_id}
                onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
              >
                <option value="">Selecione um produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona *
              </label>
              <select
                required
                value={formData.persona_id}
                onChange={(e) => setFormData({ ...formData, persona_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
              >
                <option value="">Selecione uma persona</option>
                {personas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo
                </label>
                <select
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                >
                  <option value="conversao">Conversão</option>
                  <option value="awareness">Awareness</option>
                  <option value="remarketing">Remarketing</option>
                  <option value="lancamento">Lançamento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tom
                </label>
                <select
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                >
                  <option value="urgencia">Urgência</option>
                  <option value="autoridade">Autoridade</option>
                  <option value="empatia">Empatia</option>
                  <option value="humor">Humor</option>
                  <option value="profissional">Profissional</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider IA
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => {
                    const provider = e.target.value
                    const models = providers.find(p => p.provider === provider)?.models || []
                    setFormData({
                      ...formData,
                      provider,
                      model: models[0]?.id || '',
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                >
                  {providers.map(p => (
                    <option key={p.provider} value={p.provider}>{p.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none"
                >
                  {modelsDisponiveis.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de variantes: {formData.num_variantes}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.num_variantes}
                onChange={(e) => setFormData({ ...formData, num_variantes: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={gerando}
              className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#2A4A73] disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {gerando ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {progresso}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Copys
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resultados */}
        <div>
          {!resultado && !gerando && (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#1E3A5F]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pronto para gerar copys!
              </h3>
              <p className="text-gray-500">
                Preencha o formulário e clique em "Gerar Copys"
              </p>
            </div>
          )}

          {gerando && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-[#D4A853]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-[#D4A853] animate-spin" />
              </div>
              <p className="text-lg font-medium text-gray-900">{progresso}</p>
              <p className="text-sm text-gray-500 mt-2">
                Isso pode levar alguns segundos...
              </p>
            </div>
          )}

          {resultado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Resultados ({resultado.variantes.length} variantes)
                </h3>
                <span className="text-sm text-gray-500">
                  {resultado.tentativas} tentativa{resultado.tentativas > 1 ? 's' : ''}
                </span>
              </div>

              {resultado.variantes.map((variante, i) => {
                const revisao = resultado.revisao[i] || {}
                const score = revisao.score_geral || 0
                
                return (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
                          Score: {score.toFixed(1)}
                        </span>
                      </div>
                      <button
                        onClick={() => copiarCopy(variante)}
                        className="p-2 text-gray-500 hover:text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copiar"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Headline</span>
                        <p className="text-lg font-semibold text-gray-900">{variante.headline}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Body</span>
                        <p className="text-gray-700">{variante.body_text}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">CTA</span>
                        <p className="text-[#D4A853] font-medium">{variante.cta}</p>
                      </div>
                    </div>

                    {revisao.feedback && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Feedback:</span> {revisao.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
