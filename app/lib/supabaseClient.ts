import { createClient } from '@supabase/supabase-js'

console.log({
    pUrl: import.meta.env.VITE_SUPABASE_URL,
    pAnon: import.meta.env.VITE_SUPABASE_ANON
})
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON!)
