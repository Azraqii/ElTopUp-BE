/**
 * Validates that all required environment variables are set.
 * Throws an error with a clear message if any are missing.
 */
export function validateEnvironmentVariables(): void {
  // ── Wajib ada — server tidak bisa jalan tanpa ini ──────────────────────────
  const requiredEnvs = [
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'ROBUXSHIP_API_KEY',
  ];

  // ── Opsional tapi sangat dianjurkan ────────────────────────────────────────
  const recommendedEnvs: { key: string; reason: string }[] = [
    {
      key: 'ROBLOX_SECURITY_COOKIE',
      reason:
        'Tanpa ini, fitur autocomplete username Roblox menggunakan mode terbatas ' +
        '(hanya exact match, tanpa full-text search). ' +
        'Isi dengan cookie .ROBLOSECURITY dari akun Roblox mana saja (read-only, aman dari ban).',
    },
  ];

  const missingRequired: string[] = [];

  for (const envVar of requiredEnvs) {
    if (!process.env[envVar]) {
      missingRequired.push(envVar);
    }
  }

  if (missingRequired.length > 0) {
    const missingList = missingRequired.map((e) => `  - ${e}`).join('\n');
    throw new Error(
      `❌ FATAL: Missing required environment variables:\n${missingList}\n\n` +
        `Please set these variables in your .env file or Vercel Project Settings.`,
    );
  }

  console.log('✅ All required environment variables are configured.');

  // ── Warning untuk env opsional yang tidak di-set ───────────────────────────
  for (const { key, reason } of recommendedEnvs) {
    if (!process.env[key]) {
      console.warn(`⚠️  [ENV] ${key} tidak di-set. ${reason}`);
    }
  }
}