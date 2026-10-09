import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const SESSION_ERROR_MESSAGE =
  'No pudimos validar tu sesión. Inténtalo de nuevo en unos momentos.'

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(SESSION_ERROR_MESSAGE, { cause: error })
  }

  return data.session
}

export function subscribeToAuthChanges(
  onSession: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onSession(session)
  })

  return () => {
    subscription.unsubscribe()
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(SESSION_ERROR_MESSAGE, { cause: error })
  }
}
