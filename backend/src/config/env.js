const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables from .env file located at backend root if present
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  MONGODB_URI: z
    .string()
    .refine(
      (val) => !val || val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'),
      { message: 'MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)' }
    )
    .optional()
    .or(z.literal('')),
  JWT_SECRET: z
    .string()
    .min(10, 'JWT_SECRET must be at least 10 characters long')
    .default('development_default_jwt_secret_collaborative_tool_key_2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  // Format errors without leaking any secret values
  const formattedErrors = parseResult.error.issues
    .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\x1b[31m[Config Error] Invalid environment configuration:\n${formattedErrors}\x1b[0m`);
  throw new Error('Environment configuration validation failed');
}

const env = parseResult.data;

module.exports = env;
