'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '@/contexts/portalAuth'
import { portalApi } from '@/lib/sgoApi'
import {
  Users, Plus, X, Check, Loader2, HardHat,
  Phone, CreditCard, Building2, GitBranch, Calendar, LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { toast } from 'sonner'

const FUNCOES = [
  'Pedreiro','Servente','Carpinteiro','Eletricista','Encanador',
  'Pintor','Armador','Operador de Máquina','Mestre de Obras',
  'Encarregado','Azulejista','Gesseiro','Outro',
]
const FORM_I = { nome:'', cpf:'', funcao:'Pedreiro', telefone:'' }

export default function ColaboradoresPortalPage() {
  const { portalUser, loadingPortal, logoutPortal } = usePortalAuth()
  const router = useRouter()
  const [colab, setColab]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]         = useState(FORM_I)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!loadingPortal && !portalUser) router.replace('/portal/login')
  }, [loadingPortal, portalUser, router])

  const carregar = () => {
    if (!portalUser) return
    setLoading(true)
    portalApi.meusColaboradores(portalUser.empreiteiro_id)
      .then(setColab).finally(() => setLoading(false))
  }
  useEffect(() => { if (portalUser) carregar() }, [portalUser]) // eslint-disable-line

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      await portalApi.criarColaborador({
        empreiteiro_id: portalUser!.empreiteiro_id,
        construtora_id: portalUser!.construtora_id,
        nome: form.nome.trim(), cpf: form.cpf.trim() || undefined,
        funcao: form.funcao, telefone: form.telefone.trim() || undefined,
      })
      toast.success('Colaborador cadastrado!')
      setShowModal(false); setForm(FORM_I); carregar()
    } catch (err: any) { toast.error(err?.message ?? 'Erro') }
    finally { setSaving(false) }
  }

  if (loadingPortal || !portalUser) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )

  const nomeEmp = portalUser.empreiteiros?.nome_fantasia || portalUser.empreiteiros?.razao_social

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <HardHat className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900">{nomeEmp}</p>
          </div>
          <button onClick={() => { logoutPortal(); router.replace('/portal/login') }}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <div className="pt-16 pb-24 max-w-2xl mx-auto px-4">
        <div className="py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Minha Equipe</h1>
            <p className="text-sm text-gray-500">{colab.length} colaborador(es) cadastrado(s)</p>
          </div>
          <button onClick={() => { setForm(FORM_I); setShowModal(true) }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : colab.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">Nenhum colaborador cadastrado</p>
            <p className="text-gray-400 text-xs mt-1">Adicione sua equipe para registrar presença diária</p>
          </div>
        ) : (
          <div className="space-y-2">
            {colab.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                  {c.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{c.funcao}</span>
                    {c.cpf && <span className="flex items-center gap-1 text-xs text-gray-400"><CreditCard className="h-3 w-3" />{c.cpf}</span>}
                  </div>
                </div>
                {c.telefone && (
                  <a href={`tel:${c.telefone}`} className="shrink-0 p-2 rounded-xl bg-gray-50 hover:bg-blue-50">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Novo Colaborador</h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              {[
                { key:'nome', label:'Nome completo *', placeholder:'Ex.: João Silva', required:true },
                { key:'cpf',  label:'CPF',             placeholder:'000.000.000-00',  required:false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="text" required={f.required} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Função *</label>
                <div className="grid grid-cols-2 gap-2">
                  {FUNCOES.map(f => (
                    <button key={f} type="button" onClick={() => setForm(p => ({ ...p, funcao: f }))}
                      className={clsx('rounded-xl border px-3 py-2 text-sm text-left transition-all',
                        form.funcao === f
                          ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 bg-gray-50 text-gray-600')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 text-sm text-gray-700">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {[
          { href:'/portal/home',         icon:Building2, label:'Início' },
          { href:'/portal/atividades',    icon:GitBranch, label:'Atividades' },
          { href:'/portal/colaboradores', icon:Users,     label:'Equipe' },
          { href:'/portal/presenca',      icon:Calendar,  label:'Presença' },
        ].map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={clsx('flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                item.href.includes('colaboradores') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600')}>
              <Icon className="h-5 w-5" />{item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
