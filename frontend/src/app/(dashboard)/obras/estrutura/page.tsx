'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Building2,
  Layers,
  Home,
  FlipVertical,
  Grid3X3,
  Wrench,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { estruturaObra, obras } from '@/lib/sgoApi'
import type { EstruturaObra, TipoEstrutura, Obra } from '@/types'

// ─── Configurações por tipo ────────────────────────────────────────────────────

const TIPO_CONFIG: Record<
  TipoEstrutura,
  { label: string; cor: string; bg: string; borda: string; icone: React.ReactNode }
> = {
  setor: {
    label: 'Setor',
    cor: 'text-blue-700',
    bg: 'bg-blue-50',
    borda: 'border-blue-200',
    icone: <Grid3X3 className="w-4 h-4 text-blue-600" />,
  },
  bloco: {
    label: 'Bloco',
    cor: 'text-purple-700',
    bg: 'bg-purple-50',
    borda: 'border-purple-200',
    icone: <Building2 className="w-4 h-4 text-purple-600" />,
  },
  torre: {
    label: 'Torre',
    cor: 'text-orange-700',
    bg: 'bg-orange-50',
    borda: 'border-orange-200',
    icone: <Layers className="w-4 h-4 text-orange-600" />,
  },
  pavimento: {
    label: 'Pavimento',
    cor: 'text-green-700',
    bg: 'bg-green-50',
    borda: 'border-green-200',
    icone: <FlipVertical className="w-4 h-4 text-green-600" />,
  },
  unidade: {
    label: 'Unidade',
    cor: 'text-yellow-700',
    bg: 'bg-yellow-50',
    borda: 'border-yellow-200',
    icone: <Home className="w-4 h-4 text-yellow-600" />,
  },
  servico_avulso: {
    label: 'Serviço Avulso',
    cor: 'text-gray-700',
    bg: 'bg-gray-50',
    borda: 'border-gray-200',
    icone: <Wrench className="w-4 h-4 text-gray-600" />,
  },
}

const TIPOS_ORDENADOS: TipoEstrutura[] = [
  'setor',
  'bloco',
  'torre',
  'pavimento',
  'unidade',
  'servico_avulso',
]

// ─── Construção da árvore ──────────────────────────────────────────────────────

function buildTree(
  nodes: EstruturaObra[],
  parentId: string | null = null
): EstruturaObra[] {
  return nodes
    .filter((n) => (n.parent_id ?? null) === parentId)
    .sort((a, b) => a.ordem - b.ordem)
    .map((n) => ({ ...n, filhos: buildTree(nodes, n.id) }))
}

// ─── Componente de nó ──────────────────────────────────────────────────────────

interface NoEstruturaProps {
  no: EstruturaObra
  nivel: number
  onAddFilho: (parentId: string) => void
  onDelete: (id: string, nome: string) => void
}

function NoEstrutura({ no, nivel, onAddFilho, onDelete }: NoEstruturaProps) {
  const [expandido, setExpandido] = useState(true)
  const cfg = TIPO_CONFIG[no.tipo]
  const temFilhos = (no.filhos?.length ?? 0) > 0

  return (
    <div className={nivel > 0 ? 'ml-6' : ''}>
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border ${cfg.bg} ${cfg.borda} mb-2 group`}
      >
        {/* Botão expand/colapsar */}
        <button
          onClick={() => setExpandido((v) => !v)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
          aria-label={expandido ? 'Colapsar' : 'Expandir'}
        >
          {temFilhos ? (
            expandido ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Ícone do tipo */}
        <span className="flex-shrink-0">{cfg.icone}</span>

        {/* Informações do nó */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${cfg.cor}`}>{no.nome}</span>
            {no.codigo && (
              <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono">
                {no.codigo}
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.cor} border ${cfg.borda}`}
            >
              {cfg.label}
            </span>
            {no.area != null && no.area > 0 && (
              <span className="text-xs text-gray-500">{no.area} m²</span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddFilho(no.id)}
            title="Adicionar filho"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Filho
          </button>
          <button
            onClick={() => onDelete(no.id, no.nome)}
            title="Excluir nó"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filhos */}
      {expandido && temFilhos && (
        <div className="relative">
          {/* Linha vertical de conexão */}
          <div className="absolute left-2 top-0 bottom-2 w-px bg-gray-200" />
          <div className="ml-3">
            {no.filhos!.map((filho) => (
              <NoEstrutura
                key={filho.id}
                no={filho}
                nivel={nivel + 1}
                onAddFilho={onAddFilho}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal de adição ──────────────────────────────────────────────────────────

interface ModalAdicionarProps {
  obraId: string
  parentId: string | null
  parentNome?: string
  tipoInicial?: TipoEstrutura
  onClose: () => void
  onSaved: () => void
}

function ModalAdicionar({
  obraId,
  parentId,
  parentNome,
  tipoInicial = 'setor',
  onClose,
  onSaved,
}: ModalAdicionarProps) {
  const [tipo, setTipo] = useState<TipoEstrutura>(tipoInicial)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [area, setArea] = useState('')
  const [emLote, setEmLote] = useState(false)
  const [quantidade, setQuantidade] = useState(2)
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    if (!nome.trim()) {
      toast.error('O campo "Nome" é obrigatório.')
      return
    }
    setSalvando(true)
    try {
      if (emLote && quantidade >= 2) {
        // Geração em lote com zero-padding
        const digits = quantidade.toString().length > 2 ? quantidade.toString().length : 2
        const promises = Array.from({ length: quantidade }, (_, i) => {
          const num = String(i + 1).padStart(digits, '0')
          return estruturaObra.criar({
            obra_id: obraId,
            parent_id: parentId ?? null,
            tipo,
            nome: `${nome.trim()} ${num}`,
            codigo: codigo.trim() || null,
            area: area ? parseFloat(area) : null,
            ordem: i,
          })
        })
        await Promise.all(promises)
        toast.success(`${quantidade} nós criados com sucesso!`)
      } else {
        await estruturaObra.criar({
          obra_id: obraId,
          parent_id: parentId ?? null,
          tipo,
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          area: area ? parseFloat(area) : null,
          ordem: 0,
        })
        toast.success('Nó adicionado com sucesso!')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar nó.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adicionar Nó</h2>
            {parentNome && (
              <p className="text-sm text-gray-500 mt-0.5">
                Filho de: <span className="font-medium text-gray-700">{parentNome}</span>
              </p>
            )}
            {!parentNome && (
              <p className="text-sm text-gray-500 mt-0.5">Nó raiz da estrutura</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEstrutura)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIPOS_ORDENADOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={emLote ? 'Ex: Casa, Apartamento, Pavimento...' : 'Nome do nó'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {emLote && nome.trim() && (
              <p className="text-xs text-gray-500 mt-1">
                Será gerado: <span className="font-mono text-blue-600">{nome.trim()} 01</span>,{' '}
                <span className="font-mono text-blue-600">{nome.trim()} 02</span>
                {quantidade > 2 && (
                  <>
                    , ...{' '}
                    <span className="font-mono text-blue-600">
                      {nome.trim()} {String(quantidade).padStart(2, '0')}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Código e Área lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: BL-01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área m² <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex: 72.5"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Geração em lote */}
          <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emLote}
                onChange={(e) => setEmLote(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Gerar em lote</span>
              <span className="text-xs text-gray-500">
                — cria múltiplos nós numerados automaticamente
              </span>
            </label>
            {emLote && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(2, parseInt(e.target.value) || 2))}
                  min={2}
                  max={999}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {emLote ? `Criar ${quantidade} nós` : 'Adicionar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

function EstruturaObraPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const obraId = searchParams.get('id') ?? ''

  const [obra, setObra] = useState<Obra | null>(null)
  const [nos, setNos] = useState<EstruturaObra[]>([])
  const [arvore, setArvore] = useState<EstruturaObra[]>([])
  const [carregando, setCarregando] = useState(true)

  // Modal state
  const [modalAberto, setModalAberto] = useState(false)
  const [parentIdModal, setParentIdModal] = useState<string | null>(null)
  const [parentNomeModal, setParentNomeModal] = useState<string | undefined>(undefined)
  const [tipoModalInicial, setTipoModalInicial] = useState<TipoEstrutura>('setor')

  // Flat map para lookup de nome por id
  const nosMap = useCallback(
    (id: string) => nos.find((n) => n.id === id),
    [nos]
  )

  const carregar = useCallback(async () => {
    if (!obraId) return
    setCarregando(true)
    try {
      const [dadosObra, dadosNos] = await Promise.all([
        obras.detalhar(obraId),
        estruturaObra.listar(obraId),
      ])
      setObra(dadosObra)
      setNos(dadosNos)
      setArvore(buildTree(dadosNos))
    } catch (err: any) {
      toast.error('Erro ao carregar estrutura da obra.')
    } finally {
      setCarregando(false)
    }
  }, [obraId])

  useEffect(() => {
    if (!obraId) {
      toast.error('ID da obra não informado.')
      router.push('/obras')
      return
    }
    carregar()
  }, [obraId, carregar, router])

  function abrirModalRaiz() {
    setParentIdModal(null)
    setParentNomeModal(undefined)
    setTipoModalInicial('setor')
    setModalAberto(true)
  }

  function abrirComTipo(tipo: TipoEstrutura) {
    setParentIdModal(null)
    setParentNomeModal(undefined)
    setTipoModalInicial(tipo)
    setModalAberto(true)
  }

  function abrirModalFilho(parentId: string) {
    const no = nosMap(parentId)
    setParentIdModal(parentId)
    setParentNomeModal(no?.nome)
    setTipoModalInicial('setor')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setParentIdModal(null)
    setParentNomeModal(undefined)
  }

  async function handleDelete(id: string, nome: string) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir "${nome}"?\n\nATENÇÃO: Todos os nós filhos também serão excluídos.`
    )
    if (!confirmar) return
    try {
      await estruturaObra.excluir(id)
      toast.success(`"${nome}" excluído com sucesso.`)
      carregar()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao excluir nó.')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/obras/detail?id=${obraId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Estrutura da Obra
            </h1>
            {obra && (
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-medium text-gray-700">{obra.nome}</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={abrirModalRaiz}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Raiz
        </button>
      </div>

      {/* ── Atalhos de criação rápida de nó raiz ── */}
      <div>
        <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">
          Adicionar nó raiz:
        </p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ORDENADOS.map((t) => {
            const cfg = TIPO_CONFIG[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => abrirComTipo(t)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium cursor-pointer hover:shadow-md hover:scale-105 transition-all ${cfg.bg} ${cfg.cor} ${cfg.borda}`}
              >
                {cfg.icone}
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Árvore ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {arvore.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhuma estrutura cadastrada.</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em{' '}
              <span className="font-semibold text-blue-600">+ Adicionar Raiz</span> para
              começar a montar a hierarquia da obra.
            </p>
            <button
              onClick={abrirModalRaiz}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Adicionar primeiro nó
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {arvore.map((no) => (
              <NoEstrutura
                key={no.id}
                no={no}
                nivel={0}
                onAddFilho={abrirModalFilho}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Contador ── */}
      {nos.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {nos.length} {nos.length === 1 ? 'nó cadastrado' : 'nós cadastrados'}
        </p>
      )}

      {/* ── Modal ── */}
      {modalAberto && (
        <ModalAdicionar
          obraId={obraId}
          parentId={parentIdModal}
          parentNome={parentNomeModal}
          tipoInicial={tipoModalInicial}
          onClose={fecharModal}
          onSaved={() => {
            fecharModal()
            carregar()
          }}
        />
      )}
    </div>
  )
}

// ─── Wrapper com Suspense (necessário para useSearchParams) ───────────────────

export default function EstruturaObraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <EstruturaObraPageInner />
    </Suspense>
  )
}
