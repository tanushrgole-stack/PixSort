import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMockClient } from "./mock-db";

/**
 * Server-side Supabase client using the Service Role key.
 * Only used in API routes — never expose this key to the browser.
 * Falls back to an in-memory mock client for local development
 * if Supabase credentials are not provided.
 */
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !key ||
    url.includes("your-project") ||
    url.includes("placeholder")
  ) {
    return createMockClient() as unknown as SupabaseClient;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
