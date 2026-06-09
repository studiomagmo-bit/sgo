'use client'
import { useState, useEffect } from 'react'
import { obras as obrasApi, empreiteiros as empreiteirosApi, efetivos, colaboradores as colaboradoresApi } from '@/lib/sgoApi'
import {
  Users, CalendarDays, Building2, HardHat, CheckCircle2,
  XCircle, Clock, AlertCircle, Save, RefreshCw, ChevronDown,
} from 'lucide-react'
import { clsx } from 'clsx'

type Obra = { id: string; nome: string }
type Empreiteiro = { id: string; razao_social: string }
type Colaborador = { id: string; nome: string; funcao?: string }

type PresencaLocal = {
  colaborador_id: string
  nome: string
  funcao?: string
  presente: boolean
  motivo_ausencia: string
  horas_trabalhadas: number
  observacao: string
}

const MOTIVOS = ['atestado', 'falta_justificada', 'falta_injustificada', 'folga', 'ferias', 'demissao', 'outro']
const MOTIVO_LABEL: Record<string, string> = {
  atestado: 'Atestado', falta_justificada: 'Falta justificada',
  falta_injustificada: 'Falta injustificada', folga: 'Folga',
  ferias: 'Férias', demissao: 'Demissão', outro: 'Outro',
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

export default function EfetivoPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])

  const [obraId, setObraId] = useState('')
  const [empreteiroId, setEmpreteiroId] = useState('')
  const [data, setData] = useState(hoje())

  const [efetivo, setEfetivo] = useState<any>(null)
  const [presencas, setPresencas] = useState<PresencaLocal[]>([])
  const [loadingPresenca, setLoadingPresenca] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  // Histórico de registros para a obra/data
  const [historico, setHistorico] = useState<any[]>([])
  const [loadingHist, setLoadingHist] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const [obs, emps] = await Promise.all([obrasApi.listar(), empreiteirosApi.listar()])
        setObras(obs)
        setEmpreiteiros(emps)
      } catch {}
    }
    init()
  }, [])

  // Carrega presença quando muda obra + empreiteiro + data
  useEffect(() => {
    if (obraId && empreteiroId && data) carregarPresenca()
  }, [obraId, empreteiroId, data])

  // Carrega histórico quando muda obra ou data
  useEffect(() => {
    if (obraId && data) carregarHistorico()
  }, [obraId, data])

  async function carregarPresenca() {
    setLoadingPresenca(true)
    setErro('')
    setSalvo(false)
    try {
      // Busca/cria efetivo_diario
      const ef = await efetivos.buscarOuCriar(obraId, empreteiroId, data)
      setEfetivo(ef)

      // Carrega colaboradores do empreiteiro
      const cols: Colaborador[] = await colaboradoresApi.listar(empreteiroId)

      // Carrega presença existente para este efetivo
      const presExistentes = await efetivos.listarPresenca(ef.id)
      const presMap: Record<string, any> = {}
      presExistentes.forEach((p: any) => { presMap[p.colaborador_id] = p })

      // Monta lista com todos colaboradores, usando presença salva ou defaults
      const lista: PresencaLocal[] = cols.map(c => {
        const saved = presMap[c.id]
        return {
          colaborador_id: c.id,
          nome: c.nome,
          funcao: c.funcao,
          presente: saved ? saved.presente : true,
          motivo_ausencia: saved?.motivo_ausencia ?? '',
          horas_trabalhadas: saved?.horas_trabalhadas ?? 8,
          observacao: saved?.observacao ?? '',
        }
      })
      setPresencas(lista)
    } catch (e: any) {
      setErro('Erro ao carregar: ' + e.message)
    } finally {
      setLoadingPresenca(false)
    }
  }

  async function carregarHistorico() {
    setLoadingHist(true)
    try {
      const hist = await efetivos.listar({ obra_id: obraId, data })
      setHistorico(hist)
    } catch {}
    finally { setLoadingHist(false) }
  }

  function togglePresente(colaborador_id: string) {
    setPresencas(prev => prev.map(p =>
      p.colaborador_id === colaborador_id
        ? { ...p, presente: !p.presente, motivo_ausencia: '' }
        : p
    ))
  }

  function atualizarCampo(colaborador_id: string, campo: string, valor: any) {
    setPresencas(prev => prev.map(p =>
      p.colaborador_id === colaborador_id ? { ...p, [campo]: valor } : p
    ))
  }

  async function salvarPresenca() {
    if (!efetivo || presencas.length === 0) return
    setSalvando(true)
    setErro('')
    try {
      const registros = presencas.map(p => ({
        efetivo_id: efetivo.id,
        colaborador_id: p.colaborador_id,
        presente: p.presente,
        motivo_ausencia: p.presente ? null : (p.motivo_ausencia || null),
        horas_trabalhadas: p.presente ? p.horas_trabalhadas : 0,
        observacao: p.observacao || null,
      }))
      await efetivos.salvarPresencaLote(registros)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e: any) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  const totalPresentes = presencas.filter(p => p.presente).length
  const totalAusentes = presencas.filter(p => !p.presente).length
  const totalHoras = presencas.filter(p => p.presente).reduce((s, p) => s + Number(p.horas_trabalhadas), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Efetivo Diário</h1>
        <p className="text-slate-400 text-sm mt-1">
          Registro de presença por colaborador
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <Building2 className="inline h-3 w-3 mr-1" />Obra *
          </label>
          <select
            value={obraId}
            onChange={e => setObraId(e.target.value)}
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecionar obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <HardHat className="inline h-3 w-3 mr-1" />Empreiteiro *
          </label>
          <select
            value={empreteiroId}
            onChange={e => setEmpreteiroId(e.target.value)}
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecionar empreiteiro...</option>
            {empreiteiros.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <CalendarDays className="inline h-3 w-3 mr-1" />Data *
          </label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Estado: não selecionado */}
      {(!obraId || !empreteiroId) && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-10 text-center">
          <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Selecione uma obra e um empreiteiro para registrar a presença.</p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {erro}
        </div>
      )}

      {/* Loading */}
      {loadingPresenca && obraId && empreteiroId && (
        <div className="text-slate-400 text-sm animate-pulse flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando colaboradores...
        </div>
      )}

      {/* Cards KPI */}
      {!loadingPresenca && presencas.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-300">{totalPresentes}</p>
              <p className="text-xs text-slate-400 mt-0.5">Presentes</p>
            </div>
            <div className="rounded-xl border border-red-700/40 bg-red-900/20 p-4 text-center">
              <XCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-300">{totalAusentes}</p>
              <p className="text-xs text-slate-400 mt-0.5">Ausentes</p>
            </div>
            <div className="rounded-xl border border-blue-700/40 bg-blue-900/20 p-4 text-center">
              <Clock className="h-6 w-6 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-300">{totalHoras}h</p>
              <p className="text-xs text-slate-400 mt-0.5">Total de Horas</p>
            </div>
          </div>

          {/* Lista de colaboradores */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/60">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Registro de Presença — {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <span className="text-xs text-slate-400">{presencas.length} colaboradores</span>
            </div>

            <div className="divide-y divide-slate-700/50">
              {presencas.map(p => (
                <div
                  key={p.colaborador_id}
                  className={clsx(
                    'px-5 py-4 transition-colors',
                    p.presente ? 'hover:bg-slate-700/20' : 'bg-red-900/10 hover:bg-red-900/20'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Toggle presente */}
                    <button
                      onClick={() => togglePresente(p.colaborador_id)}
                      className={clsx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        p.presente
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-red-500 bg-red-500/20 text-red-400'
                      )}
                    >
                      {p.presente
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <XCircle className="h-4 w-4" />
                      }
                    </button>

                    {/* Info colaborador */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{p.nome}</p>
                        {p.funcao && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {p.funcao}
                          </span>
                        )}
                        <span className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          p.presente
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
                            : 'bg-red-900/50 text-red-300 border border-red-700/40'
                        )}>
                          {p.presente ? 'Presente' : 'Ausente'}
                        </span>
                      </div>

                      {/* Campos extras: presença = horas; ausente = motivo */}
                      <div className="mt-2 flex flex-wrap gap-3">
                        {p.presente ? (
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-slate-400">Horas:</label>
                            <input
                              type="number"
                              min={0}
                              max={24}
                              step={0.5}
                              value={p.horas_trabalhadas}
                              onChange={e => atualizarCampo(p.colaborador_id, 'horas_trabalhadas', Number(e.target.value))}
                              className="w-16 rounded bg-slate-700 border border-slate-600 px-2 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-slate-500">h</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-slate-400">Motivo:</label>
                            <select
                              value={p.motivo_ausencia}
                              onChange={e => atualizarCampo(p.colaborador_id, 'motivo_ausencia', e.target.value)}
                              className="rounded bg-slate-700 border border-slate-600 px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Selecionar...</option>
                              {MOTIVOS.map(m => (
                                <option key={m} value={m}>{MOTIVO_LABEL[m]}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {/* Observação */}
                        <input
                          value={p.observacao}
                          onChange={e => atualizarCampo(p.colaborador_id, 'observacao', e.target.value)}
                          placeholder="Observação..."
                          className="flex-1 min-w-[160px] rounded bg-slate-700 border border-slate-600 px-2 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé: Salvar */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700 bg-slate-800/60">
              <div className="flex gap-3 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{totalPresentes} presentes</span>
                <span>·</span>
                <span className="text-red-400 font-medium">{totalAusentes} ausentes</span>
                <span>·</span>
                <span className="text-blue-400 font-medium">{totalHoras}h total</span>
              </div>
              <button
                onClick={salvarPresenca}
                disabled={salvando || presencas.length === 0}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50',
                  salvo
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {salvando ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : salvo ? (
                  <><CheckCircle2 className="h-4 w-4" /> Salvo!</>
                ) : (
                  <><Save className="h-4 w-4" /> Salvar Presença</>
                )}
              </button>
            </div>
          </div>

          {/* Não há colaboradores */}
          {presencas.length === 0 && !loadingPresenca && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center">
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nenhum colaborador ativo cadastrado para este empreiteiro.</p>
              <p className="text-slate-500 text-xs mt-1">
                Vá em <strong className="text-slate-400">Colaboradores</strong> para cadastrar os trabalhadores.
              </p>
            </div>
          )}
        </>
      )}

      {/* Histórico do dia para a obra */}
      {obraId && data && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-white">
              Registros do dia — {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}
            </h2>
          </div>
          {loadingHist ? (
            <p className="px-5 py-4 text-slate-500 text-xs animate-pulse">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="px-5 py-4 text-slate-500 text-sm">Nenhum registro para este dia.</p>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {historico.map(h => (
                <div key={h.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <HardHat className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-white">{h.empreiteiros?.razao_social || '—'}</span>
                  </div>
                  <button
                    onClick={() => { setEmpreteiroId(h.empreiteiro_id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Ver presença
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
