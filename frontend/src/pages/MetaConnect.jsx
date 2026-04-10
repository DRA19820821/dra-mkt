import { useState, useEffect } from 'react'
import { Settings, CheckCircle, AlertCircle, Save, TestTube, ExternalLink } from 'lucide-react'
import { metaApi } from '../api'
import toast from 'react-hot-toast'

export default function MetaConnect() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  
  const [formData, setFormData] = useState({
    app_id: '',
    ad_account_id: '',
    page_id: '',
    access_token: '',
    api_version: 'v25.0',
  })

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data } = await metaApi.getConfig()
      setConfig(data)
      if (data.configured) {
        setFormData({
          app_id: data.app_id || '',
          ad_account_id: data.ad_account_id || '',
          page_id: data.page_id || '',
          access_token: '', // Não mostra o token completo
          api_version: data.api_version || 'v25.0',
        })
      }
    } catch (error) {
      toast.error('Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formData.access_token) {
      toast.error('Access Token é obrigatório')
      return
    }
    
    setSaving(true)
    try {
      await metaApi.saveConfig(formData)
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
    try {
      const { data } = await metaApi.validate()
      if (data.valid) {
        toast.success(`✅ Conectado! Conta: ${data.account_name}`)
        loadConfig()
      } else {
        toast.error(`❌ Erro: ${data.error}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao testar conexão')
    } finally {
      setTesting(false)
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
          <Settings className="w-8 h-8 text-[#1E3A5F]" />
          Meta Connect
        </h1>
        <p className="text-gray-600 mt-1">
          Configure a integração com Meta Marketing API para publicar campanhas diretamente no Facebook e Instagram
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
              {isConnected ? 'Conectado ao Meta' : 'Não configurado'}
            </h2>
            <p className="text-gray-500">
              {isConnected 
                ? `Conta: ${config.account_name || 'Meta Business'} • Última validação: ${new Date(config.last_validated).toLocaleString()}`
                : 'Configure suas credenciais para começar a publicar campanhas'
              }
            </p>
          </div>
          {isConnected && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="ml-auto btn btn-outline"
            >
              <TestTube className="w-4 h-4" />
              {testing ? 'Testando...' : 'Testar'}
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Config */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-6">Configuração da API</h3>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">App ID *</label>
              <input
                type="text"
                value={formData.app_id}
                onChange={(e) => setFormData({...formData, app_id: e.target.value})}
                className="form-input"
                placeholder="1234567890"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Encontre em developers.facebook.com/apps</p>
            </div>
            
            <div>
              <label className="form-label">Ad Account ID *</label>
              <input
                type="text"
                value={formData.ad_account_id}
                onChange={(e) => setFormData({...formData, ad_account_id: e.target.value})}
                className="form-input"
                placeholder="act_123456789"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Formato: act_123456789</p>
            </div>
          </div>

          <div>
            <label className="form-label">Page ID *</label>
            <input
              type="text"
              value={formData.page_id}
              onChange={(e) => setFormData({...formData, page_id: e.target.value})}
              className="form-input"
              placeholder="1234567890"
              required
            />
            <p className="text-xs text-gray-500 mt-1">ID da página do Facebook que será usada nos anúncios</p>
          </div>

          <div>
            <label className="form-label">Access Token *</label>
            <input
              type="password"
              value={formData.access_token}
              onChange={(e) => setFormData({...formData, access_token: e.target.value})}
              className="form-input"
              placeholder="EAAB..."
              required={!config?.configured}
            />
            <p className="text-xs text-gray-500 mt-1">
              Token de acesso do System User. 
              <a 
                href="https://business.facebook.com/settings/system-users" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#1E3A5F] underline inline-flex items-center gap-1"
              >
                Gerar token <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div>
            <label className="form-label">Versão da API</label>
            <select
              value={formData.api_version}
              onChange={(e) => setFormData({...formData, api_version: e.target.value})}
              className="form-input"
            >
              <option value="v25.0">v25.0 (recomendada)</option>
              <option value="v24.0">v24.0</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config?.configured}
              className="btn btn-outline"
            >
              <TestTube className="w-5 h-5" />
              {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>
        </form>
      </div>

      {/* Instruções */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">Como obter as credenciais</h3>
        <ol className="space-y-3 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a> e faça login com sua conta de administrador</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Vá em Configurações → System Users e crie um novo usuário de sistema (ou use um existente)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Gere um token com permissões: ads_management, pages_read_engagement, business_management</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>O Ad Account ID está em Configurações → Contas de Anúncio (formato: act_123456789)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>O Page ID está na URL da sua página de Facebook (facebook.com/123456789) ou em Configurações da página</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">6.</span>
            <span>O App ID está em <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com/apps</a></span>
          </li>
        </ol>
      </div>
    </div>
  )
}
