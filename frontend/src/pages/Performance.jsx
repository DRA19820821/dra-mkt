import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Play, Pause, DollarSign, Users, MousePointer, Eye, CheckCircle, XCircle } from 'lucide-react'
import { metaApi } from '../api'
import toast from 'react-hot-toast'

export default function Performance() {
  const [publicacoes, setPublicacoes] = useState([])
  const [acoesPendentes, setAcoesPendentes] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [pubRes, acoesRes, sumRes] = await Promise.all([
        metaApi.listPublicacoes(),
        metaApi.listPending(),
        metaApi.getSummary().catch(() => ({})),
      ])
      setPublicacoes(pubRes.data)
      setAcoesPendentes(acoesRes.data)
      setSummary(sumRes.data)
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync(pubId) {
    try {
      await metaApi.syncMetrics(pubId)
      toast.success('Métricas sincronizadas!')
      loadData()
    } catch (error) {
      toast.error('Erro ao sincronizar')
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      await metaApi.syncAll()
      toast.success('Todas as métricas sincronizadas!')
      loadData()
    } catch (error) {
      toast.error('Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function handleApprove(acaoId) {
    try {
      await metaApi.approveAction(acaoId)
      toast.success('Ação aprovada e executada!')
      loadData()
    } catch (error) {
      toast.error('Erro ao aprovar')
    }
  }

  async function handleReject(acaoId) {
    try {
      await metaApi.rejectAction(acaoId)
      toast.success('Ação rejeitada')
      loadData()
    } catch (error) {
      toast.error('Erro ao rejeitar')
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[#1E3A5F]" />
            Performance
          </h1>
          <p className="text-gray-600 mt-1">
            Métricas e status das campanhas publicadas no Meta
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="btn btn-outline"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
        </button>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Eye className="w-5 h-5" />
              <span className="text-sm">Impressões</span>
            </div>
            <p className="text-2xl font-bold">{(summary.total_impressions || 0).toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <MousePointer className="w-5 h-5" />
              <span className="text-sm">Cliques</span>
            </div>
            <p className="text-2xl font-bold">{(summary.total_clicks || 0).toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">Gasto Total</span>
            </div>
            <p className="text-2xl font-bold">R$ {(summary.total_spend || 0).toFixed(2)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">Conversões</span>
            </div>
            <p className="text-2xl font-bold">{(summary.total_conversions || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Ações Pendentes */}
      {acoesPendentes.length > 0 && (
        <div className="card p-6 border-amber-200 bg-amber-50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-900">
            <Pause className="w-5 h-5" />
            Ações Pendentes ({acoesPendentes.length})
          </h3>
          <div className="space-y-3">
            {acoesPendentes.map((acao) => (
              <div key={acao.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium">{acao.campanha_nome}</p>
                  <p className="text-sm text-gray-500">
                    Ação: <span className="capitalize">{acao.tipo_acao}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(acao.id)}
                    className="btn bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(acao.id)}
                    className="btn btn-outline text-sm border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Publicações */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Campanhas Publicadas</h3>
        {publicacoes.length === 0 ? (
          <div className="card p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma campanha publicada ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {publicacoes.map((pub) => (
              <div key={pub.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{pub.campanha_nome}</h4>
                      <StatusBadge status={pub.status_meta} />
                    </div>
                    <p className="text-sm text-gray-500">ID Meta: {pub.meta_campaign_id}</p>
                  </div>
                  <button
                    onClick={() => handleSync(pub.id)}
                    className="btn btn-outline text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Status Sync</p>
                    <p className="font-medium capitalize">{pub.status_sync}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Orçamento</p>
                    <p className="font-medium">R$ {pub.orcamento_diario || 0}/dia</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Criado em</p>
                    <p className="font-medium">{new Date(pub.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Atualizado</p>
                    <p className="font-medium">{new Date(pub.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    ARCHIVED: 'bg-gray-100 text-gray-700',
    PENDING_REVIEW: 'bg-blue-100 text-blue-700',
  }
  const labels = {
    ACTIVE: 'Ativa',
    PAUSED: 'Pausada',
    ARCHIVED: 'Arquivada',
    PENDING_REVIEW: 'Em Revisão',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.PAUSED}`}>
      {labels[status] || status}
    </span>
  )
}
