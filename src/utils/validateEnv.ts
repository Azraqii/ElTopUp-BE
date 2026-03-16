/**
 * Validates that all required environment variables are set.
 * Throws an error with a clear message if any are missing.
 */
export function validateEnvironmentVariables(): void {
  const requiredEnvs = [
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'ROBUXSHIP_API_KEY',
  ];

  const missingEnvs: string[] = [];

  for (const envVar of requiredEnvs) {
    if (!process.env[envVar]) {
      missingEnvs.push(envVar);
    }
  }

  if (missingEnvs.length > 0) {
    const missingList = missingEnvs.map((e) => `  - ${e}`).join('\n');
    throw new Error(
      `❌ FATAL: Missing required environment variables:\n${missingList}\n\n` +
      `Please set these variables in your .env file or Vercel Project Settings.`,
    );
  }

  console.log('✅ All required environment variables are configured.');
}
