import { useState, useEffect } from 'react'
import { Image as ImageIcon, Sparkles, Download, RefreshCw, Check } from 'lucide-react'
import { produtosApi, personasApi, criativosApi } from '../api'
import toast from 'react-hot-toast'

export default function GerarCriativo() {
  const [produtos, setProdutos] = useState([])
  const [personas, setPersonas] = useState([])
  const [modelos, setModelos] = useState([])
  const [formatos, setFormatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState(null)
  
  const [formData, setFormData] = useState({
    produto_id: '',
    persona_id: '',
    objetivo: 'conversao',
    tom: 'urgencia',
    formato: 'feed_square',
    modelo: 'nano-banana-2',  // Modelo recomendado: Nano Banana 2
    estilo: 'moderno e profissional',
    headline: '',
    instrucoes_adicionais: '',
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [prodRes, persRes, modRes, fmtRes] = await Promise.all([
        produtosApi.listar(),
        personasApi.listar(),
        criativosApi.listarModelos(),
        criativosApi.listarFormatos(),
      ])
      setProdutos(prodRes.data)
      setPersonas(persRes.data)
      setModelos(modRes.data)
      setFormatos(fmtRes.data)
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function gerarCriativo(e) {
    e.preventDefault()
    
    if (!formData.produto_id || !formData.persona_id) {
      toast.error('Selecione um produto e uma persona')
      return
    }

    setGerando(true)
    setProgresso('Iniciando geração...')
    setResultado(null)

    try {
      await criativosApi.gerar(formData, {
        onStatus: (data) => {
          setProgresso(data.msg || 'Processando...')
        },
        onComplete: (data) => {
          setResultado(data)
          setGerando(false)
          setProgresso('')
          toast.success('Criativo gerado com sucesso!')
        },
        onError: (data) => {
          setGerando(false)
          setProgresso('')
          toast.error(data.msg || 'Erro ao gerar criativo')
        },
      })
    } catch (error) {
      setGerando(false)
      setProgresso('')
      toast.error('Erro na conexão')
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-[#1E3A5F]" />
          Gerar Criativo
        </h1>
        <p className="text-gray-600 mt-1">
          Crie imagens profissionais para seus anúncios usando IA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4A853]" />
            Configuração do Criativo
          </h2>

          <form onSubmit={gerarCriativo} className="space-y-4">
            <div>
              <label className="form-label">Produto *</label>
              <select
                required
                value={formData.produto_id}
                onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                className="form-input"
              >
                <option value="">Selecione um produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Persona *</label>
              <select
                required
                value={formData.persona_id}
                onChange={(e) => setFormData({ ...formData, persona_id: e.target.value })}
                className="form-input"
              >
                <option value="">Selecione uma persona</option>
                {personas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
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

            <div>
              <label className="form-label">Formato do Anúncio</label>
              <select
                value={formData.formato}
                onChange={(e) => setFormData({ ...formData, formato: e.target.value })}
                className="form-input"
              >
                {formatos.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.width}x{f.height})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Modelo de Imagem</label>
              <select
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="form-input"
              >
                {modelos.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label} — {m.price_approx}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Estilo Visual</label>
              <select
                value={formData.estilo}
                onChange={(e) => setFormData({ ...formData, estilo: e.target.value })}
                className="form-input"
              >
                <option value="moderno e profissional">Moderno e Profissional</option>
                <option value="minimalista">Minimalista</option>
                <option value="colorido e vibrante">Colorido e Vibrante</option>
                <option value="escuro e elegante">Escuro e Elegante</option>
                <option value="divertido e casual">Divertido e Casual</option>
              </select>
            </div>

            <div>
              <label className="form-label">Headline (texto na imagem)</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="form-input"
                placeholder="Ex: Aprovação Garantida na OAB!"
              />
            </div>

            <div>
              <label className="form-label">Instruções Adicionais (opcional)</label>
              <textarea
                rows={3}
                value={formData.instrucoes_adicionais}
                onChange={(e) => setFormData({ ...formData, instrucoes_adicionais: e.target.value })}
                className="form-input"
                placeholder="Instruções específicas para a imagem..."
              />
            </div>

            <button
              type="submit"
              disabled={gerando}
              className="w-full btn btn-primary py-3 disabled:opacity-50"
            >
              {gerando ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {progresso}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Criativo
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div>
          {!resultado && !gerando && (
            <div className="card p-12 text-center border-dashed">
              <div className="w-20 h-20 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-10 h-10 text-[#1E3A5F]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pronto para gerar imagens!
              </h3>
              <p className="text-gray-500">
                Preencha o formulário e clique em "Gerar Criativo"
              </p>
            </div>
          )}

          {gerando && (
            <div className="card p-8 text-center">
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
              <div className="card overflow-hidden">
                <img
                  src={criativosApi.imagemUrl(resultado.criativo_id)}
                  alt="Criativo gerado"
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-3">
                <a
                  href={criativosApi.imagemUrl(resultado.criativo_id)}
                  download
                  className="flex-1 btn btn-primary"
                >
                  <Download className="w-5 h-5" />
                  Download PNG
                </a>
                <button
                  onClick={() => {
                    setResultado(null)
                    setProgresso('')
                  }}
                  className="btn btn-outline"
                >
                  <RefreshCw className="w-5 h-5" />
                  Novo
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <p><strong>Modelo:</strong> {resultado.modelo_usado}</p>
                <p><strong>Formato:</strong> {resultado.formato}</p>
                <p><strong>Tamanho:</strong> {(resultado.tamanho_bytes / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
