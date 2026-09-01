import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://djayvkuhcohtoetigmrd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYXl2a3VoY29odG9ldGlnbXJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODI2NzQwNywiZXhwIjoyMTAzODQzNDA3fQ.uUu-GrRVSVV_xwExnxeNJ5g1wxsJm38xmL5Lh8AuxNc';

async function testConnection() {
  console.log('\x1b[34m[INFO] Testing live Supabase Client JS connection...\x1b[0m');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const start = Date.now();
  const { data, error } = await supabase.from('guilds').select('id', { count: 'exact' });

  if (error) {
    console.error('\x1b[31m[ERROR] Supabase client query failed:\x1b[0m', error);
    process.exit(1);
  }

  const latency = Date.now() - start;
  console.log(`\x1b[32m[SUCCESS] Supabase Client JS connected successfully! Latency: ${latency}ms\x1b[0m`);
  console.log(`\x1b[32m[SUCCESS] Table 'guilds' query returned ${data.length} records.\x1b[0m`);
}

testConnection();
