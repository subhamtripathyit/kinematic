import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cloud (Supabase) connection. Turned on only when both keys are set in `.env`
 * (or in Vercel's environment settings). Without them the app works exactly as
 * before: no login, data stays in this browser.
 *
 * The key here is the public "anon" / "publishable" key — safe in the app because
 * row-level security in the database decides what each user can see.
 * NEVER put the service_role / secret key in the app.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = Boolean(url && key);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
