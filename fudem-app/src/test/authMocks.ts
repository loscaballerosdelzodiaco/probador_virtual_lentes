import type { Session } from '@supabase/supabase-js'

export const fakeSession = {
  access_token: 'token',
  user: { id: '11111111-1111-1111-1111-111111111111' },
} as Session
