import { PortalAuthProvider } from '@/contexts/portalAuth'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthProvider>
      {children}
    </PortalAuthProvider>
  )
}
