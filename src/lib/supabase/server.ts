import { createClient as createInsforgeClient } from '@insforge/sdk';

// Insforge client for server-side usage
export async function createClient() {
  return createInsforgeClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY!,
  });
}
