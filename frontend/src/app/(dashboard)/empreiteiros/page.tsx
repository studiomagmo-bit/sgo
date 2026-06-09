'use client'
import { useEffect, useState } from 'react'
import { empreiteiros as empreiteirosApi } from '@/lib/sgoApi'
import type { Empreiteiro } from '@/types'
import { Plus, Loader2, HardHat, Phone, Mail, X } from 'lucide-react'
import { toast } from 'sonner'

const FORM_INICIAL = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  responsavel: '',
  telefone: '',
  email: '',
}

export default function EmpreiteirosPage() {
  const [empreiteiros, setEmpreiteiros] = useState<Empreiteiro[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [form, setForm]                 = useState(FORM_INICIAL)

  function carregarLista() {
    setLoading(true)
    empreiteirosApi.listar().then(setEmpreiteiros).finally(() => setLoading(false))
  }

  useEffect(() => {
    carregarLista()
  }, [])

  function abrirModal() {
    setForm(FORM_INICIAL)
    setShowModal(true)
  }

  function fecharModal() {
    if (saving) return
    setShowModal(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.razao_social.trim()) {
      toast.error('Razão social é obrigatória.')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, string> = { razao_social: form.razao_social.trim() }
      if (form.nome_fantasia.trim())  payload.nome_fantasia  = form.nome_fantasia.trim()
      if (form.cnpj.trim())           payload.cnpj           = form.cnpj.trim()
      if (form.responsavel.trim())    payload.responsavel    = form.responsavel.trim()
      if (form.telefone.trim())       payload.telefone       = form.telefone.trim()
      if (form.email.trim())          payload.email          = form.email.trim()

      await empreiteirosApi.criar(payload)
      toast.success('Empreiteiro cadastrado com sucesso!')
      setShowModal(false)
      carregarLista()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao cadastrar empreiteiro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empreiteiros</h1>
          <p className="text-sm text-gray-500 mt-1">{empreiteiros.length} empreiteiro(s) cadastrado(s)</p>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Empreiteiro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : empreiteiros.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
          <HardHat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum empreiteiro cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empreiteiros.map(e => (
            <div key={e.id} className="rounded-xl border bg-white shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                  {(e.nome_fantasia || e.razao_social).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{e.nome_fantasia || e.razao_social}</p>
                  {e.nome_fantasia && <p className="text-xs text-gray-500">{e.razao_social}</p>}
                  {e.cnpj && <p className="text-xs text-gray-400 mt-0.5">CNPJ: {e.cnpj}</p>}
                </div>
                <span className={`ml-auto shrink-0 ${e.ativo ? 'badge-verde' : 'badge-cinza'}`}>
                  {e.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                {e.responsavel && <p className="font-medium text-gray-700">Resp.: {e.responsavel}</p>}
                {e.telefone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>{e.telefone}</p>}
                {e.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>{e.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Novo Empreiteiro ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Novo Empreiteiro</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Razão Social */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="razao_social"
                  value={form.razao_social}
                  onChange={handleChange}
                  required
                  placeholder="Ex.: Construtora Silva Ltda"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nome Fantasia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  name="nome_fantasia"
                  value={form.nome_fantasia}
                  onChange={handleChange}
                  placeholder="Ex.: Silva Construções"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* CNPJ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0001-00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                <input
                  type="text"
                  name="responsavel"
                  value={form.responsavel}
                  onChange={handleChange}
                  placeholder="Nome do responsável"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Telefone e E-mail lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="contato@empresa.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
