import { useState, useEffect } from 'react'
import { Link2, CheckCircle, AlertCircle, Save, TestTube, Trash2 } from 'lucide-react'
import { hotmartApi } from '../api'
import toast from 'react-hot-toast'

export default function HotmartConnect() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState(null)

  const [formData, setFormData] = useState({
    client_id: '',
    client_secret: '',
    basic_token: '',
    ambiente: 'sandbox',
  })

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data } = await hotmartApi.getConfig()
      setConfig(data)
      if (data.configured) {
        setFormData({
          client_id: data.client_id || '',
          client_secret: '',
          basic_token: '',
          ambiente: data.ambiente || 'sandbox',
        })
      } else {
        // Tentar carregar do .env automaticamente
        await loadEnvConfig()
      }
    } catch (error) {
      toast.error('Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  async function loadEnvConfig() {
    try {
      const { data } = await hotmartApi.getEnvConfig()
      setFormData({
        client_id: data.client_id || '',
        client_secret: data.client_secret || '',
        basic_token: data.basic_token || '',
        ambiente: data.ambiente || 'sandbox',
      })
    } catch {
      // Silencioso: .env não configurado
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formData.client_id || !formData.client_secret || !formData.basic_token) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      await hotmartApi.saveConfig(formData)
      toast.success('Configuração salva!')
      loadConfig()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestError(null)
    try {
      const testData = !config?.configured ? {
        client_id: formData.client_id,
        client_secret: formData.client_secret,
        basic_token: formData.basic_token,
        ambiente: formData.ambiente,
      } : null

      const { data } = await hotmartApi.validate(testData)
      if (data.valid) {
        toast.success(`✅ Conectado! Ambiente: ${data.ambiente}`)
        loadConfig()
      } else {
        setTestError(data.error || 'Conexão inválida')
        toast.error(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Erro ao testar conexão'
      setTestError(msg)
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja remover a configuração?')) return
    try {
      await hotmartApi.deleteConfig()
      toast.success('Configuração removida')
      setConfig(null)
      setFormData({ client_id: '', client_secret: '', basic_token: '', ambiente: 'sandbox' })
    } catch {
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

  const isConnected = config?.configured && config?.is_valid

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Link2 className="w-8 h-8 text-[#1E3A5F]" />
          Hotmart Connect
        </h1>
        <p className="text-gray-600 mt-1">
          Configure a integração com a Hotmart API para criar e gerenciar produtos
        </p>
      </div>

      {/* Status Card */}
      <div className={`card p-6 ${isConnected ? 'border-green-500 border-2' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isConnected ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {isConnected ? 'Conectado à Hotmart' : 'Não configurado'}
            </h2>
            <p className="text-gray-500">
              {isConnected
                ? `Ambiente: ${config.ambiente || 'sandbox'} • Última validação: ${config.last_validated ? new Date(config.last_validated).toLocaleString() : 'N/A'}`
                : 'Configure suas credenciais para começar a criar produtos'
              }
            </p>
          </div>
          {isConnected && (
            <button onClick={handleTest} disabled={testing} className="ml-auto btn btn-outline">
              <TestTube className="w-4 h-4" />
              {testing ? 'Testando...' : 'Testar'}
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-6">Configuração da API</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Client ID *</label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="form-input"
                placeholder="Seu Client ID"
                required
              />
            </div>
            <div>
              <label className="form-label">Ambiente *</label>
              <select
                value={formData.ambiente}
                onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
                className="form-input"
              >
                <option value="sandbox">Sandbox (testes)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Client Secret *</label>
            <input
              type="password"
              value={formData.client_secret}
              onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
              className="form-input"
              placeholder="Seu Client Secret"
              required
            />
          </div>

          <div>
            <label className="form-label">Basic Token *</label>
            <input
              type="password"
              value={formData.basic_token}
              onChange={(e) => setFormData({ ...formData, basic_token: e.target.value })}
              className="form-input"
              placeholder="Base64(client_id:client_secret)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Gere com: echo -n "client_id:client_secret" | base64
            </p>
          </div>

          {/* Erro de Teste */}
          {testError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-1">Erro na conexão</h4>
                  <p className="text-sm text-red-700">{testError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="btn btn-outline"
            >
              <TestTube className="w-5 h-5" />
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            {config?.configured && (
              <button type="button" onClick={handleDelete} className="btn btn-outline text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
                <Trash2 className="w-5 h-5" />
                Remover
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Instruções */}
      <div className="card p-6 bg-orange-50 border-orange-200">
        <h3 className="text-lg font-semibold mb-4 text-orange-900">Como obter as credenciais</h3>
        <ol className="space-y-3 text-sm text-orange-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Acesse <a href="https://developers.hotmart.com" target="_blank" rel="noopener noreferrer" className="underline">developers.hotmart.com</a></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Crie uma aplicação ou use uma existente</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Copie o Client ID e Client Secret da aplicação</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Gere o Basic Token: echo -n &quot;CLIENT_ID:CLIENT_SECRET&quot; | base64</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>Use sempre o ambiente Sandbox para testes</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
