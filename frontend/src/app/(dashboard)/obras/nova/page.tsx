'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { obras as obrasApi } from '@/lib/sgoApi'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import Link from 'next/link'

const UF = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function NovaObraPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    tipo: 'vertical',
    descricao: '',
    endereco: '',
    cidade: '',
    estado: 'SP',
    area_total: '',
    data_inicio: '',
    data_fim_prev: '',
    status: 'planejamento',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Nome da obra é obrigatório.'); return }
    setSaving(true)
    try {
      const payload: any = {
        nome:        form.nome.trim(),
        tipo:        form.tipo,
        status:      form.status,
        descricao:   form.descricao || null,
        endereco:    form.endereco  || null,
        cidade:      form.cidade    || null,
        estado:      form.estado    || null,
        area_total:  form.area_total ? Number(form.area_total) : null,
        data_inicio: form.data_inicio  || null,
        data_fim_prev: form.data_fim_prev || null,
        ativa: true,
      }
      await obrasApi.criar(payload)
      toast.success('Obra cadastrada com sucesso!')
      router.replace('/obras')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao cadastrar obra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/obras" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Nova Obra</h1>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Obra <span className="text-red-500">*</span>
          </label>
          <input
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            required
            placeholder="Ex: Residencial Alfa — Torre A"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tipo + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
              <option value="avulsa">Avulsa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planejamento">Planejamento</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="pausada">Pausada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={e => set('descricao', e.target.value)}
            rows={3}
            placeholder="Descrição geral da obra..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input
            value={form.endereco}
            onChange={e => set('endereco', e.target.value)}
            placeholder="Rua, número, bairro..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cidade + Estado */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              value={form.cidade}
              onChange={e => set('cidade', e.target.value)}
              placeholder="São Paulo"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={e => set('estado', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {UF.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        {/* Área + Datas */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área total (m²)</label>
            <input
              type="number"
              min="0"
              value={form.area_total}
              onChange={e => set('area_total', e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
            <input
              type="date"
              value={form.data_inicio}
              onChange={e => set('data_inicio', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de entrega</label>
            <input
              type="date"
              value={form.data_fim_prev}
              onChange={e => set('data_fim_prev', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <Link
            href="/obras"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Cadastrar Obra'}
          </button>
        </div>
      </form>
    </div>
  )
}
