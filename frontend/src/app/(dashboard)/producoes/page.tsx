'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  producoes as producoesApi,
  obras     as obrasApi,
  atividades as pcpAtividades,
} from '@/lib/sgoApi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import type { Obra, TipoProducao } from '@/types'
import {
  Plus, Loader2, ClipboardList, X, Check, CheckCircle2,
  AlertTriangle, Flag, Clock, DollarSign, Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const hoje = () => new Date().toISOString().split('T')[0]

const STATUS_ATIVIDADE: Record<string, { label: string; cls: string; icon: any }> = {
  planejada:           { label: 'Planejada',           cls: 'badge-cinza',    icon: Clock },
  em_andamento:        { label: 'Em andamento',        cls: 'badge-azul',     icon: Play },
  impedida:            { label: 'Impedida',             cls: 'badge-vermelho', icon: AlertTriangle },
  pendente_validacao:  { label: 'Aguarda validação',   cls: 'badge-amarelo',  icon: Flag },
  concluida:           { label: 'Concluída',            cls: 'badge-verde',    icon: CheckCircle2 },
  reprovada:           { label: 'Reprovada',            cls: 'badge-vermelho', icon: X },
  bloqueada:           { label: 'Bloqueada',            cls: 'badge-vermelho', icon: AlertTriangle },
}

// ── Tabs ──────────────────────────────────────────────────────
type Tab = 'validacao' | 'apontamentos' | 'novo'

export default function ProducoesPage() {
  const { user } = useAuth()
  const isRestrito = ['engenheiro','mestre','pcp','almoxarife'].includes((user as any)?.perfil ?? '')
  const [tab, setTab]             = useState<Tab>('validacao')
  const [obras, setObras]         = useState<Obra[]>([])
  const [obraId, setObraId]       = useState('')

  // Tab Validação — atividades pendentes de validação pelo engenheiro
  const [pendentes, setPendentes] = useState<any[]>([])
  const [loadingPend, setLoadingPend] = useState(false)
  const [validando, setValidando] = useState<any>(null)
  const [obsReprovacao, setObsReprovacao] = useState('')
  const [percentualMed, setPercentualMed] = useState(100)
  const [liberarMed, setLiberarMed] = useState(false)

  // Tab Apontamentos — produções registradas
  const [producoes, setProducoes] = useState<any[]>([])
  const [loadingProd, setLoadingProd] = useState(false)

  // Tab Novo apontamento
  const [form, setForm]           = useState({ obra_id: '', atividade_id: '', data: hoje(), tipo: 'producao' as TipoProducao, quantidade: 0, observacoes: '' })
  const [atividadesMod, setAtividadesMod] = useState<any[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      // Engenheiro: auto-seleciona sua obra única
      try {
        const u = JSON.parse(localStorage.getItem('sgo_user') ?? '{}')
        const perfisRestritos = ['engenheiro','mestre','pcp','almoxarife']
        if (perfisRestritos.includes(u?.perfil) && obs.length === 1) {
          setObraId(obs[0].id)
        }
      } catch {}
    })
  }, [])

  const carregarPendentes = useCallback(() => {
    if (!obraId) return
    setLoadingPend(true)
    supabase
      .from('atividades')
      .select('*, empreiteiros(razao_social), estrutura_obra(nome)')
      .eq('obra_id', obraId)
      .in('status', ['pendente_validacao', 'em_andamento', 'impedida', 'reprovada'])
      .order('atualizado_em', { ascending: false })
      .then(({ data }) => setPendentes(data ?? []))
      .finally(() => setLoadingPend(false))
  }, [obraId])

  const carregarProducoes = useCallback(() => {
    if (!obraId) return
    setLoadingProd(true)
    producoesApi.listar({ obra_id: obraId })
      .then(setProducoes)
      .finally(() => setLoadingProd(false))
  }, [obraId])

  useEffect(() => {
    if (!obraId) return
    carregarPendentes()
    carregarProducoes()
  }, [obraId, carregarPendentes, carregarProducoes])

  // Validação: aprovar atividade como concluída
  async function aprovar(atividade: any) {
    try {
      const updates: any = { status: 'concluida', validado_por: user?.id, validado_em: new Date().toISOString() }
      await supabase.from('atividades').update(updates).eq('id', atividade.id)

      // Registra evento
      await supabase.from('atividade_eventos').insert({
        atividade_id: atividade.id, construtora_id: user?.construtora_id,
        tipo: 'aprovada', descricao: 'Conclusão aprovada pelo engenheiro/mestre', criado_por: user?.id,
      })

      // Se liberado para medição, cria produção automaticamente
      if (liberarMed) {
        const qtd = atividade.quantidade_prev ? Number(atividade.quantidade_prev) * (percentualMed / 100) : 1
        await supabase.from('producoes').insert({
          obra_id: atividade.obra_id, construtora_id: user?.construtora_id,
          atividade_id: atividade.id, data: hoje(),
          tipo: 'producao', quantidade: qtd,
          liberado_medicao: true, percentual_medicao: percentualMed,
          liberado_por: user?.id, liberado_em: new Date().toISOString(),
          observacoes: `Aprovado por ${user?.nome} — ${percentualMed}%`,
        })
      }

      toast.success('Atividade aprovada' + (liberarMed ? ' e liberada para medição' : '') + '!')
      setValidando(null)
      carregarPendentes()
      if (liberarMed) carregarProducoes()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Validação: reprovar
  async function reprovar(atividade: any) {
    if (!obsReprovacao.trim()) { toast.error('Descreva o que precisa ser corrigido'); return }
    try {
      await supabase.from('atividades').update({
        status: 'reprovada', obs_reprovacao: obsReprovacao,
      }).eq('id', atividade.id)
      await supabase.from('atividade_eventos').insert({
        atividade_id: atividade.id, construtora_id: user?.construtora_id,
        tipo: 'reprovada', descricao: obsReprovacao, criado_por: user?.id,
      })
      toast.success('Reprovação registrada. Empreiteiro foi notificado.')
      setValidando(null)
      setObsReprovacao('')
      carregarPendentes()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Novo apontamento manual
  async function salvarApontamento(e: React.FormEvent) {
    e.preventDefault()
    if (!form.obra_id || !form.atividade_id) { toast.error('Selecione obra e atividade'); return }
    if (!form.quantidade || form.quantidade <= 0) { toast.error('Quantidade inválida'); return }
    setSaving(true)
    try {
      await producoesApi.criar({ ...form, quantidade: Number(form.quantidade), observacoes: form.observacoes || null })
      toast.success('Apontamento registrado!')
      setForm(f => ({ ...f, atividade_id: '', quantidade: 0, observacoes: '' }))
      setTab('apontamentos')
      carregarProducoes()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const pendValidacao = pendentes.filter(a => a.status === 'pendente_validacao')
  const emAndamento   = pendentes.filter(a => a.status === 'em_andamento')
  const impedidas     = pendentes.filter(a => a.status === 'impedida')
  const reprovadas    = pendentes.filter(a => a.status === 'reprovada')

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produções</h1>
          <p className="text-sm text-gray-500 mt-1">Validações pendentes + apontamentos de produção</p>
        </div>
        {!isRestrito && (
        <select
          value={obraId}
          onChange={e => setObraId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">Selecione uma obra...</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([
          { id: 'validacao',    label: 'Validações', count: pendValidacao.length, alert: pendValidacao.length > 0 },
          { id: 'apontamentos', label: 'Apontamentos', count: producoes.length },
          { id: 'novo',         label: '+ Novo apontamento' },
        ] as { id: Tab; label: string; count?: number; alert?: boolean }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={clsx('rounded-full px-1.5 py-0.5 text-xs font-bold',
                t.alert ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {!obraId && tab !== 'novo' ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>Selecione uma obra para ver as produções</p>
        </div>
      ) : (

        /* ── TAB: VALIDAÇÕES ──────────────────────────────────── */
        tab === 'validacao' ? (
          <div className="space-y-4">
            {/* Aguardando validação */}
            {pendValidacao.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Aguardando sua validação ({pendValidacao.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendValidacao.map(a => (
                    <div key={a.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {a.empreiteiros?.razao_social ?? '—'}
                            {a.estrutura_obra?.nome && ` · ${a.estrutura_obra.nome}`}
                          </p>
                          {a.notas_execucao && (
                            <p className="text-xs text-gray-500 mt-1 italic">"{a.notas_execucao}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {a.quantidade_prev ? `${a.quantidade_prev} ${a.unidade ?? ''} previstos` : ''}
                          </p>
                        </div>
                        <button onClick={() => { setValidando(a); setObsReprovacao(''); setPercentualMed(100); setLiberarMed(false) }}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                          <Check className="h-3.5 w-3.5" /> Validar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impedidas */}
            {impedidas.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Impedimentos ativos ({impedidas.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {impedidas.map(a => (
                    <div key={a.id} className="p-4">
                      <p className="font-semibold text-gray-900 text-sm">{a.nome}</p>
                      <p className="text-xs text-gray-400">{a.empreiteiros?.razao_social}</p>
                      {a.motivo_impedimento && (
                        <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                          <strong>{a.categoria_impedimento ?? 'Impedimento'}:</strong> {a.motivo_impedimento}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Em andamento */}
            {emAndamento.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <Play className="h-4 w-4" /> Em andamento ({emAndamento.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {emAndamento.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{a.nome}</p>
                        <p className="text-xs text-gray-400">{a.empreiteiros?.razao_social}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${a.percentual_exec || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-8">{a.percentual_exec || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendentes.length === 0 && !loadingPend && (
              <div className="rounded-xl border bg-white p-10 text-center text-gray-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Tudo em dia! Nenhuma atividade pendente.</p>
              </div>
            )}
          </div>
        )

        /* ── TAB: APONTAMENTOS ─────────────────────────────────── */
        : tab === 'apontamentos' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingProd ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                  <tr>
                    {['Data','Atividade','Tipo','Quantidade','Medição','Obs.'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {producoes.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nenhum apontamento registrado</td></tr>
                  ) : producoes.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.atividades?.nome ?? '—'}</td>
                      <td className="px-4 py-3"><span className="badge-azul capitalize">{p.tipo}</span></td>
                      <td className="px-4 py-3 font-semibold">{Number(p.quantidade).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        {p.liberado_medicao
                          ? <span className="badge-verde flex items-center gap-1"><DollarSign className="h-3 w-3" />Liberado {p.percentual_medicao}%</span>
                          : <span className="badge-cinza">Pendente</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{p.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )

        /* ── TAB: NOVO APONTAMENTO ──────────────────────────────── */
        : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Novo Apontamento Manual</h3>
            <form onSubmit={salvarApontamento} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
                <select required value={form.obra_id} onChange={async e => {
                  setForm(f => ({ ...f, obra_id: e.target.value, atividade_id: '' }))
                  setAtividadesMod([])
                  if (e.target.value) {
                    setLoadingAtiv(true)
                    pcpAtividades.listar({ obra_id: e.target.value }).then(setAtividadesMod).finally(() => setLoadingAtiv(false))
                  }
                }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atividade *</label>
                <select required value={form.atividade_id} onChange={e => setForm(f => ({ ...f, atividade_id: e.target.value }))}
                  disabled={!form.obra_id || loadingAtiv}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                  <option value="">{loadingAtiv ? 'Carregando...' : !form.obra_id ? 'Selecione uma obra primeiro' : 'Selecione...'}</option>
                  {atividadesMod.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoProducao }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="producao">Produção</option>
                    <option value="hora">Hora</option>
                    <option value="diaria">Diária</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                <input type="number" required min={0.01} step="any" value={form.quantidade || ''}
                  onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Registrar apontamento
              </button>
            </form>
          </div>
        )
      )}

      {/* ── Modal de Validação ─────────────────────────────────── */}
      {validando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">Validar conclusão</h2>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{validando.nome}</p>
              </div>
              <button onClick={() => setValidando(null)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {validando.notas_execucao && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 italic">
                  "{validando.notas_execucao}"
                </div>
              )}

              {/* Liberar para medição */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={liberarMed} onChange={e => setLiberarMed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" /> Liberar para medição
                    </p>
                    <p className="text-xs text-blue-600">Gera um registro de produção para pagamento</p>
                  </div>
                </label>
                {liberarMed && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">% do serviço medido agora</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={1} max={100} value={percentualMed}
                        onChange={e => setPercentualMed(Number(e.target.value))}
                        className="flex-1 accent-blue-600" />
                      <span className="text-sm font-bold text-blue-800 w-10 text-right">{percentualMed}%</span>
                    </div>
                    <p className="text-xs text-blue-500 mt-1">
                      {validando.quantidade_prev
                        ? `= ${(Number(validando.quantidade_prev) * percentualMed / 100).toLocaleString('pt-BR')} ${validando.unidade ?? ''}`
                        : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Campo de reprovação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ou reprove indicando o problema:</label>
                <textarea rows={3} value={obsReprovacao} onChange={e => setObsReprovacao(e.target.value)}
                  placeholder="Ex.: Argamassa com traço incorreto, refazer o rejunte do trecho A..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => reprovar(validando)} disabled={!obsReprovacao.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors">
                  <X className="h-4 w-4" /> Reprovar
                </button>
                <button onClick={() => aprovar(validando)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors">
                  <CheckCircle2 className="h-4 w-4" /> Aprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
