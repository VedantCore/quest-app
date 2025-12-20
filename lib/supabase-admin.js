import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Fallback to anon key to prevent build crash, but warn user
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Admin actions will fail.'
  );
}

// Ensure we have at least some key to prevent createClient from throwing
const keyToUse = supabaseServiceRoleKey || 'fallback-key-to-prevent-crash';

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  keyToUse,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
