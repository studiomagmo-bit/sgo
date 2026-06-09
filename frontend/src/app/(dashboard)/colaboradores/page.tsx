'use client'
import { useState, useEffect } from 'react'
import { colaboradores as colaboradoresApi, empreiteiros as empreiteirosApi } from '@/lib/sgoApi'
import {
  Users, Plus, Pencil, Trash2, Phone, CreditCard,
  HardHat, ChevronDown, ChevronRight, X, Check,
} from 'lucide-react'

const FUNCOES = ['Pedreiro', 'Servente', 'Carpinteiro', 'Eletricista', 'Encanador',
  'Pintor', 'Armador', 'Operador de Máquina', 'Mestre de Obras', 'Encarregado', 'Outro']

type Colaborador = {
  id: string
  empreiteiro_id: string
  nome: string
  cpf?: string
  funcao?: string
  telefone?: string
  ativo: boolean
  empreiteiros?: { razao_social: string }
}
type Empreiteiro = { id: string; razao_social: string }

const EMPTY = { nome: '', cpf: '', funcao: '', telefone: '', empreiteiro_id: '' }

export default function ColaboradoresPage() {
  const [lista, setLista] = useState<Colaborador[]>([])
  const [listaEmp, setListaEmp] = useState<Empreiteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})

  // Modal
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Colaborador | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [salvando, setSalvando] = useState(false)

  // Excluir
  const [excluindo, setExcluindo] = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [cols, emps] = await Promise.all([
        colaboradoresApi.listar(),
        empreiteirosApi.listar(),
      ])
      setLista(cols)
      setListaEmp(emps)
      // Abre todos os grupos por padrão
      const ab: Record<string, boolean> = {}
      emps.forEach((e: Empreiteiro) => { ab[e.id] = true })
      setAbertos(ab)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  function abrirNovo(empreiteiro_id?: string) {
    setEditando(null)
    setForm({ ...EMPTY, empreiteiro_id: empreiteiro_id ?? listaEmp[0]?.id ?? '' })
    setModal(true)
  }

  function abrirEditar(c: Colaborador) {
    setEditando(c)
    setForm({
      nome: c.nome,
      cpf: c.cpf ?? '',
      funcao: c.funcao ?? '',
      telefone: c.telefone ?? '',
      empreiteiro_id: c.empreiteiro_id,
    })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      if (editando) {
        await colaboradoresApi.atualizar(editando.id, form)
      } else {
        await colaboradoresApi.criar(form)
      }
      setModal(false)
      await carregar()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Desativar este colaborador?')) return
    setExcluindo(id)
    try {
      await colaboradoresApi.excluir(id)
      await carregar()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setExcluindo(null)
    }
  }

  // Agrupa colaboradores por empreiteiro
  const grupos = listaEmp.map(emp => ({
    ...emp,
    colaboradores: lista.filter(c => c.empreiteiro_id === emp.id),
  }))

  const totalGeral = lista.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Colaboradores</h1>
          <p className="text-slate-400 text-sm mt-1">
            Mão de obra cadastrada por empreiteiro · {totalGeral} ativo{totalGeral !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => abrirNovo()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Novo Colaborador
        </button>
      </div>

      {erro && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300 text-sm">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">Carregando...</div>
      ) : listaEmp.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-10 text-center">
          <HardHat className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum empreiteiro cadastrado.</p>
          <p className="text-slate-500 text-sm mt-1">Cadastre empreiteiros primeiro para adicionar colaboradores.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(grupo => (
            <div key={grupo.id} className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
              {/* Header do grupo */}
              <button
                onClick={() => setAbertos(a => ({ ...a, [grupo.id]: !a[grupo.id] }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/50 border border-blue-700/40">
                    <HardHat className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">{grupo.razao_social}</p>
                    <p className="text-xs text-slate-400">
                      {grupo.colaboradores.length} colaborador{grupo.colaboradores.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); abrirNovo(grupo.id) }}
                    className="flex items-center gap-1 rounded-md bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 px-3 py-1 text-xs text-blue-300"
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                  {abertos[grupo.id]
                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 text-slate-400" />
                  }
                </div>
              </button>

              {/* Colaboradores do grupo */}
              {abertos[grupo.id] && (
                <div className="border-t border-slate-700">
                  {grupo.colaboradores.length === 0 ? (
                    <p className="px-5 py-4 text-slate-500 text-sm">
                      Nenhum colaborador cadastrado para este empreiteiro.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-700/60">
                      {grupo.colaboradores.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/20">
                          <div className="flex items-center gap-3">
                            {/* Avatar inicial */}
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                              {c.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{c.nome}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {c.funcao && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    <Users className="h-3 w-3" />{c.funcao}
                                  </span>
                                )}
                                {c.cpf && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <CreditCard className="h-3 w-3" />{c.cpf}
                                  </span>
                                )}
                                {c.telefone && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <Phone className="h-3 w-3" />{c.telefone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => abrirEditar(c)}
                              className="rounded-md p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => excluir(c.id)}
                              disabled={excluindo === c.id}
                              className="rounded-md p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/30 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">
                {editando ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Empreiteiro */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Empreiteiro *</label>
                <select
                  value={form.empreiteiro_id}
                  onChange={e => setForm(f => ({ ...f, empreiteiro_id: e.target.value }))}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecionar...</option>
                  {listaEmp.map(e => (
                    <option key={e.id} value={e.id}>{e.razao_social}</option>
                  ))}
                </select>
              </div>
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: João da Silva"
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              {/* Função */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Função</label>
                <select
                  value={form.funcao}
                  onChange={e => setForm(f => ({ ...f, funcao: e.target.value }))}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecionar função...</option>
                  {FUNCOES.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              {/* CPF + Telefone lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">CPF</label>
                  <input
                    value={form.cpf}
                    onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome.trim() || !form.empreiteiro_id}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : <><Check className="h-4 w-4" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
