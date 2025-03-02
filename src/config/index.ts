import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables validation
const requiredEnvVars = ['BOT_TOKEN', 'OPENAI_API_KEY', 'OPENAI_ASSISTANT_ID', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

export const config = {
  telegram: {
    token: process.env.BOT_TOKEN as string,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY as string,
    assistantId: process.env.OPENAI_ASSISTANT_ID as string,
  },
  mongodb: {
    uri: process.env.MONGODB_URI as string,
  },
  app: {
    name: 'Telegram Bot with OpenAI Assistant',
    version: '1.0.0',
  },
};