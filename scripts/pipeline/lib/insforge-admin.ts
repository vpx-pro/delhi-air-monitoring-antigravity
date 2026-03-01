import { createClient } from '@insforge/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

export const insforge = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL!,
  anonKey: process.env.INSFORGE_ANON_KEY!,
});

export const INSFORGE_BASE_URL = process.env.INSFORGE_BASE_URL!;
export const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY!;
