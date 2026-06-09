import { createClient } from '@supabase/supabase-js'

// Fallback evita "supabaseUrl is required" durante next build no CI.
// Em produção as variáveis NEXT_PUBLIC_* são lidas pelo browser.
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://placeholder.supabase.co'
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Cliente principal — usado pelo gestor (dashboard)
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Cliente separado para criar contas de empreiteiro sem deslogar o gestor
// Usa storageKey diferente → sessões isoladas no localStorage
export const supabaseSignup = createClient(supabaseUrl, supabaseAnon, {
  auth: { storageKey: 'sgo_signup_temp', persistSession: false },
})

// Cliente para o Portal do Empreiteiro (sessão isolada)
export const supabasePortal = createClient(supabaseUrl, supabaseAnon, {
  auth: { storageKey: 'sgo_portal_session', persistSession: true },
})
