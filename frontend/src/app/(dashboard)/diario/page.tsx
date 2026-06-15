'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useObraContext } from '@/hooks/useObraContext'
import { ObraSelector } from '@/components/ObraSelector'
import { obras as obrasApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'
import type { Obra } from '@/types'
import {
  BookOpen, Loader2, Plus, Users, Camera, AlertTriangle,
  CheckCircle, Cloud, Sun, CloudRain, Wind, ThermometerSun,
  ChevronDown, ChevronUp, Edit2, Save, X, Pencil,
  Building2, Clock, FileText,
} from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'sonner'

const CLIMA_OPTS = [
  { v: 'sol',   l: 'Sol',    icon: Sun },
  { v: 'nublado', l: 'Nublado', icon: Cloud },
  { v: 'chuva', l: 'Chuva',  icon: CloudRain },
  { v: 'vento', l: 'Vento',  icon: Wind },
]

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function hoje() { return new Date().toISOString().split('T')[0] }

export default function DiarioPage() {
  const { user } = useAuth()
  const isRestrito = ['engenheiro','mestre','pcp','almoxarife'].includes((user as any)?.perfil ?? '')

  const [obras, setObras]     = useState<Obra[]>([])
  const [obraId, setObraId]   = useState('')
  const [diarios, setDiarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [editNota, setEditNota] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  // Modal novo registro manual
  const [showModal, setShowModal] = useState(false)
  const [novoForm, setNovoForm] = useState({
    data:        hoje(),
    clima:       'sol',
    temperatura: '',
    descricao:   '',
    ocorrencias: '',
    notas:       '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      try {
        const u = JSON.parse(localStorage.getItem('sgo_user') ?? '{}')
        if (['engenheiro','mestre','pcp','almoxarife'].includes(u?.perfil) && obs.length === 1) {
          setObraId(obs[0].id)
        }
      } catch {}
    })
  }, [])

  const carregarDiarios = useCallback((id: string) => {
    if (!id) { setDiarios([]); return }
    setLoading(true)
    void (async () => {
      try {
        const { data } = await supabase.from('diario_obra').select('*, obras(nome)').eq('obra_id', id)
          .order('data', { ascending: false })
        setDiarios(data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => { carregarDiarios(obraId) }, [obraId, carregarDiarios])

  // Gera diário de hoje consolidando dados do banco
  const gerarHoje = async () => {
    if (!obraId) return
    setGerando(true)
    try {
      const hj = hoje()

      // Busca efetivo do dia
      const { data: ef } = await supabase.from('efetivo_diario')
        .select('efetivo_total, efetivo_presente, *, efetivo_colaboradores(status)')
        .eq('obra_id', obraId).eq('data', hj).maybeSingle()

      // Busca produções do dia
      const { data: prods } = await supabase.from('producoes')
        .select('*, atividades(nome)').eq('obra_id', obraId).eq('data', hj)

      // Busca pendências abertas
      const { data: pends } = await supabase.from('pendencias')
        .select('id').eq('obra_id', obraId).eq('status', 'aberta')

      // Busca atividades com impedimento
      const { data: imps } = await supabase.from('atividades')
        .select('id, nome, motivo_impedimento').eq('obra_id', obraId).eq('status', 'impedida')

      const presentes  = ef?.efetivo_colaboradores?.filter((c: any) => c.status === 'presente').length ?? (ef?.efetivo_presente ?? 0)
      const previsto   = ef?.efetivo_colaboradores?.length ?? (ef?.efetivo_total ?? 0)

      // Monta descrição automática
      const linhas: string[] = []
      if (presentes > 0) linhas.push(`• ${presentes} colaboradores presentes${previsto ? ` de ${previsto} previstos` : ''}.`)
      if (prods && prods.length > 0) {
        linhas.push(`• ${prods.length} apontamento(s) de produção registrados.`)
        prods.forEach((p: any) => {
          if (p.atividades?.nome) linhas.push(`  - ${p.atividades.nome}: ${p.quantidade} ${p.unidade ?? ''}`)
        })
      }
      if (imps && imps.length > 0) {
        linhas.push(`• ${imps.length} atividade(s) com impedimento.`)
        imps.forEach((i: any) => { if (i.motivo_impedimento) linhas.push(`  - ${i.nome}: ${i.motivo_impedimento}`) })
      }

      const descricao = linhas.join('\n') || 'Dia sem registros de produção.'

      // Upsert diário de hoje
      const { error } = await supabase.from('diario_obra').upsert({
        obra_id:            obraId,
        construtora_id:     (user as any)?.construtora_id,
        data:               hj,
        efetivo_presente:   presentes,
        efetivo_previsto:   previsto,
        total_producoes:    prods?.length ?? 0,
        total_impedimentos: imps?.length ?? 0,
        total_pendencias:   pends?.length ?? 0,
        total_fotos:        0,
        descricao_geral:    descricao,
        gerado_auto:        true,
      }, { onConflict: 'obra_id,data' })

      if (error) throw error
      toast.success('Diário de hoje gerado!')
      carregarDiarios(obraId)
      setExpandido(hoje())
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar diário')
    } finally {
      setGerando(false)
    }
  }

  // Salvar nota adicional em registro existente
  async function salvarNota(id: string) {
    try {
      await supabase.from('diario_obra').update({ notas_adicionais: editNota }).eq('id', id)
      toast.success('Nota salva!')
      setEditId(null)
      carregarDiarios(obraId)
    } catch { toast.error('Erro ao salvar nota') }
  }

  // Criar registro manual
  async function criarManual(e: React.FormEvent) {
    e.preventDefault()
    if (!obraId) { toast.error('Selecione uma obra'); return }
    setSalvando(true)
    try {
      const { error } = await supabase.from('diario_obra').insert({
        obra_id:         obraId,
        construtora_id:  (user as any)?.construtora_id,
        data:            novoForm.data,
        clima:           novoForm.clima,
        temperatura:     novoForm.temperatura ? Number(novoForm.temperatura) : null,
        descricao_geral: novoForm.descricao,
        ocorrencias:     novoForm.ocorrencias,
        notas_adicionais: novoForm.notas,
        gerado_auto:     false,
      })
      if (error) throw error
      toast.success('Registro criado!')
      setShowModal(false)
      setNovoForm({ data: hoje(), clima: 'sol', temperatura: '', descricao: '', ocorrencias: '', notas: '' })
      carregarDiarios(obraId)
    } catch (e: any) { toast.error(e?.message ?? 'Erro') }
    finally { setSalvando(false) }
  }

  const obraNome = obras.find(o => o.id === obraId)?.nome

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
          <p className="text-sm text-gray-500 mt-1">Registro diário de atividades, efetivo e ocorrências</p>
        </div>
        <div className="flex items-center gap-2">
          {obraId && (
            <>
              <button onClick={() => setShowModal(true)}
                className="btn-secondary text-sm">
                <Plus className="h-4 w-4" /> Registro Manual
              </button>
              <button onClick={gerarHoje} disabled={gerando}
                className="btn-primary text-sm">
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                Gerar Hoje
              </button>
            </>
          )}
        </div>
      </div>

      {/* Seletor de obra */}
      <div className="flex items-center gap-3">
        <ObraSelector obras={obras} obraId={obraId} setObraId={setObraId} isRestrito={isRestrito} />
        {obraNome && <span className="text-sm text-gray-500">{diarios.length} registro(s)</span>}
      </div>

      {/* Timeline */}
      {!obraId ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-400 shadow-sm">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>Selecione uma obra para ver o diário</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : diarios.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium text-sm">Nenhum registro ainda</p>
          <p className="text-gray-400 text-xs mt-1">Clique em "Gerar Hoje" para criar o primeiro registro automático</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha da timeline */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {diarios.map((d: any) => {
              const isExp = expandido === d.id
              const ClimaIcon = CLIMA_OPTS.find(c => c.v === d.clima)?.icon ?? Sun
              const isHoje = d.data === hoje()
              return (
                <div key={d.id} className="relative pl-14">
                  {/* Dot na timeline */}
                  <div className={clsx(
                    'absolute left-4 top-5 h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center',
                    isHoje ? 'bg-blue-600' : 'bg-white border-gray-300'
                  )}>
                    {isHoje && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Header do card */}
                    <button onClick={() => setExpandido(isExp ? null : d.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 capitalize text-sm">{fmtDate(d.data)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {d.gerado_auto
                              ? <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">🤖 Automático</span>
                              : <span className="text-[10px] text-gray-400 bg-blue-50 rounded-full px-2 py-0.5">✍️ Manual</span>
                            }
                            {isHoje && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Hoje</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Mini KPIs */}
                        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                          {d.efetivo_presente !== undefined && d.efetivo_presente !== null && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              <span className="font-semibold text-gray-700">{d.efetivo_presente}</span>
                              {d.efetivo_previsto ? `/${d.efetivo_previsto}` : ''}
                            </div>
                          )}
                          {d.total_producoes > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-teal-500" />
                              <span>{d.total_producoes}</span>
                            </div>
                          )}
                          {d.total_impedimentos > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              <span>{d.total_impedimentos}</span>
                            </div>
                          )}
                          {d.clima && <ClimaIcon className="h-3.5 w-3.5 text-blue-400" />}
                          {d.temperatura && <span className="flex items-center gap-0.5"><ThermometerSun className="h-3.5 w-3.5 text-orange-400" />{d.temperatura}°C</span>}
                        </div>
                        {isExp ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                      </div>
                    </button>

                    {/* Conteúdo expandido */}
                    {isExp && (
                      <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
                        {/* KPIs mobile */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:hidden">
                          {[
                            { icon: Users,         label: 'Efetivo',      v: `${d.efetivo_presente ?? 0}/${d.efetivo_previsto ?? 0}` },
                            { icon: CheckCircle,   label: 'Produções',    v: d.total_producoes ?? 0 },
                            { icon: AlertTriangle, label: 'Impedimentos', v: d.total_impedimentos ?? 0 },
                            { icon: AlertTriangle, label: 'Pendências',   v: d.total_pendencias ?? 0 },
                          ].map(({ icon: Icon, label, v }) => (
                            <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                              <Icon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                              <p className="text-lg font-bold text-gray-900">{v}</p>
                              <p className="text-[10px] text-gray-500">{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Descrição */}
                        {d.descricao_geral && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Atividades do dia</p>
                            <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed border border-gray-100">
                              {d.descricao_geral}
                            </pre>
                          </div>
                        )}

                        {/* Ocorrências */}
                        {d.ocorrencias && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ocorrências</p>
                            <p className="text-sm text-gray-700 bg-amber-50 rounded-xl p-3 border border-amber-100">
                              {d.ocorrencias}
                            </p>
                          </div>
                        )}

                        {/* Notas adicionais — editável */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</p>
                            {editId !== d.id && (
                              <button onClick={() => { setEditId(d.id); setEditNota(d.notas_adicionais ?? '') }}
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                                <Pencil className="h-3 w-3" /> Editar
                              </button>
                            )}
                          </div>
                          {editId === d.id ? (
                            <div className="space-y-2">
                              <textarea rows={4} value={editNota} onChange={e => setEditNota(e.target.value)}
                                placeholder="Adicione notas ao diário..."
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                              <div className="flex gap-2">
                                <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200">
                                  <X className="h-3 w-3" /> Cancelar
                                </button>
                                <button onClick={() => salvarNota(d.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                                  <Save className="h-3 w-3" /> Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100 min-h-[40px]">
                              {d.notas_adicionais || <span className="italic text-gray-400">Sem notas adicionais</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Novo Registro Manual */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" /> Novo Registro Manual
              </h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400 hover:text-gray-700" /></button>
            </div>
            <form onSubmit={criarManual} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required max={hoje()} value={novoForm.data}
                    onChange={e => setNovoForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                  <input type="number" value={novoForm.temperatura}
                    onChange={e => setNovoForm(f => ({ ...f, temperatura: e.target.value }))}
                    placeholder="Ex.: 28"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clima</label>
                <div className="grid grid-cols-4 gap-2">
                  {CLIMA_OPTS.map(c => {
                    const Icon = c.icon
                    return (
                      <button key={c.v} type="button" onClick={() => setNovoForm(f => ({ ...f, clima: c.v }))}
                        className={clsx('flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition-all',
                          novoForm.clima === c.v
                            ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                        <Icon className="h-5 w-5" />{c.l}
                      </button>
                    )
                  })}
                </div>
              </div>

              {[
                { k: 'descricao', l: 'Atividades do dia *', p: 'Descreva as atividades realizadas...', r: true },
                { k: 'ocorrencias', l: 'Ocorrências / Problemas', p: 'Registre ocorrências relevantes...' },
                { k: 'notas', l: 'Notas adicionais', p: 'Observações gerais...' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.l}</label>
                  <textarea required={f.r} rows={3} value={(novoForm as any)[f.k]}
                    onChange={e => setNovoForm(p => ({ ...p, [f.k]: e.target.value }))}
                    placeholder={f.p}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="btn-primary text-sm">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
