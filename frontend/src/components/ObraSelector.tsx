'use client'
import { Building2 } from 'lucide-react'

interface Props {
  obras: any[]
  obraId: string
  setObraId: (id: string) => void
  isRestrito: boolean
  className?: string
}

/**
 * Seletor de obra unificado:
 * - Gestor: dropdown para escolher qualquer obra
 * - Engenheiro/mestre: label estático com a obra vinculada (sem dropdown)
 */
export function ObraSelector({ obras, obraId, setObraId, isRestrito, className = '' }: Props) {
  if (isRestrito) {
    const obra = obras.find(o => o.id === obraId) ?? obras[0]
    if (!obra) return null
    return (
      <div className={`flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 ${className}`}>
        <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-sm font-semibold text-blue-800">{obra.nome}</span>
      </div>
    )
  }

  return (
    <select
      value={obraId}
      onChange={e => setObraId(e.target.value)}
      className={`select min-w-[200px] ${className}`}
    >
      <option value="">Selecione uma obra...</option>
      {obras.map(o => (
        <option key={o.id} value={o.id}>{o.nome}</option>
      ))}
    </select>
  )
}
