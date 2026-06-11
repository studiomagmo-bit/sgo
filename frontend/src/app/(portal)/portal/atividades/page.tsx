'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import { supabasePortal } from '@/lib/supabase'
import {
  GitBranch, Building2, LogOut, HardHat, X, Check,
  Play, Pause, Flag, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, Loader2, Camera, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { toast } from 'sonner'

// ── Configs de status ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  planejada:            { label: 'Planejada',           cls: 'bg-gray-100 text-gray-600 border-gray-200',           icon: Clock },
  em_andamento:         { label: 'Em andamento',        cls: 'bg-blue-100 text-blue-700 border-blue-200',           icon: Play },
  impedida:             { label: 'Impedida',             cls: 'bg-red-100 text-red-700 border-red-200',              icon: AlertTriangle },
  pendente_validacao:   { label: 'Aguardando validação', cls: 'bg-amber-100 text-amber-700 border-amber-200',        icon: Flag },
  concluida:            { label: 'Concluída ✓',         cls: 'bg-teal-100 text-teal-700 border-teal-200',           icon: CheckCircle2 },
  reprovada:            { label: 'Reprovada — corrigir', cls: 'bg-red-100 text-red-800 border-red-300',              icon: X },
  bloqueada:            { label: 'Bloqueada',            cls: 'bg-orange-100 text-orange-700 border-orange-200',     icon: Pause },
  cancelada:            { label: 'Cancelada',            cls: 'bg-gray-50 text-gray-400 border-gray-200',            icon: X },
}

const CATEGORIAS_IMPEDIMENTO = [
  { v: 'material',    l: 'Falta de material' },
  { v: 'mao_de_obra', l: 'Falta de mão de obra' },
  { v: 'equipamento', l: 'Equipamento indisponível' },
  { v: 'projeto',     l: 'Problema de projeto' },
  { v: 'clima',       l: 'Condições climáticas' },
  { v: 'outro',       l: 'Outro' },
]

function ModalAcao({
  atividade, onClose, onSave,
}: {
  atividade: any
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [acao, setAcao] = useState<'iniciar' | 'impedir' | 'concluir' | null>(null)
  const [categoria, setCategoria] = useState('material')
  const [descricao, setDescricao] = useState('')
  const [notas, setNotas] = useState(atividade.notas_execucao || '')
  const [percentual, setPercentual] = useState(atividade.percentual_exec || 0)
  const [saving, setSaving] = useState(false)

  const s = atividade.status

  // Quais ações estão disponíveis para o empreiteiro neste status
  const podeIniciar    = ['planejada', 'bloqueada'].includes(s)
  const podeImpedir    = ['em_andamento'].includes(s)
  const podeConcluir   = ['em_andamento'].includes(s)
  const podeAtualizar  = ['em_andamento', 'planejada'].includes(s)

  async function executar() {
    if (!acao) return
    setSaving(true)
    try {
      let updates: any = { notas_execucao: notas, percentual_exec: Number(percentual) }
      if (acao === 'iniciar') {
        updates.status = 'em_andamento'
        updates.data_inicio_real = new Date().toISOString().split('T')[0]
      } else if (acao === 'impedir') {
        if (!descricao.trim()) { toast.error('Descreva o impedimento'); setSaving(false); return }
        updates.status = 'impedida'
        updates.motivo_impedimento = descricao
        updates.categoria_impedimento = categoria
      } else if (acao === 'concluir') {
        updates.status = 'pendente_validacao'
        updates.data_conclusao_emp = new Date().toISOString().split('T')[0]
        updates.percentual_exec = 100
      }
      await onSave(updates)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function salvarNotas() {
    setSaving(true)
    try {
      await onSave({ notas_execucao: notas, percentual_exec: Number(percentual) })
      toast.success('Notas salvas!')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-base line-clamp-1">{atividade.nome}</h2>
            <div className="flex items-center gap-2 mt-1">
              {(() => { const cfg = STATUS_CONFIG[atividade.status]; const Icon = cfg?.icon ?? Clock; return (
                <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', cfg?.cls)}>
                  <Icon className="h-3 w-3" />{cfg?.label ?? atividade.status}
                </span>
              )})()}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info da atividade */}
          {(atividade.data_inicio_prev || atividade.data_fim_prev) && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500 flex gap-4">
              {atividade.data_inicio_prev && <span>Início: <strong className="text-gray-700">{new Date(atividade.data_inicio_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>}
              {atividade.data_fim_prev    && <span>Prazo: <strong className="text-gray-700">{new Date(atividade.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>}
              {atividade.quantidade_prev  && <span>Qtd: <strong className="text-gray-700">{atividade.quantidade_prev} {atividade.unidade}</strong></span>}
            </div>
          )}

          {/* Se reprovada — mostra o motivo */}
          {s === 'reprovada' && atividade.obs_reprovacao && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1">⚠️ O que precisa ser corrigido:</p>
              <p className="text-sm text-red-800">{atividade.obs_reprovacao}</p>
            </div>
          )}

          {/* Notas e % */}
          {(podeAtualizar || s === 'em_andamento') && !acao && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% Executado</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} value={percentual} onChange={e => setPercentual(Number(e.target.value))}
                    className="flex-1 accent-blue-600" />
                  <span className="text-sm font-bold text-gray-900 w-10 text-right">{percentual}%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de execução</label>
                <textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Condições, observações, materiais usados..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}

          {/* Ação: Impedir */}
          {acao === 'impedir' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-700">Registrar impedimento</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIAS_IMPEDIMENTO.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex.: Falta de cimento — pedido feito em 10/06, previsão 12/06"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
            </div>
          )}

          {/* Ação: Concluir */}
          {acao === 'concluir' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">Marcar como concluído</p>
              <p className="text-xs text-amber-700 mt-1">A atividade ficará como <strong>"Aguardando validação"</strong> até o engenheiro ou mestre aprovar.</p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="space-y-2 pt-2 border-t">
            {!acao ? (
              <>
                {podeIniciar && (
                  <button onClick={() => setAcao('iniciar')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    <Play className="h-4 w-4" /> Iniciar atividade
                  </button>
                )}
                {podeImpedir && (
                  <button onClick={() => setAcao('impedir')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors">
                    <AlertTriangle className="h-4 w-4" /> Registrar impedimento
                  </button>
                )}
                {podeConcluir && (
                  <button onClick={() => setAcao('concluir')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors">
                    <Flag className="h-4 w-4" /> Marcar como concluído
                  </button>
                )}
                {(podeAtualizar || s === 'em_andamento') && (
                  <button onClick={salvarNotas} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar progresso
                  </button>
                )}
                {/* Re-iniciar após reprovada */}
                {s === 'reprovada' && (
                  <button onClick={() => setAcao('iniciar')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    <Play className="h-4 w-4" /> Reiniciar (correção)
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setAcao(null)} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-200">Voltar</button>
                <button onClick={executar} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {acao === 'iniciar' ? 'Confirmar início' : acao === 'impedir' ? 'Registrar' : 'Confirmar conclusão'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AtividadesContent() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()
  const params = useSearchParams()
  const obraParam = params.get('obra') ?? ''

  const [obras, setObras]           = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [obraFiltro, setObraFiltro] = useState(obraParam)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [loading, setLoading]       = useState(false)
  const [selecionada, setSelecionada] = useState<any>(null)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    portalApi.minhasObras(portalUser.empreiteiro_id).then(obs => {
      setObras(obs)
      if (!obraFiltro && obs.length === 1) setObraFiltro(obs[0].id)
    })
  }, [portalUser]) // eslint-disable-line react-hooks/exhaustive-deps

  const carregar = useCallback(() => {
    if (!portalUser) return
    setLoading(true)
    portalApi.minhasAtividades(portalUser.empreiteiro_id, obraFiltro || undefined)
      .then(setAtividades).finally(() => setLoading(false))
  }, [portalUser, obraFiltro])

  useEffect(() => { carregar() }, [carregar])

  async function salvarAtividade(id: string, updates: any) {
    await portalApi.atualizarAtividade(id, updates)
    // Registra evento
    if (updates.status && portalUser) {
      const tipo = updates.status === 'em_andamento' ? 'iniciada'
        : updates.status === 'impedida' ? 'impedida'
        : updates.status === 'pendente_validacao' ? 'concluida_emp'
        : 'atualizada'
      await supabasePortal.from('atividade_eventos').insert({
        atividade_id:   id,
        construtora_id: portalUser.construtora_id,
        tipo,
        descricao:      updates.motivo_impedimento || updates.notas_execucao || null,
        criado_por_emp: portalUser.id,
      }).then(() => {})
    }
    carregar()
  }

  const hoje = new Date().toISOString().split('T')[0]

  const atividadesFiltradas = atividades.filter(a => {
    if (filtroStatus === 'todos') return true
    if (filtroStatus === 'atencao') return ['impedida', 'reprovada', 'pendente_validacao'].includes(a.status)
    return a.status === filtroStatus
  })

  const contadores = {
    todos:    atividades.length,
    atencao:  atividades.filter(a => ['impedida', 'reprovada', 'pendente_validacao'].includes(a.status)).length,
    em_andamento: atividades.filter(a => a.status === 'em_andamento').length,
    concluida:    atividades.filter(a => a.status === 'concluida').length,
    planejada:    atividades.filter(a => a.status === 'planejada').length,
  }

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portal/home" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <HardHat className="h-4 w-4 text-white" />
          </Link>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Minhas Atividades</p>
            <p className="text-xs text-gray-400">{portalUser.empreiteiros?.razao_social}</p>
          </div>
        </div>
        <button onClick={() => { logoutPortal(); router.replace('/portal/login') }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </header>

      <div className="pt-16 pb-6 px-4 max-w-2xl mx-auto space-y-4">
        {/* Seletor de obra */}
        <div className="pt-4">
          <select value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'em_andamento', label: 'Em andamento', color: 'text-blue-600', bg: 'bg-blue-50' },
            { key: 'atencao',      label: 'Atenção',       color: 'text-red-600',  bg: 'bg-red-50' },
            { key: 'concluida',    label: 'Concluídas',    color: 'text-teal-600', bg: 'bg-teal-50' },
            { key: 'planejada',    label: 'A iniciar',     color: 'text-gray-600', bg: 'bg-gray-50' },
          ].map(k => (
            <button key={k.key} onClick={() => setFiltroStatus(k.key === filtroStatus ? 'todos' : k.key)}
              className={clsx('rounded-xl border p-2 text-center transition-all', filtroStatus === k.key ? 'ring-2 ring-blue-500' : 'border-gray-100',k.bg)}>
              <p className={`text-xl font-bold ${k.color}`}>{contadores[k.key as keyof typeof contadores]}</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{k.label}</p>
            </button>
          ))}
        </div>

        {/* Lista de atividades */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : atividadesFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-400">
            <GitBranch className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {atividadesFiltradas.map(a => {
              const cfg   = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.planejada
              const Icon  = cfg.icon
              const atrasada = a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < hoje
              const diasFim  = a.data_fim_prev
                ? Math.round((new Date(a.data_fim_prev + 'T12:00:00').getTime() - Date.now()) / 86400000)
                : null

              return (
                <button key={a.id} onClick={() => setSelecionada(a)}
                  className={clsx(
                    'w-full rounded-2xl border bg-white p-4 text-left shadow-sm hover:shadow-md transition-all',
                    a.status === 'reprovada' ? 'border-red-300 bg-red-50' :
                    a.status === 'pendente_validacao' ? 'border-amber-200 bg-amber-50/50' :
                    a.status === 'impedida' ? 'border-red-200 bg-red-50/40' :
                    atrasada ? 'border-orange-200' : 'border-gray-100'
                  )}
                >
                  {/* Linha 1: nome + badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{a.nome}</p>
                      {a.obras?.nome && <p className="text-xs text-gray-400 mt-0.5">{a.obras.nome}</p>}
                    </div>
                    <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', cfg.cls)}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={clsx('h-2 rounded-full transition-all',
                          a.status === 'concluida' ? 'bg-teal-500' :
                          a.percentual_exec >= 70 ? 'bg-blue-500' : 'bg-blue-400'
                        )}
                        style={{ width: `${a.percentual_exec || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right">{a.percentual_exec || 0}%</span>
                  </div>

                  {/* Linha 3: prazo + impedimento */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {a.data_fim_prev && (
                      <span className={clsx('flex items-center gap-1', atrasada ? 'text-red-500 font-medium' : diasFim !== null && diasFim < 3 ? 'text-amber-500' : '')}>
                        <Clock className="h-3 w-3" />
                        {atrasada ? `${Math.abs(diasFim!)}d atrasado` :
                          diasFim === 0 ? 'Prazo: hoje' :
                          diasFim !== null ? `${diasFim}d restantes` :
                          new Date(a.data_fim_prev + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {a.motivo_impedimento && (
                      <span className="text-red-500 truncate flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {a.motivo_impedimento}
                      </span>
                    )}
                    {a.obs_reprovacao && (
                      <span className="text-red-600 truncate flex items-center gap-1 font-medium">
                        <MessageSquare className="h-3 w-3 shrink-0" />
                        {a.obs_reprovacao}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de ação */}
      {selecionada && (
        <ModalAcao
          atividade={selecionada}
          onClose={() => setSelecionada(null)}
          onSave={async (updates) => {
            await salvarAtividade(selecionada.id, updates)
            setSelecionada(null)
          }}
        />
      )}
    </div>
  )
}

export default function AtividadesPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
    <AtividadesContent />
  </Suspense>
}
