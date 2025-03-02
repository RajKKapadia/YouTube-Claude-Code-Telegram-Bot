import { Context as TelegrafContext } from 'telegraf';
import { Update, Message } from 'telegraf/typings/core/types/typegram';

// Extend the Telegraf context with custom properties if needed
export interface BotContext extends TelegrafContext {
  // Add custom context properties here if needed
}

// OpenAI related types
export interface ThreadStorage {
  threadId: string;
  lastUpdated: Date;
}

export interface UserState {
  threadId?: string;
  lastMessageAt?: Date;
}

// Bot command handler type
// Allow any return type since Telegraf handlers can return various types of messages
export type CommandHandler = (ctx: BotContext) => Promise<any> | any;