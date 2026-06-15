'use client'
import { useEffect, useState, useCallback } from 'react'
import { obras as obrasApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'

const RESTRITOS = ['engenheiro','mestre','pcp','almoxarife']

export function useObraContext(initialId = '') {
  const { user } = useAuth()
  const isRestrito = RESTRITOS.includes((user as any)?.perfil ?? '')

  const [obras, setObras]     = useState<any[]>([])
  const [obraId, _setObraId] = useState(initialId)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      // Perfil restrito: força a obra única, não permite escolha
      if (isRestrito && obs.length >= 1) {
        _setObraId(obs[0].id)
      }
    }).finally(() => setLoading(false))
  }, [isRestrito])

  const setObraId = useCallback((id: string) => {
    if (isRestrito) return  // engenheiro não pode trocar
    _setObraId(id)
  }, [isRestrito])

  return { obras, obraId, setObraId, isRestrito, loading }
}
