import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().default('file:./data/app.db'),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  TOS_ACCESS_KEY: z.string().optional(),
  TOS_SECRET_KEY: z.string().optional(),

  SEEDREAM_API_KEY: z.string().optional(),

  AGENT_MODEL: z.string().default('ark-code-latest'),
  AGENT_BASE_URL: z.string().default('https://ark.cn-beijing.volces.com/api/plan'),
  AGENT_API_KEY: z.string(),

  AGENT_RUNTIME_HOST: z.enum(['inprocess', 'worker']).default('inprocess'),
  AGENT_WORKER_POOL_SIZE: z.string().transform(Number).default(2),
  AGENT_HARNESS_IDLE_MS: z.string().transform(Number).default(15 * 60 * 1000),
  AGENT_ADMIN_TOKEN: z.string().optional(),
  AGENT_PROMPT_RUN_STALE_MS: z.string().transform(Number).default(2 * 60 * 60 * 1000),
  AGENT_SESSION_IDLE_CLOSE_MS: z.string().transform(Number).default(0),

  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.string().transform(Number).default(0),

  NANOBANANA_API_KEY: z.string().optional(),

  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().default('https://cdn.zerodraw.cn'),
  SERVER_BASE_URL: z.string().optional(),
  UPLOAD_PROVIDER: z.enum(['volc', 'r2', 'local']).default('local'),

  BUCKET_NAME: z.string().default('zerodraw'),
  REGION: z.string().default('shanghai'),

  LOCAL_UPLOAD_DIR: z.string().default('./data/uploads'),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;

export const isRedisEnabled = Boolean(env.REDIS_HOST);
export const isCloudUploadEnabled = Boolean(env.TOS_ACCESS_KEY && env.TOS_SECRET_KEY);
