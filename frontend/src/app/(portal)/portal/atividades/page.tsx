'use client'
import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import { supabasePortal } from '@/lib/supabase'
import {
  Building2, GitBranch, Users, Calendar, LogOut,
  Play, Pause, Flag, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, ChevronRight, Loader2, X, Check,
  BarChart3, ArrowRight, MessageSquare, Info,
  RefreshCw, Filter,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { toast } from 'sonner'

// ── Status config ──────────────────────────────────────────────
const S: Record<string, { label:string; bg:string; border:string; text:string; dot:string; icon:any }> = {
  planejada:           { label:'Planejada',          bg:'bg-gray-50',    border:'border-gray-200',  text:'text-gray-600',   dot:'bg-gray-400',   icon:Clock       },
  em_andamento:        { label:'Em andamento',       bg:'bg-blue-50',    border:'border-blue-200',  text:'text-blue-700',   dot:'bg-blue-500',   icon:Play        },
  impedida:            { label:'Impedida',            bg:'bg-red-50',     border:'border-red-300',   text:'text-red-700',    dot:'bg-red-500',    icon:Pause       },
  pendente_validacao:  { label:'Aguardando engenheiro', bg:'bg-amber-50',  border:'border-amber-300', text:'text-amber-700',  dot:'bg-amber-400',  icon:Flag        },
  concluida:           { label:'Concluída ✓',        bg:'bg-teal-50',    border:'border-teal-200',  text:'text-teal-700',   dot:'bg-teal-500',   icon:CheckCircle2},
  reprovada:           { label:'Corrigir!',           bg:'bg-red-50',     border:'border-red-400',   text:'text-red-800',    dot:'bg-red-600',    icon:X           },
  bloqueada:           { label:'Bloqueada',           bg:'bg-orange-50',  border:'border-orange-200',text:'text-orange-700', dot:'bg-orange-400', icon:Pause       },
  cancelada:           { label:'Cancelada',           bg:'bg-gray-50',    border:'border-gray-200',  text:'text-gray-400',   dot:'bg-gray-300',   icon:X           },
}

const CATS = [
  { v:'material',    l:'Falta de material'     },
  { v:'mao_de_obra', l:'Falta de mão de obra'  },
  { v:'equipamento', l:'Equipamento indisponível'},
  { v:'projeto',     l:'Problema de projeto'   },
  { v:'clima',       l:'Clima desfavorável'    },
  { v:'outro',       l:'Outro motivo'          },
]

type Acao = 'iniciar'|'impedir'|'concluir'|null

// ── Modal de ação ──────────────────────────────────────────────
function ModalAcao({ atv, onClose, onSave }: { atv:any; onClose:()=>void; onSave:(d:any)=>Promise<void> }) {
  const [acao, setAcao]     = useState<Acao>(null)
  const [cat, setCat]       = useState('material')
  const [desc, setDesc]     = useState('')
  const [notas, setNotas]   = useState(atv.notas_execucao||'')
  const [perc, setPerc]     = useState<number>(atv.percentual_exec||0)
  const [saving, setSaving] = useState(false)
  const [eventos, setEvts]  = useState<any[]>([])

  const s      = atv.status
  const scfg   = S[s] ?? S.planejada
  const Icon   = scfg.icon
  const hoje   = new Date().toISOString().split('T')[0]

  const podeIniciar  = ['planejada','bloqueada','reprovada'].includes(s)
  const podeImpedir  = s === 'em_andamento'
  const podeConcluir = s === 'em_andamento'

  useEffect(() => {
    portalApi.eventosAtividade(atv.id).then(setEvts)
  }, [atv.id])

  async function executar() {
    if (!acao) return
    setSaving(true)
    try {
      const agora = new Date().toISOString()
      let updates: any = { notas_execucao: notas, percentual_exec: perc }
      let tipoEvt = ''

      if (acao === 'iniciar') {
        updates.status = 'em_andamento'
        updates.data_inicio_real = hoje
        updates.obs_reprovacao = null
        tipoEvt = 'iniciada'
      } else if (acao === 'impedir') {
        if (!desc.trim()) { toast.error('Descreva o impedimento'); setSaving(false); return }
        updates.status = 'impedida'
        updates.motivo_impedimento = desc
        updates.categoria_impedimento = cat
        tipoEvt = 'impedida'
      } else if (acao === 'concluir') {
        updates.status = 'pendente_validacao'
        updates.data_conclusao_emp = hoje
        updates.percentual_exec = 100
        tipoEvt = 'concluida_emp'
      }

      await onSave(updates)
      if (tipoEvt) {
        await portalApi.registrarEvento(atv.id, atv.obras?.construtora_id || '', tipoEvt, desc||notas||undefined)
          .catch(() => {})
      }
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  async function salvarProgresso() {
    setSaving(true)
    try {
      await onSave({ notas_execucao: notas, percentual_exec: perc })
      toast.success('Progresso salvo!')
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={clsx('flex items-start justify-between p-5 rounded-t-3xl sm:rounded-t-2xl', scfg.bg)}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', scfg.bg, scfg.border, scfg.text)}>
                <Icon className="h-3.5 w-3.5" />{scfg.label}
              </span>
            </div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">{atv.nome}</h2>
            {atv.obras?.nome && <p className="text-xs text-gray-500 mt-0.5">{atv.obras.nome}{atv.estrutura_obra?.nome ? ` · ${atv.estrutura_obra.nome}` : ''}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded-lg hover:bg-black/10"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info */}
          {(atv.data_inicio_prev || atv.data_fim_prev || atv.quantidade_prev) && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 grid grid-cols-3 gap-2 text-xs">
              {atv.data_inicio_prev && <div><p className="text-gray-400">Início prev.</p><p className="font-semibold text-gray-700">{new Date(atv.data_inicio_prev+'T12:00:00').toLocaleDateString('pt-BR')}</p></div>}
              {atv.data_fim_prev    && <div><p className="text-gray-400">Prazo</p><p className="font-semibold text-gray-700">{new Date(atv.data_fim_prev+'T12:00:00').toLocaleDateString('pt-BR')}</p></div>}
              {atv.quantidade_prev  && <div><p className="text-gray-400">Quantidade</p><p className="font-semibold text-gray-700">{atv.quantidade_prev} {atv.unidade||''}</p></div>}
            </div>
          )}

          {/* Reprovação */}
          {s === 'reprovada' && atv.obs_reprovacao && (
            <div className="rounded-xl bg-red-50 border-2 border-red-300 px-4 py-3">
              <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> O engenheiro reprovou. O que corrigir:</p>
              <p className="text-sm text-red-800">{atv.obs_reprovacao}</p>
            </div>
          )}

          {/* Impedimento ativo */}
          {s === 'impedida' && atv.motivo_impedimento && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
              <p className="text-xs font-bold text-orange-700 mb-1">Impedimento registrado:</p>
              <p className="text-sm text-orange-800">{atv.motivo_impedimento}</p>
            </div>
          )}

          {/* Progresso + notas (sempre visível se em andamento) */}
          {(s === 'em_andamento' || s === 'reprovada') && !acao && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">% Executado</label>
                  <span className="text-lg font-bold text-blue-600">{perc}%</span>
                </div>
                <div className="relative">
                  <input type="range" min={0} max={100} value={perc} onChange={e => setPerc(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2" />
                  <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                {/* Barra visual */}
                <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-3 bg-blue-500 rounded-full transition-all" style={{ width:`${perc}%` }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas de execução</label>
                <textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Condições, materiais usados, observações..."
                  className="input resize-none" />
              </div>
            </div>
          )}

          {/* Ação: Impedir */}
          {acao === 'impedir' && (
            <div className="space-y-3 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-bold text-red-700">Registrar impedimento</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATS.map(c => (
                    <button key={c.v} type="button" onClick={() => setCat(c.v)}
                      className={clsx('rounded-lg border px-3 py-2 text-xs text-left transition-all',
                        cat===c.v ? 'border-red-400 bg-red-100 text-red-700 font-semibold' : 'border-gray-200 bg-white text-gray-600')}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição *</label>
                <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex.: Cimento não chegou — pedido 10/06, previsão 12/06"
                  className="input resize-none focus:ring-red-400" />
              </div>
            </div>
          )}

          {/* Ação: Concluir */}
          {acao === 'concluir' && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-3">
              <p className="text-sm font-bold text-amber-800">Marcar como concluído</p>
              <p className="text-sm text-amber-700 mt-1">A atividade ficará como <strong>Aguardando validação</strong> até o engenheiro aprovar a conclusão.</p>
              {atv.quantidade_prev && (
                <p className="text-xs text-amber-600 mt-1.5">Quantidade executada: {atv.quantidade_prev} {atv.unidade||''}</p>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="space-y-2 pt-2 border-t">
            {!acao ? (
              <>
                {(s === 'em_andamento' || s === 'reprovada') && (
                  <button onClick={salvarProgresso} disabled={saving}
                    className="w-full btn-secondary justify-center py-3">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salvar progresso ({perc}%)
                  </button>
                )}
                {podeIniciar && (
                  <button onClick={() => setAcao('iniciar')}
                    className="w-full btn-primary justify-center py-3 bg-blue-600">
                    <Play className="h-4 w-4" />
                    {s === 'reprovada' ? 'Corrigir e reiniciar' : 'Iniciar atividade'}
                  </button>
                )}
                {podeImpedir && (
                  <button onClick={() => setAcao('impedir')}
                    className="w-full btn-secondary justify-center py-3 text-red-600 border-red-200 hover:bg-red-50">
                    <AlertTriangle className="h-4 w-4" /> Registrar impedimento
                  </button>
                )}
                {podeConcluir && (
                  <button onClick={() => setAcao('concluir')}
                    className="w-full justify-center py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm flex items-center gap-2 hover:bg-teal-700">
                    <Flag className="h-4 w-4" /> Marcar como concluído
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setAcao(null)} className="flex-1 btn-secondary justify-center py-3">← Voltar</button>
                <button onClick={executar} disabled={saving}
                  className={clsx('flex-1 justify-center py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-60',
                    acao==='impedir' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    acao==='concluir' ? 'bg-teal-600 hover:bg-teal-700 text-white' :
                    'bg-blue-600 hover:bg-blue-700 text-white')}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {acao==='iniciar' ? 'Confirmar início' : acao==='impedir' ? 'Registrar' : 'Confirmar conclusão'}
                </button>
              </div>
            )}
          </div>

          {/* Histórico de eventos */}
          {eventos.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico</p>
              <div className="space-y-2">
                {eventos.slice(0,5).map(ev => (
                  <div key={ev.id} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-700 capitalize">{ev.tipo.replace('_',' ')}</span>
                      {ev.descricao && <span className="text-gray-500"> — {ev.descricao}</span>}
                      <p className="text-gray-400">{new Date(ev.criado_em).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Agrupamento por estrutura ──────────────────────────────────
function GrupoEstrutura({ nome, tipo, atividades, onSelect }: any) {
  const [open, setOpen] = useState(true)
  const conc  = atividades.filter((a: any) => a.status === 'concluida').length
  const atras = atividades.filter((a: any) => a.status !== 'concluida' && a.status !== 'cancelada' && a.data_fim_prev && a.data_fim_prev < new Date().toISOString().split('T')[0]).length
  const perc  = atividades.length ? Math.round(atividades.reduce((s: number,a: any) => s+(a.percentual_exec||0),0)/atividades.length) : 0

  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className={clsx('w-full flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all mb-1.5',
          atras > 0 ? 'bg-red-50 border-red-200' : conc === atividades.length ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200 hover:border-gray-300')}>
        <span className="text-gray-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <span className="flex-1 font-semibold text-gray-800 text-sm truncate">{nome}</span>
        <span className="text-[10px] uppercase text-gray-400">{tipo}</span>
        <div className="flex items-center gap-2 ml-2">
          {atras > 0 && <span className="badge-vermelho">{atras} atras.</span>}
          <span className="text-xs text-gray-500">{conc}/{atividades.length}</span>
          <div className="w-12 bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width:`${perc}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-700 w-8">{perc}%</span>
        </div>
      </button>
      {open && (
        <div className="space-y-1.5 ml-4">
          {atividades.map((a: any) => (
            <AtvCard key={a.id} atv={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card de atividade ──────────────────────────────────────────
function AtvCard({ atv, onSelect }: { atv:any; onSelect:(a:any)=>void }) {
  const s    = atv.status as string
  const scfg = S[s] ?? S.planejada
  const Icon = scfg.icon
  const hoje = new Date().toISOString().split('T')[0]
  const atrasada = !['concluida','cancelada'].includes(s) && atv.data_fim_prev && atv.data_fim_prev < hoje
  const diasFim  = atv.data_fim_prev ? Math.round((new Date(atv.data_fim_prev+'T12:00:00').getTime()-Date.now())/86400000) : null

  const canAct = !['concluida','cancelada','pendente_validacao'].includes(s)

  return (
    <button onClick={() => canAct && onSelect(atv)}
      className={clsx(
        'w-full rounded-xl border-2 p-4 text-left transition-all',
        scfg.bg, scfg.border,
        canAct ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : 'cursor-default',
        atrasada && s !== 'impedida' ? 'ring-2 ring-red-400 ring-offset-1' : ''
      )}>
      {/* Linha 1 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-gray-900 text-sm leading-tight flex-1">{atv.nome}</p>
        <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', scfg.bg, scfg.border, scfg.text)}>
          <Icon className="h-3.5 w-3.5" />{scfg.label}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-black/10 rounded-full h-2.5 overflow-hidden">
          <div className={clsx('h-2.5 rounded-full transition-all',
            s==='concluida'?'bg-teal-500':s==='impedida'?'bg-red-400':s==='pendente_validacao'?'bg-amber-400':'bg-blue-500')}
            style={{ width:`${atv.percentual_exec||0}%` }} />
        </div>
        <span className="text-sm font-bold text-gray-800 w-9 text-right">{atv.percentual_exec||0}%</span>
      </div>

      {/* Linha 3: info */}
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {atv.data_fim_prev && (
          <span className={clsx('flex items-center gap-1',
            atrasada?'text-red-600 font-semibold': diasFim!==null&&diasFim<=3?'text-amber-600 font-medium':'')}>
            <Clock className="h-3 w-3" />
            {atrasada ? `${Math.abs(diasFim!)}d atrasado` :
             diasFim===0 ? '⚠ Prazo hoje' : diasFim!==null ? `${diasFim}d restantes` :
             new Date(atv.data_fim_prev+'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}
        {atv.quantidade_prev && (
          <span>{atv.quantidade_exec||0}/{atv.quantidade_prev} {atv.unidade||''}</span>
        )}
        {atv.motivo_impedimento && (
          <span className="text-red-600 flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3 w-3" />{atv.motivo_impedimento}
          </span>
        )}
        {atv.obs_reprovacao && (
          <span className="text-red-700 flex items-center gap-1 font-bold">
            <MessageSquare className="h-3 w-3" />Reprovado: {atv.obs_reprovacao}
          </span>
        )}
      </div>

      {/* Indicador de ação disponível */}
      {canAct && (
        <div className={clsx('mt-2 flex items-center gap-1 text-xs font-semibold',
          s==='planejada'||s==='reprovada' ? 'text-blue-600' :
          s==='impedida' ? 'text-gray-500' : 'text-blue-600')}>
          <ArrowRight className="h-3.5 w-3.5" />
          {s==='planejada' ? 'Toque para iniciar' :
           s==='reprovada' ? 'Toque para corrigir' :
           s==='bloqueada' ? 'Bloqueada por dependência' :
           'Toque para atualizar'}
        </div>
      )}
    </button>
  )
}

// ── Atividades sem estrutura ───────────────────────────────────
function SemEstrutura({ atividades, onSelect }: any) {
  const [open, setOpen] = useState(true)
  if (!atividades.length) return null
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o=>!o)} className="flex items-center gap-2 text-sm text-gray-500 mb-2 hover:text-gray-700">
        {open?<ChevronDown className="h-4 w-4"/>:<ChevronRight className="h-4 w-4"/>}
        Sem localização ({atividades.length})
      </button>
      {open && <div className="space-y-1.5 ml-4">{atividades.map((a:any) => <AtvCard key={a.id} atv={a} onSelect={onSelect} />)}</div>}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
type FiltroStatus = 'todos'|'atencao'|'em_andamento'|'planejada'|'concluida'

function AtividadesContent() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()
  const params = useSearchParams()

  const [obras, setObras]       = useState<any[]>([])
  const [atividades, setAtivs]  = useState<any[]>([])
  const [obraId, setObraId]     = useState(params.get('obra') || '')
  const [filtro, setFiltro]     = useState<FiltroStatus>('todos')
  const [loading, setLoading]   = useState(false)
  const [selecionada, setSel]   = useState<any>(null)
  const [agrupado, setAgrupado] = useState(true)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  useEffect(() => {
    if (!portalUser) return
    portalApi.minhasObras(portalUser.empreiteiro_id).then(obs => {
      setObras(obs)
      if (!obraId && obs.length === 1) setObraId(obs[0].id)
    })
  }, [portalUser]) // eslint-disable-line

  const carregar = useCallback(() => {
    if (!portalUser) return
    setLoading(true)
    portalApi.minhasAtividades(portalUser.empreiteiro_id, obraId||undefined)
      .then(d => { setAtivs(d); () => setLoading(false) }).catch(() => () => setLoading(false))
  }, [portalUser, obraId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar(id: string, updates: any) {
    await portalApi.atualizarAtividade(id, updates)
    carregar()
  }

  const hoje = new Date().toISOString().split('T')[0]

  const atvsVisiveis = useMemo(() => {
    let list = atividades
    if (filtro === 'atencao')     list = list.filter(a => ['impedida','reprovada','pendente_validacao'].includes(a.status))
    if (filtro === 'em_andamento') list = list.filter(a => a.status === 'em_andamento')
    if (filtro === 'planejada')   list = list.filter(a => a.status === 'planejada')
    if (filtro === 'concluida')   list = list.filter(a => a.status === 'concluida')
    return list
  }, [atividades, filtro])

  // Agrupar por estrutura
  const grupos = useMemo(() => {
    const map: Record<string, { nome:string; tipo:string; ordem:number; atividades:any[] }> = {}
    const semEstr: any[] = []
    atvsVisiveis.forEach(a => {
      if (a.estrutura_obra) {
        const k = a.estrutura_id
        if (!map[k]) map[k] = { nome: a.estrutura_obra.nome, tipo: a.estrutura_obra.tipo, ordem: a.estrutura_obra.ordem||0, atividades:[] }
        map[k].atividades.push(a)
      } else {
        semEstr.push(a)
      }
    })
    return { grupos: Object.entries(map).sort((a,b) => a[1].ordem-b[1].ordem), semEstr }
  }, [atvsVisiveis])

  const contadores = useMemo(() => ({
    todos:       atividades.length,
    atencao:     atividades.filter(a => ['impedida','reprovada','pendente_validacao'].includes(a.status)).length,
    em_andamento: atividades.filter(a => a.status==='em_andamento').length,
    planejada:   atividades.filter(a => a.status==='planejada').length,
    concluida:   atividades.filter(a => a.status==='concluida').length,
    atrasadas:   atividades.filter(a => !['concluida','cancelada'].includes(a.status) && a.data_fim_prev && a.data_fim_prev < hoje).length,
  }), [atividades, hoje])

  const percGeral = atividades.length
    ? Math.round(atividades.reduce((s,a) => s+(a.percentual_exec||0),0)/atividades.length) : 0

  const nomeEmp = portalUser?.empreiteiros?.nome_fantasia || portalUser?.empreiteiros?.razao_social

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 safe-top">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {nomeEmp?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{nomeEmp}</p>
              <p className="text-[11px] text-gray-400">Portal do Empreiteiro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={carregar} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={() => { logoutPortal(); router.replace('/portal/login') }}
              className="p-2 rounded-xl hover:bg-red-50 text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Seletor de obra (só se tiver mais de 1) */}
        {obras.length > 1 && (
          <div className="border-t border-gray-100 px-4 py-2 max-w-2xl mx-auto">
            <select value={obraId} onChange={e => setObraId(e.target.value)}
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        )}
        {obras.length === 1 && (
          <div className="border-t border-gray-100 px-4 py-2 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-gray-800 truncate">{obras[0].nome}</span>
              </div>
              {/* Progress geral */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width:`${percGeral}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700">{percGeral}%</span>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="pt-[calc(3.5rem+4rem)] pb-24 max-w-2xl mx-auto px-4">
        {/* KPIs rápidos */}
        <div className="grid grid-cols-4 gap-2 py-4">
          {([
            { k:'em_andamento', l:'Andamento', c:'text-blue-600',   bg:'bg-blue-50' },
            { k:'atencao',      l:'Atenção',    c:'text-red-600',    bg:'bg-red-50'  },
            { k:'concluida',    l:'Concluídas', c:'text-teal-600',   bg:'bg-teal-50' },
            { k:'planejada',    l:'A iniciar',  c:'text-gray-600',   bg:'bg-gray-50' },
          ] as const).map(({ k, l, c, bg }) => (
            <button key={k} onClick={() => setFiltro(filtro===k ? 'todos' : k)}
              className={clsx('rounded-2xl border p-2.5 text-center transition-all',
                filtro===k ? 'ring-2 ring-offset-1 ring-blue-500' : '',
                bg, filtro===k ? 'border-blue-200' : 'border-gray-100')}>
              <p className={clsx('text-xl font-bold', c)}>{contadores[k]}</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{l}</p>
            </button>
          ))}
        </div>

        {/* Alerta atrasadas */}
        {contadores.atrasadas > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 border-2 border-red-300 px-4 py-2.5 text-sm text-red-700 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {contadores.atrasadas} atividade(s) fora do prazo!
          </div>
        )}

        {/* Toggle agrupado / lista */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">{atvsVisiveis.length} atividade(s)</p>
          <button onClick={() => setAgrupado(v => !v)}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700">
            {agrupado ? <><Filter className="h-3.5 w-3.5" />Ver lista</> : <><GitBranch className="h-3.5 w-3.5" />Ver por local</>}
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : atvsVisiveis.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 font-medium text-sm">Nenhuma atividade encontrada</p>
          </div>
        ) : agrupado ? (
          /* Agrupado por estrutura */
          <div>
            {grupos.grupos.map(([id, g]) => (
              <GrupoEstrutura key={id} nome={g.nome} tipo={g.tipo} atividades={g.atividades} onSelect={setSel} />
            ))}
            <SemEstrutura atividades={grupos.semEstr} onSelect={setSel} />
          </div>
        ) : (
          /* Lista plana */
          <div className="space-y-2">
            {atvsVisiveis.map(a => <AtvCard key={a.id} atv={a} onSelect={setSel} />)}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40 safe-bottom">
        {[
          { href:'/portal/home',         icon:Building2,  label:'Início'      },
          { href:'/portal/atividades',   icon:GitBranch,  label:'Atividades'  },
          { href:'/portal/colaboradores',icon:Users,      label:'Equipe'      },
          { href:'/portal/presenca',     icon:Calendar,   label:'Presença'    },
        ].map(item => {
          const Icon = item.icon
          const isAct = item.href.includes('atividades')
          return (
            <Link key={item.href} href={item.href}
              className={clsx('flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                isAct ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
              <Icon className="h-5 w-5" />{item.label}
            </Link>
          )
        })}
      </nav>

      {/* Modal */}
      {selecionada && (
        <ModalAcao
          atv={selecionada}
          onClose={() => setSel(null)}
          onSave={async (updates) => { await salvar(selecionada.id, updates); setSel(null) }}
        />
      )}
    </div>
  )
}

export default function AtividadesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <AtividadesContent />
    </Suspense>
  )
}
