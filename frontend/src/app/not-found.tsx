'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// GitHub Pages serve este componente para caminhos não encontrados.
// Redireciona para o dashboard para manter o SPA funcional.
export default function NotFound() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}
