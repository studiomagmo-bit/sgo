'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { obras as obrasApi } from '@/lib/sgoApi'
import { Plus, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Calendar, AlertTriangle, Check } from 'lucide-react'
import { clsx } from 'clsx'

// ── Cores por status ──────────────────────────────────────────
const STATUS_COLOR: Record<string, { bar: string; text: string; bg: string }> = {
  planejada:    { bar: 'bg-slate-300',    text: 'text-gray-600',   bg: 'bg-slate-50'   },
  em_andamento: { bar: 'bg-blue-500',     text: 'text-blue-700',    bg: 'bg-blue-50'    },
  concluida:    { bar: 'bg-emerald-500',  text: 'text-emerald-700', bg: 'bg-emerald-50' },
  bloqueada:    { bar: 'bg-red-400',      text: 'text-red-700',     bg: 'bg-red-50'     },
  cancelada:    { bar: 'bg-gray-200',     text: 'text-gray-400',    bg: 'bg-gray-50'    },
}
const STATUS_LABEL: Record<string, string> = {
  planejada: 'Planejada', em_andamento: 'Em andamento',
  concluida: 'Concluída', bloqueada: 'Bloqueada', cancelada: 'Cancelada',
}

const DAY_PX = 28          // largura de 1 dia em pixels

// Calcula diferença em dias entre duas datas
function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }

export default function GanttPage() {
  const [obras, setObras]       = useState<any[]>([])
  const [obraId, setObraId]     = useState('')
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [zoom, setZoom]         = useState(1)         // multiplicador
  const [offsetDias, setOffsetDias] = useState(-14)   // deslocamento inicial (14 dias antes de hoje)

  // Modal nova atividade
  const [showModal, setShowModal]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [estruturas, setEstruturas] = useState<any[]>([])
  const [empreiteiros, setEmpreiteiros] = useState<any[]>([])
  const [novaAtividade, setNovaAtividade] = useState({
    nome: '', estrutura_id: '', empreiteiro_id: '',
    data_inicio_prev: today(), data_fim_prev: addDays(today(), 7),
    quantidade_prev: '', unidade: '',
  })

  // ─── Carrega obras ────────────────────────────────────────────
  useEffect(() => {
    obrasApi.listar().then(o => { setObras(o); if (o.length === 1) setObraId(o[0].id) })
  }, [])

  // ─── Carrega atividades + estruturas + empreiteiros ───────────
  useEffect(() => {
    if (!obraId) return
    setLoading(true)
    Promise.all([
      supabase.from('atividades')
        .select('*, estrutura_obra(nome, tipo), empreiteiros(razao_social)')
        .eq('obra_id', obraId)
        .order('data_inicio_prev', { ascending: true }),
      supabase.from('estrutura_obra')
        .select('id, nome, tipo')
        .eq('obra_id', obraId)
        .order('nome'),
      supabase.from('empreiteiros')
        .select('id, razao_social')
        .eq('ativo', true)
        .order('razao_social'),
    ]).then(([a, e, emp]) => {
      setAtividades(a.data ?? [])
      setEstruturas(e.data ?? [])
      setEmpreiteiros(emp.data ?? [])
    }).finally(() => setLoading(false))
  }, [obraId])

  // ─── Calcular timeline ────────────────────────────────────────
  const { startDate, totalDias, meses } = useMemo(() => {
    const base = today()
    const start = addDays(base, offsetDias)
    const total = Math.round(180 / zoom)   // janela visível ~6 meses ajustada pelo zoom
    // Gera lista de meses para o header
    const mesesList: { label: string; dias: number; start: string }[] = []
    let cur = new Date(start)
    while (diffDays(start, cur.toISOString().split('T')[0]) < total) {
      const ano = cur.getFullYear(), mes = cur.getMonth()
      const diasNoMes = new Date(ano, mes + 1, 0).getDate()
      const diaInicio = new Date(ano, mes, 1)
      const diaFim    = new Date(ano, mes + 1, 0)
      const visStart  = new Date(Math.max(diaInicio.getTime(), new Date(start).getTime()))
      const visEnd    = new Date(Math.min(diaFim.getTime(),    new Date(addDays(start, total)).getTime()))
      const visivel   = Math.round((visEnd.getTime() - visStart.getTime()) / 86400000) + 1
      mesesList.push({
        label: diaInicio.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
        dias: Math.max(visivel, 0),
        start: visStart.toISOString().split('T')[0],
      })
      cur = new Date(ano, mes + 1, 1)
    }
    return { startDate: start, totalDias: total, meses: mesesList }
  }, [offsetDias, zoom])

  const dayWidth = Math.round(DAY_PX * zoom)

  // ─── Posição/largura de uma atividade na timeline ─────────────
  function barStyle(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) return null
    const left  = diffDays(startDate, inicio)
    const width = Math.max(diffDays(inicio, fim), 1)
    if (left + width < 0 || left > totalDias) return null   // fora da janela
    return {
      left:  Math.max(left, 0) * dayWidth,
      width: (left < 0 ? width + left : width) * dayWidth,
    }
  }

  // ─── Preview da nova atividade ────────────────────────────────
  const previewBar = barStyle(novaAtividade.data_inicio_prev, novaAtividade.data_fim_prev)
  const duracaoDias = diffDays(novaAtividade.data_inicio_prev, novaAtividade.data_fim_prev)

  // Detecta conflitos: outras atividades no mesmo empreiteiro que se sobrepõem
  const conflitos = useMemo(() => {
    if (!novaAtividade.data_inicio_prev || !novaAtividade.data_fim_prev || !novaAtividade.empreiteiro_id || !showModal) return []
    return atividades.filter(a =>
      a.empreiteiro_id === novaAtividade.empreiteiro_id &&
      a.data_inicio_prev && a.data_fim_prev &&
      !(novaAtividade.data_fim_prev < a.data_inicio_prev || novaAtividade.data_inicio_prev > a.data_fim_prev)
    )
  }, [novaAtividade, atividades, showModal])

  // ─── Salvar nova atividade ────────────────────────────────────
  async function salvar() {
    if (!novaAtividade.nome || !novaAtividade.data_inicio_prev || !novaAtividade.data_fim_prev) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('atividades').insert({
        nome:              novaAtividade.nome,
        obra_id:           obraId,
        estrutura_id:      novaAtividade.estrutura_id || null,
        empreiteiro_id:    novaAtividade.empreiteiro_id || null,
        data_inicio_prev:  novaAtividade.data_inicio_prev,
        data_fim_prev:     novaAtividade.data_fim_prev,
        quantidade_prev:   novaAtividade.quantidade_prev ? Number(novaAtividade.quantidade_prev) : null,
        unidade:           novaAtividade.unidade || null,
        status:            'planejada',
        percentual_exec:   0,
      }).select('*, estrutura_obra(nome, tipo), empreiteiros(razao_social)').single()
      if (error) throw error
      setAtividades(prev => [...prev, data])
      setShowModal(false)
      setNovaAtividade({ nome: '', estrutura_id: '', empreiteiro_id: '', data_inicio_prev: today(), data_fim_prev: addDays(today(), 7), quantidade_prev: '', unidade: '' })
    } catch (e: any) { console.error(e.message) }
    finally { setSaving(false) }
  }

  // ─── Agrupar por estrutura ────────────────────────────────────
  const grupos = useMemo(() => {
    const map = new Map<string, { nome: string; atividades: any[] }>()
    atividades.forEach(a => {
      const key  = a.estrutura_id ?? '__sem__'
      const nome = a.estrutura_obra?.nome ?? 'Sem estrutura'
      if (!map.has(key)) map.set(key, { nome, atividades: [] })
      map.get(key)!.atividades.push(a)
    })
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v }))
  }, [atividades])

  const todayOffset = diffDays(startDate, today())

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cronograma Gantt</h1>
          <p className="text-sm text-gray-500 mt-0.5">{atividades.length} atividades planejadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Obra selector */}
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Selecionar obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs text-gray-500 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"><ZoomIn className="h-4 w-4" /></button>
          {/* Navegar */}
          <button onClick={() => setOffsetDias(d => d - 30)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setOffsetDias(-14)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50">Hoje</button>
          <button onClick={() => setOffsetDias(d => d + 30)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button>
          {obraId && (
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Nova Atividade
            </button>
          )}
        </div>
      </div>

      {/* Legenda status */}
      <div className="flex flex-wrap gap-3 items-center">
        {Object.entries(STATUS_COLOR).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={clsx('h-3 w-6 rounded-sm', v.bar)} />
            <span className="text-xs text-gray-500">{STATUS_LABEL[k]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-3">
          <div className="h-3 w-6 rounded-sm bg-red-400 ring-2 ring-red-500" />
          <span className="text-xs text-red-600 font-medium">Atrasada</span>
        </div>
        <span className="text-xs text-gray-400">| linha vermelha = hoje</span>
      </div>

      {!obraId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Selecione uma obra para ver o cronograma</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
          {/* Gantt grid */}
          <div className="flex">
            {/* Coluna de labels */}
            <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 z-10">
              {/* Header meses placeholder */}
              <div className="h-8 border-b border-gray-200" />
              <div className="h-7 border-b border-gray-200 px-3 flex items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atividade</span>
              </div>
              {grupos.map(g => (
                <div key={g.key}>
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                    <p className="text-xs font-bold text-blue-700 truncate">{g.nome}</p>
                  </div>
                  {g.atividades.map(a => (
                    <div key={a.id} className="h-10 flex items-center px-3 border-b border-gray-100">
                      <p className="text-xs text-gray-700 truncate">{a.nome}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Área do Gantt */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: totalDias * dayWidth }} className="relative">

                {/* Header meses */}
                <div className="flex h-8 border-b border-gray-200 bg-gray-50">
                  {meses.map((m, i) => (
                    <div key={i} style={{ width: m.dias * dayWidth, minWidth: m.dias * dayWidth }}
                      className="shrink-0 flex items-center justify-center border-r border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 capitalize">{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* Header dias (semanas) */}
                <div className="flex h-7 border-b border-gray-200 bg-gray-50/80 relative">
                  {Array.from({ length: Math.ceil(totalDias / 7) }).map((_, i) => {
                    const d = new Date(startDate); d.setDate(d.getDate() + i * 7)
                    return (
                      <div key={i} style={{ width: 7 * dayWidth, minWidth: 7 * dayWidth }}
                        className="shrink-0 flex items-center pl-1.5 border-r border-gray-100">
                        <span className="text-[10px] text-gray-400">{d.getDate()}/{d.getMonth() + 1}</span>
                      </div>
                    )
                  })}
                  {/* Linha de hoje */}
                  {todayOffset >= 0 && todayOffset <= totalDias && (
                    <div style={{ left: todayOffset * dayWidth }}
                      className="absolute top-0 bottom-0 w-px bg-red-400 z-20" />
                  )}
                </div>

                {/* Linhas das atividades */}
                {grupos.map(g => (
                  <div key={g.key} className="relative">
                    {/* Linha do grupo (placeholder) */}
                    <div className="h-9 border-b border-blue-50 bg-blue-50/30" />
                    {g.atividades.map(a => {
                      const bar  = barStyle(a.data_inicio_prev, a.data_fim_prev)
                      const cor  = STATUS_COLOR[a.status] ?? STATUS_COLOR.planejada
                      const pct  = a.percentual_exec ?? 0
                      const hoje = today()
                      const atrasada = a.status !== 'concluida' && a.data_fim_prev && a.data_fim_prev < hoje
                      return (
                        <div key={a.id} className="h-10 relative border-b border-gray-100">
                          {/* Linha de grade vertical (semanal) */}
                          {Array.from({ length: Math.ceil(totalDias / 7) }).map((_, i) => (
                            <div key={i} style={{ left: i * 7 * dayWidth }} className="absolute top-0 bottom-0 w-px bg-gray-100" />
                          ))}
                          {/* Linha de hoje */}
                          {todayOffset >= 0 && todayOffset <= totalDias && (
                            <div style={{ left: todayOffset * dayWidth }} className="absolute top-0 bottom-0 w-px bg-red-400/60 z-10" />
                          )}
                          {/* Barra da atividade */}
                          {bar && (
                            <div
                              style={{ left: bar.left + 2, width: Math.max(bar.width - 4, 4), top: 6, height: 28 }}
                              className={clsx('absolute rounded-md shadow-sm group cursor-pointer transition-all hover:brightness-90', atrasada ? 'ring-2 ring-red-500 ring-offset-1' : '', atrasada ? 'bg-red-400' : cor.bar)}
                              title={`${a.nome}\n${a.data_inicio_prev} → ${a.data_fim_prev}\n${pct}% concluído`}
                            >
                              {/* Barra de progresso interna */}
                              <div className="h-full rounded-md bg-black/10" style={{ width: `${pct}%` }} />
                              {/* Label */}
                              {bar.width > 50 && (
                                <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-semibold text-gray-900 truncate drop-shadow">
                                  {a.nome}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nova Atividade ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold">Nova Atividade</h2>
                <p className="text-xs text-gray-400">Veja o impacto no cronograma antes de salvar</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Atividade *</label>
                <input type="text" value={novaAtividade.nome} onChange={e => setNovaAtividade(n => ({ ...n, nome: e.target.value }))}
                  placeholder="Ex.: Concretagem de pilares — Bloco A"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Estrutura + Empreiteiro */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estrutura / Etapa</label>
                  <select value={novaAtividade.estrutura_id} onChange={e => setNovaAtividade(n => ({ ...n, estrutura_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Nenhuma —</option>
                    {estruturas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empreiteiro</label>
                  <select value={novaAtividade.empreiteiro_id} onChange={e => setNovaAtividade(n => ({ ...n, empreiteiro_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Nenhum —</option>
                    {empreiteiros.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
                  </select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início Previsto *</label>
                  <input type="date" value={novaAtividade.data_inicio_prev}
                    onChange={e => setNovaAtividade(n => ({ ...n, data_inicio_prev: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim Previsto *</label>
                  <input type="date" value={novaAtividade.data_fim_prev}
                    onChange={e => setNovaAtividade(n => ({ ...n, data_fim_prev: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Qtd + Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input type="number" value={novaAtividade.quantidade_prev}
                    onChange={e => setNovaAtividade(n => ({ ...n, quantidade_prev: e.target.value }))}
                    placeholder="100"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <input type="text" value={novaAtividade.unidade}
                    onChange={e => setNovaAtividade(n => ({ ...n, unidade: e.target.value }))}
                    placeholder="m², m³, vb..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* ── Preview de impacto ──────────────────────────── */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wide">📊 Impacto no cronograma</p>
                <div className="flex items-center gap-3 text-sm mb-3">
                  <span className="text-gray-600">Duração:</span>
                  <span className="font-bold text-blue-700">{duracaoDias} dias</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{novaAtividade.data_inicio_prev} → {novaAtividade.data_fim_prev}</span>
                </div>

                {/* Mini Gantt preview */}
                {previewBar && (
                  <div className="relative h-8 rounded-lg bg-white border border-blue-200 overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-blue-100/60" />
                      ))}
                    </div>
                    {/* Barras existentes */}
                    {atividades.slice(0, 8).map(a => {
                      const b = barStyle(a.data_inicio_prev, a.data_fim_prev)
                      if (!b) return null
                      const pct = b.left / (totalDias * dayWidth) * 100
                      const wPct = b.width / (totalDias * dayWidth) * 100
                      return (
                        <div key={a.id} className="absolute top-1.5 h-3 rounded-sm bg-gray-300 opacity-50"
                          style={{ left: `${pct}%`, width: `${Math.max(wPct, 0.5)}%` }} />
                      )
                    })}
                    {/* Barra da nova atividade */}
                    <div className="absolute top-1 h-5 rounded-md bg-blue-500 shadow-md"
                      style={{
                        left: `${Math.max(previewBar.left / (totalDias * dayWidth) * 100, 0)}%`,
                        width: `${Math.max(previewBar.width / (totalDias * dayWidth) * 100, 1)}%`,
                      }}>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-900 font-bold truncate px-1">
                        {novaAtividade.nome || 'Nova atividade'}
                      </span>
                    </div>
                    {/* Hoje */}
                    {todayOffset >= 0 && (
                      <div style={{ left: `${todayOffset / totalDias * 100}%` }}
                        className="absolute top-0 bottom-0 w-px bg-red-400" />
                    )}
                  </div>
                )}

                {/* Alertas de conflito */}
                {conflitos.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-700">Sobreposição detectada</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {conflitos.length} atividade{conflitos.length !== 1 ? 's' : ''} deste empreiteiro no mesmo período:
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {conflitos.map(c => (
                            <li key={c.id} className="text-xs text-amber-600">• {c.nome}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm hover:bg-gray-200">Cancelar</button>
              <button onClick={salvar} disabled={saving || !novaAtividade.nome || !novaAtividade.data_inicio_prev || !novaAtividade.data_fim_prev}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Check className="h-4 w-4" />Adicionar ao Cronograma</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
