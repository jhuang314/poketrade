import { createClient } from "@supabase/supabase-js";

/**
 * Creates and returns a Supabase client configured for admin-level server-side operations.
 *
 * This function is designed to be called within API route handlers or other server-side functions.
 * It ensures that the client is initialized with the necessary environment variables at runtime,
 * which avoids Next.js build-time errors that can occur when environment variables
 * are not available during the static analysis phase.
 *
 * @returns An instance of the Supabase client authenticated with the service role key.
 * @throws {Error} If the `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
 * environment variables are not set. This provides a clear failure signal for
 * misconfigured environments at runtime.
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing required Supabase environment variables for admin client.",
    );
  }

  // Initialize and return the client.
  // The Supabase JS client is lightweight and can be instantiated within a function
  // without significant performance overhead for typical serverless function executions.
  return createClient(supabaseUrl, supabaseServiceKey);
}
