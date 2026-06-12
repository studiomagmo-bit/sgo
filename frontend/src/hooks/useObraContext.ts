'use client'
import { useEffect, useState, useCallback } from 'react'
import { obras as obrasApi } from '@/lib/sgoApi'
import { useAuth } from '@/contexts/auth'

const PERFIS_RESTRITOS = ['engenheiro', 'mestre', 'pcp', 'almoxarife']

interface ObraContext {
  obras:       any[]
  obraId:      string
  setObraId:   (id: string) => void
  isRestrito:  boolean
  loading:     boolean
}

export function useObraContext(defaultId = ''): ObraContext {
  const { user } = useAuth()
  const perfil     = (user as any)?.perfil ?? 'engenheiro'
  const isRestrito = PERFIS_RESTRITOS.includes(perfil)

  const [obras, setObras]     = useState<any[]>([])
  const [obraId, setObraId]   = useState(defaultId)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obrasApi.listar().then(obs => {
      setObras(obs)
      if (obs.length >= 1 && (!obraId || isRestrito)) {
        setObraId(obs[0].id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [isRestrito]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetObraId = useCallback((id: string) => {
    if (isRestrito) return  // engenheiro não pode trocar
    setObraId(id)
  }, [isRestrito])

  return { obras, obraId, setObraId: handleSetObraId, isRestrito, loading }
}
