import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config({ override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5001'),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }).min(1),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(8, 'JWT_SECRET should be at least 8 characters long'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('80'),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error('FATAL: Invalid environment variables configuration:', result.error.format());
    const missingOrInvalid = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Environment variable validation failed:\n${missingOrInvalid}\n`);
    process.exit(1);
  }

  if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET === 'your_super_secret_key_here') {
    logger.error('FATAL: JWT_SECRET cannot be left as the default development value in production');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
