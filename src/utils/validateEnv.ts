export function validateEnvironmentVariables(): void {
  const requiredEnvs = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'DATABASE_URL',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'USER_JWT_SECRET',
    'ADMIN_JWT_SECRET',
  ];

  const recommendedEnvs: { key: string; reason: string }[] = [
    {
      key: 'ROBLOX_SECURITY_COOKIE',
      reason:
        'Tanpa ini, fitur autocomplete username Roblox menggunakan mode terbatas ' +
        '(hanya exact match, tanpa full-text search).',
    },
    {
      key: 'USER_JWT_EXPIRES_IN',
      reason: 'Default: 7d. Atur sesuai kebutuhan.',
    },
    {
      key: 'ADMIN_JWT_EXPIRES_IN',
      reason: 'Default: 8h. Atur sesuai kebutuhan.',
    },
    {
      key: 'RESEND_API_KEY',
      reason: 'Tanpa ini, email akan di-log ke terminal (mode placeholder). Isi dengan API key dari Resend.',
    },
    {
      key: 'RESEND_FROM_EMAIL',
      reason: 'Default: "El TopUp <noreply@eltopup.id>".',
    },
  ];

  const missingRequired: string[] = [];

  for (const envVar of requiredEnvs) {
    if (!process.env[envVar]) {
      if (envVar === 'USER_JWT_SECRET' && process.env.JWT_SECRET) {
        continue;
      }
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

  for (const { key, reason } of recommendedEnvs) {
    if (!process.env[key]) {
      console.warn(`⚠️  [ENV] ${key} tidak di-set. ${reason}`);
    }
  }

  console.warn(
    '⚠️  [BOT] Cookie bot Roblox dibaca dari database (SystemConfig). ' +
    'Pastikan sudah diisi melalui dashboard admin (/admin-ui/settings.html).',
  );
}
