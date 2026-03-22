function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

// Validate on first import — fails fast if anything is missing
export const env = {
  DATABASE_URL: requiredEnv('DATABASE_URL'),
  AUTH_SECRET: requiredEnv('AUTH_SECRET'),
  NEXTAUTH_URL: optionalEnv('NEXTAUTH_URL', 'http://localhost:3000'),
  GOOGLE_MAPS_API_KEY: optionalEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
} as const;
