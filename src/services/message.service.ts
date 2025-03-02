import { BotContext } from '../types';
import { OpenAIService } from './openai.service';
import { logger } from '../utils/logger';

export class MessageService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  /**
   * Process an incoming message
   */
  public async processMessage(ctx: BotContext): Promise<void> {
    try {
      // Show typing indicator
      await ctx.replyWithChatAction('typing');
      
      // Get user ID as a string
      const userId = ctx.from?.id?.toString();
      
      if (!userId) {
        logger.error('Missing user ID in message context');
        await ctx.reply('Sorry, I could not process your message. Please try again.');
        return;
      }
      
      // Get message text - make sure we have a text message
      if (!ctx.message || !('text' in ctx.message)) {
        logger.error('Not a text message or missing message text');
        await ctx.reply('Sorry, I can only process text messages. Please send a text message.');
        return;
      }
      
      const messageText = ctx.message.text;
      
      if (!messageText) {
        logger.error('Empty message text');
        await ctx.reply('Sorry, I could not read your message. Please try again with some text.');
        return;
      }
      
      // Get response from OpenAI Assistant
      // Pass the context to allow recording user data in database
      const response = await this.openaiService.askAssistant(ctx, userId, messageText);
      
      // Handle empty responses
      if (!response || response.trim() === '') {
        await ctx.reply('I apologize, but I couldn\'t generate a proper response. Please try again with a different message.');
        return;
      }
      
      // Reply to the user
      try {
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } catch (markdownError) {
        // If Markdown parsing fails, try again without Markdown
        logger.error('Markdown parsing error, trying plain text', markdownError);
        await ctx.reply(response);
      }
    } catch (error) {
      logger.error('Error processing message', error);
      await ctx.reply('Sorry, I encountered an error. Please try again later.');
    }
  }

  /**
   * Reset a user's conversation
   */
  public async resetConversation(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id?.toString();
    
    if (!userId) {
      await ctx.reply('Sorry, I could not identify your user account.');
      return;
    }
    
    // Pass the context to allow updating user data in database
    const success = await this.openaiService.resetConversation(ctx, userId);
    
    if (success) {
      await ctx.reply('Your conversation has been reset. You can start a new conversation now.');
    } else {
      await ctx.reply('No active conversation found to reset.');
    }
  }
}