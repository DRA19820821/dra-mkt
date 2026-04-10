import { useState, useEffect } from 'react'
import { Megaphone, Plus, X, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2, Play, Pause, CheckCircle, RotateCcw, CheckCheck, ChevronRight, ChevronLeft, Image as ImageIcon, FileText, Upload, Download, Globe } from 'lucide-react'
import { campanhasApi, produtosApi, personasApi, copysApi, criativosApi, metaApi } from '../api'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
  { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  { value: 'pronto', label: 'Pronto', color: 'bg-blue-100 text-blue-700' },
  { value: 'ativa', label: 'Ativa', color: 'bg-green-100 text-green-700' },
  { value: 'pausada', label: 'Pausada', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'concluida', label: 'Concluída', color: 'bg-purple-100 text-purple-700' },
]

const OBJETIVO_LABELS = { conversao: 'Conversão', awareness: 'Awareness', remarketing: 'Remarketing', lancamento: 'Lançamento' }
const TOM_LABELS = { urgencia: 'Urgência', autoridade: 'Autoridade', empatia: 'Empatia', humor: 'Humor', profissional: 'Profissional' }

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [personas, setPersonas] = useState([])
  const [copys, setCopys] = useState([])
  const [criativos, setCriativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [campanhaSelecionada, setCampanhaSelecionada] = useState(null)
  const [editando, setEditando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [etapa, setEtapa] = useState(1)
  const [publicando, setPublicando] = useState(null)
  const [exportando, setExportando] = useState(null)
  const [formData, setFormData] = useState({ nome: '', produto_id: '', persona_id: '', objetivo: 'conversao', tom: 'urgencia', copy_id: '', criativo_id: '', plataforma: 'facebook_instagram', orcamento_diario: '', notas: '' })

  useEffect(() => { carregarDados() }, [filtroStatus])

  async function carregarDados() {
    try {
      setLoading(true)
      const [campRes, prodRes, persRes, copyRes, criaRes] = await Promise.all([
        campanhasApi.listar(filtroStatus ? { status: filtroStatus } : {}),
        produtosApi.listar(), personasApi.listar(),
        copysApi.listar({ status: 'aprovado' }), criativosApi.listar({ status: 'aprovado' }),
      ])
      setCampanhas(campRes.data); setProdutos(prodRes.data || []); setPersonas(persRes.data || [])
      setCopys(copyRes.data || []); setCriativos(criaRes.data || [])
    } catch { toast.error('Erro ao carregar dados') } finally { setLoading(false) }
  }

  async function carregarDetalhes(camp) {
    try { const { data } = await campanhasApi.detalhe(camp.id); setCampanhaSelecionada(data); setModalDetalhesAberto(true) } catch { toast.error('Erro ao carregar') }
  }

  async function publicarNoMeta(camp) {
    if (!camp.copy_id || !camp.criativo_id) {
      toast.error('Campanha precisa ter copy e criativo vinculados')
      return
    }
    if (!confirm('Publicar campanha no Meta Ads? A campanha será criada PAUSADA e você precisará aprovar a ativação.')) return
    
    setPublicando(camp.id)
    try {
      const { data } = await metaApi.publish(camp.id)
      toast.success(data.msg || 'Campanha publicada no Meta!')
      carregarDados()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao publicar no Meta')
    } finally {
      setPublicando(null)
    }
  }

  async function exportarCampanha(camp) {
    if (!camp.copy_id || !camp.criativo_id) {
      toast.error('Campanha precisa ter copy e criativo vinculados')
      return
    }
    
    setExportando(camp.id)
    try {
      const response = await metaApi.export(camp.id)
      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `campanha_${camp.id}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Exportação realizada!')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao exportar')
    } finally {
      setExportando(null)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    try {
      if (editando && campanhaSelecionada) await campanhasApi.atualizar(campanhaSelecionada.id, formData)
      else await campanhasApi.criar(formData)
      toast.success(editando ? 'Atualizado!' : 'Criado!'); fecharModal(); carregarDados()
    } catch { toast.error('Erro ao salvar') }
  }

  async function alterarStatus(id, status) {
    try { await campanhasApi.alterarStatus(id, status); toast.success('Status atualizado!'); carregarDados(); if (campanhaSelecionada?.id === id) setCampanhaSelecionada({ ...campanhaSelecionada, status }) } catch { toast.error('Erro') }
  }

  async function deletar(id) {
    if (!confirm('Tem certeza?')) return
    try { await campanhasApi.deletar(id); toast.success('Excluído!'); carregarDados(); if (campanhaSelecionada?.id === id) setModalDetalhesAberto(false) } catch { toast.error('Erro') }
  }

  function abrirCriar() { setEditando(false); setEtapa(1); setFormData({ nome: '', produto_id: '', persona_id: '', objetivo: 'conversao', tom: 'urgencia', copy_id: '', criativo_id: '', plataforma: 'facebook_instagram', orcamento_diario: '', notas: '' }); setModalCriarAberto(true) }
  function abrirEditar(camp) { setEditando(true); setEtapa(1); setFormData({ nome: camp.nome, produto_id: camp.produto_id?.toString() || '', persona_id: camp.persona_id?.toString() || '', objetivo: camp.objetivo, tom: camp.tom, copy_id: camp.copy_id?.toString() || '', criativo_id: camp.criativo_id?.toString() || '', plataforma: camp.plataforma, orcamento_diario: camp.orcamento_diario || '', notas: camp.notas || '' }); setCampanhaSelecionada(camp); setModalCriarAberto(true) }
  function fecharModal() { setModalCriarAberto(false); setEditando(false); setCampanhaSelecionada(null) }
  function getStatusConfig(s) { return STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0] }

  const campanhasFiltradas = campanhas.filter(c => busca === '' || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.produto_nome?.toLowerCase().includes(busca.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Megaphone className="w-8 h-8 text-[#1E3A5F]" />Campanhas</h1>
          <p className="text-gray-600 mt-1">Gerencie suas campanhas</p>
        </div>
        <button onClick={abrirCriar} className="btn btn-primary"><Plus className="w-5 h-5" />Nova</button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="form-input pl-10" /></div>
          <div className="flex items-center gap-2"><Filter className="w-5 h-5 text-gray-500" /><select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="form-input w-auto">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div className="flex bg-gray-100 rounded-lg p-1"><button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500'}`}><LayoutGrid className="w-5 h-5" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500'}`}><List className="w-5 h-5" /></button></div>
        </div>
        <div className="flex gap-2 text-sm"><span className="px-3 py-1 bg-gray-100 rounded-full">Total: <strong>{campanhas.length}</strong></span>{campanhas.length !== campanhasFiltradas.length && <span className="px-3 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full">Filtrado: <strong>{campanhasFiltradas.length}</strong></span>}</div>
      </div>

      {campanhasFiltradas.length === 0 ? (
        <div className="card p-12 text-center"><div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"><Megaphone className="w-10 h-10 text-[#1E3A5F]" /></div><h3 className="text-xl font-semibold mb-2">{busca ? 'Nenhuma campanha' : 'Nenhuma campanha criada'}</h3><p className="text-gray-500 mb-6">{busca ? 'Ajuste os filtros' : 'Crie sua primeira campanha'}</p>{!busca && <button onClick={abrirCriar} className="btn btn-primary"><Plus className="w-5 h-5" />Criar</button>}</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campanhasFiltradas.map(camp => (
            <div key={camp.id} className="card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => carregarDetalhes(camp)}>
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {camp.criativo_imagem ? <img src={`/dra-mkt/api/criativos/${camp.criativo_id}/thumb`} alt="" className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-16 h-16 text-gray-300" /></div>}
                <div className="absolute top-3 left-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusConfig(camp.status).color}`}>{getStatusConfig(camp.status).label}</span></div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}><button onClick={() => abrirEditar(camp)} className="p-1.5 bg-white/90 rounded-lg hover:bg-white"><Edit3 className="w-4 h-4" /></button><button onClick={() => deletar(camp.id)} className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-lg">{camp.nome}</h3>
                <div className="text-sm text-gray-500">{camp.produto_nome} → {camp.persona_nome}</div>
                <div className="flex gap-2"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{OBJETIVO_LABELS[camp.objetivo]}</span><span className="px-2 py-1 bg-gray-100 rounded text-xs">{TOM_LABELS[camp.tom]}</span></div>
                <div className="flex gap-3 pt-2 text-sm"><div className={`flex items-center gap-1 ${camp.copy_id ? 'text-green-600' : 'text-gray-400'}`}><FileText className="w-4 h-4" />{camp.copy_id ? 'Copy' : 'Sem'}</div><div className={`flex items-center gap-1 ${camp.criativo_id ? 'text-green-600' : 'text-gray-400'}`}><ImageIcon className="w-4 h-4" />{camp.criativo_id ? 'Criativo' : 'Sem'}</div></div>
                <div className="pt-3 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {camp.status === 'rascunho' && <button onClick={() => alterarStatus(camp.id, 'pronto')} disabled={!camp.copy_id || !camp.criativo_id} className="flex-1 btn btn-outline text-sm disabled:opacity-50"><CheckCircle className="w-4 h-4" />Pronto</button>}
                  {camp.status === 'pronto' && <button onClick={() => alterarStatus(camp.id, 'ativa')} className="flex-1 btn bg-green-600 text-white text-sm"><Play className="w-4 h-4" />Ativar</button>}
                  {camp.status === 'ativa' && <><button onClick={() => alterarStatus(camp.id, 'pausada')} className="flex-1 btn btn-outline text-sm"><Pause className="w-4 h-4" />Pausar</button><button onClick={() => alterarStatus(camp.id, 'concluida')} className="flex-1 btn btn-outline text-sm"><CheckCheck className="w-4 h-4" />Concluir</button></>}
                  {camp.status === 'pausada' && <><button onClick={() => alterarStatus(camp.id, 'ativa')} className="flex-1 btn bg-green-600 text-white text-sm"><Play className="w-4 h-4" />Retomar</button><button onClick={() => alterarStatus(camp.id, 'concluida')} className="flex-1 btn btn-outline text-sm"><CheckCheck className="w-4 h-4" />Concluir</button></>}
                  {camp.status === 'concluida' && <button onClick={() => alterarStatus(camp.id, 'rascunho')} className="flex-1 btn btn-outline text-sm"><RotateCcw className="w-4 h-4" />Reativar</button>}
                  <button onClick={() => carregarDetalhes(camp)} className="btn btn-primary text-sm"><Eye className="w-4 h-4" /></button>
                </div>
                {/* Botões Meta */}
                {(camp.status === 'pronto' || camp.status === 'ativa' || camp.status === 'pausada') && camp.copy_id && camp.criativo_id && (
                  <div className="pt-2 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => publicarNoMeta(camp)} 
                      disabled={publicando === camp.id}
                      className="flex-1 btn bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      {publicando === camp.id ? 'Publicando...' : 'Publicar no Meta'}
                    </button>
                    <button 
                      onClick={() => exportarCampanha(camp)} 
                      disabled={exportando === camp.id}
                      className="btn btn-outline text-sm"
                    >
                      <Download className="w-4 h-4" />
                      {exportando === camp.id ? 'Exportando...' : 'Exportar ZIP'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden"><table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-4">Campanha</th><th className="text-left p-4">Status</th><th className="text-left p-4">Assets</th><th className="text-right p-4">Ações</th></tr></thead><tbody className="divide-y">{campanhasFiltradas.map(camp => <tr key={camp.id} className="hover:bg-gray-50"><td className="p-4"><div className="font-medium">{camp.nome}</div><div className="text-sm text-gray-500">{camp.produto_nome} → {camp.persona_nome}</div></td><td className="p-4"><select value={camp.status} onChange={(e) => alterarStatus(camp.id, e.target.value)} className={`text-sm px-2 py-1 rounded border-0 ${getStatusConfig(camp.status).color}`}>{STATUS_OPTIONS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td><td className="p-4"><div className="flex gap-2">{camp.copy_id && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Copy</span>}{camp.criativo_id && <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">Criativo</span>}</div></td><td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => carregarDetalhes(camp)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => abrirEditar(camp)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4" /></button><button onClick={() => deletar(camp.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div>
      )}

      {modalCriarAberto && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"><div className="p-6 border-b flex items-center justify-between"><h2 className="text-xl font-semibold">{editando ? 'Editar' : 'Nova'} Campanha</h2><button onClick={fecharModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div><form onSubmit={salvar} className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">{etapa === 1 ? <div className="space-y-4"><div><label className="form-label">Nome *</label><input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="form-input" /></div><div className="grid grid-cols-2 gap-4"><div><label className="form-label">Produto *</label><select required value={formData.produto_id} onChange={(e) => setFormData({...formData, produto_id: e.target.value})} className="form-input"><option value="">Selecione</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div><div><label className="form-label">Persona *</label><select required value={formData.persona_id} onChange={(e) => setFormData({...formData, persona_id: e.target.value})} className="form-input"><option value="">Selecione</option>{personas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="form-label">Objetivo</label><select value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} className="form-input"><option value="conversao">Conversão</option><option value="awareness">Awareness</option><option value="remarketing">Remarketing</option><option value="lancamento">Lançamento</option></select></div><div><label className="form-label">Tom</label><select value={formData.tom} onChange={(e) => setFormData({...formData, tom: e.target.value})} className="form-input"><option value="urgencia">Urgência</option><option value="autoridade">Autoridade</option><option value="empatia">Empatia</option><option value="humor">Humor</option><option value="profissional">Profissional</option></select></div></div><button type="button" onClick={() => setEtapa(2)} disabled={!formData.nome || !formData.produto_id || !formData.persona_id} className="w-full btn btn-primary">Próximo <ChevronRight className="w-5 h-5" /></button></div> : <div className="space-y-4"><div><label className="form-label">Copy</label><select value={formData.copy_id} onChange={(e) => setFormData({...formData, copy_id: e.target.value})} className="form-input"><option value="">Selecionar...</option>{copys.map(c => <option key={c.id} value={c.id}>{c.produto_nome}</option>)}</select></div><div><label className="form-label">Criativo</label><select value={formData.criativo_id} onChange={(e) => setFormData({...formData, criativo_id: e.target.value})} className="form-input"><option value="">Selecionar...</option>{criativos.map(c => <option key={c.id} value={c.id}>{c.produto_nome} — {c.formato}</option>)}</select></div><div><label className="form-label">Orçamento Diário</label><input type="number" step="0.01" value={formData.orcamento_diario} onChange={(e) => setFormData({...formData, orcamento_diario: e.target.value})} className="form-input" placeholder="100.00" /></div><div><label className="form-label">Notas</label><textarea rows={3} value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} className="form-input" /></div><div className="flex gap-3"><button type="button" onClick={() => setEtapa(1)} className="btn btn-outline flex-1"><ChevronLeft className="w-5 h-5" />Voltar</button><button type="submit" className="btn btn-primary flex-1">{editando ? 'Salvar' : 'Criar'}</button></div></div>}</form></div></div>}

      {modalDetalhesAberto && campanhaSelecionada && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"><div className="p-6 border-b flex items-center justify-between bg-gray-50"><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(campanhaSelecionada.status).color}`}>{getStatusConfig(campanhaSelecionada.status).label}</span><h2 className="text-xl font-semibold">{campanhaSelecionada.nome}</h2></div><button onClick={() => setModalDetalhesAberto(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button></div><div className="flex-1 overflow-y-auto p-6"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="space-y-6"><div className="card overflow-hidden"><div className="bg-gray-100 aspect-video flex items-center justify-center">{campanhaSelecionada.criativo?.image_url ? <img src={`/dra-mkt${campanhaSelecionada.criativo.image_url}`} alt="" className="w-full h-full object-contain" /> : <div className="text-gray-400"><ImageIcon className="w-16 h-16 mx-auto" /><p>Sem criativo</p></div>}</div></div><div className="card p-4 space-y-3"><h3 className="font-semibold">Configurações</h3><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-gray-500">Produto:</span><p className="font-medium">{campanhaSelecionada.produto_nome}</p></div><div><span className="text-gray-500">Persona:</span><p className="font-medium">{campanhaSelecionada.persona_nome}</p></div><div><span className="text-gray-500">Objetivo:</span><p className="font-medium">{OBJETIVO_LABELS[campanhaSelecionada.objetivo]}</p></div><div><span className="text-gray-500">Tom:</span><p className="font-medium">{TOM_LABELS[campanhaSelecionada.tom]}</p></div></div></div></div><div className="space-y-6"><div className="card p-4"><h3 className="font-semibold mb-3">Copy</h3>{campanhaSelecionada.copy ? <div className="space-y-3">{campanhaSelecionada.copy.variantes?.map((v, i) => <div key={i} className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500 mb-1">Variante {i + 1}</div><p className="font-medium text-sm">{v.headline}</p><p className="text-sm text-gray-600 mt-1">{v.body_text}</p></div>)}</div> : <p className="text-gray-500 text-sm">Nenhuma copy</p>}</div><div className="card p-4"><h3 className="font-semibold mb-3">Status</h3><div className="flex flex-wrap gap-2">{campanhaSelecionada.status !== 'rascunho' && <button onClick={() => alterarStatus(campanhaSelecionada.id, 'rascunho')} className="btn btn-outline text-sm"><RotateCcw className="w-4 h-4" />Rascunho</button>}{campanhaSelecionada.status !== 'pronto' && <button onClick={() => alterarStatus(campanhaSelecionada.id, 'pronto')} className="btn btn-outline text-sm"><CheckCircle className="w-4 h-4" />Pronto</button>}{campanhaSelecionada.status !== 'ativa' && <button onClick={() => alterarStatus(campanhaSelecionada.id, 'ativa')} className="btn bg-green-600 text-white text-sm"><Play className="w-4 h-4" />Ativar</button>}{campanhaSelecionada.status !== 'pausada' && <button onClick={() => alterarStatus(campanhaSelecionada.id, 'pausada')} className="btn btn-outline text-sm"><Pause className="w-4 h-4" />Pausar</button>}{campanhaSelecionada.status !== 'concluida' && <button onClick={() => alterarStatus(campanhaSelecionada.id, 'concluida')} className="btn btn-outline text-sm"><CheckCheck className="w-4 h-4" />Concluir</button>}</div></div></div></div></div><div className="p-4 border-t flex justify-end gap-2 bg-gray-50"><button onClick={() => { setModalDetalhesAberto(false); abrirEditar(campanhaSelecionada); }} className="btn btn-outline"><Edit3 className="w-4 h-4" />Editar</button><button onClick={() => deletar(campanhaSelecionada.id)} className="btn border-red-300 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" />Excluir</button></div></div></div>}
    </div>
  )
}
