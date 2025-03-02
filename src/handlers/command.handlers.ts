import { BotContext, CommandHandler } from '../types';
import { MessageService } from '../services/message.service';
import { UserService } from '../services/user.service';
import { LeadService } from '../services/lead.service';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create services
const messageService = new MessageService();
const userService = new UserService();
const leadService = new LeadService();

/**
 * Start command handler
 */
export const startHandler: CommandHandler = (ctx: BotContext) => {
  const userName = ctx.from?.first_name || 'there';
  return ctx.reply(
    `Hello ${userName}! 👋\n\nI am powered by an OpenAI Assistant. Ask me anything!`
  );
};

/**
 * Help command handler
 */
export const helpHandler: CommandHandler = (ctx: BotContext) => {
  return ctx.reply(
    'Here are the available commands:\n\n' +
    '/start - Start the bot\n' +
    '/help - Show this help message\n' +
    '/about - About this bot\n' +
    '/reset - Reset your conversation history\n' +
    '/stats - View your chat statistics\n' +
    '/leads - View your submitted lead information\n\n' +
    'Just send me a message and I\'ll respond using the OpenAI Assistant.'
  );
};

/**
 * About command handler
 */
export const aboutHandler: CommandHandler = (ctx: BotContext) => {
  return ctx.reply(
    `${config.app.name} v${config.app.version}\n\n` +
    'This is a Telegram bot powered by OpenAI Assistant API.\n\n' +
    'Created with Node.js and TypeScript.'
  );
};

/**
 * Reset conversation command handler
 */
export const resetHandler: CommandHandler = (ctx: BotContext) => {
  return messageService.resetConversation(ctx);
};

/**
 * Stats command handler
 */
export const statsHandler: CommandHandler = async (ctx: BotContext) => {
  try {
    const userId = ctx.from?.id?.toString();
    
    if (!userId) {
      return ctx.reply('Sorry, I could not identify your user account.');
    }
    
    const stats = await userService.getUserStats(userId);
    
    if (!stats) {
      return ctx.reply('No statistics available. Try having a conversation first!');
    }
    
    const userName = stats.firstName || stats.username || 'there';
    
    return ctx.reply(
      `📊 *Chat Statistics for ${userName}* 📊\n\n` +
      `Total messages: *${stats.messageCount}*\n` +
      `First conversation: *${stats.firstInteraction.toDateString()}*\n` +
      `Days since first chat: *${stats.daysSinceFirstInteraction}*\n\n` +
      `Keep chatting to increase your stats!`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error getting user stats', error);
    return ctx.reply('Sorry, I could not retrieve your statistics. Please try again later.');
  }
};

/**
 * Leads command handler - shows user's submitted lead information
 */
export const leadsHandler: CommandHandler = async (ctx: BotContext) => {
  try {
    const userId = ctx.from?.id?.toString();
    
    if (!userId) {
      return ctx.reply('Sorry, I could not identify your user account.');
    }
    
    const leads = await leadService.getLeadsByUser(userId);
    
    if (!leads || leads.length === 0) {
      return ctx.reply('You have not submitted any lead information yet.');
    }
    
    // Format the leads information
    const leadsInfo = leads.map((lead, index) => {
      return `*Lead #${index + 1}*\n` +
        `Name: ${lead.name}\n` +
        `Email: ${lead.email}\n` +
        `Phone: ${lead.phoneNumber}\n` +
        `Submitted: ${new Date(lead.createdAt).toLocaleString()}\n`;
    }).join('\n');
    
    return ctx.reply(
      `📋 *Your Submitted Lead Information* 📋\n\n${leadsInfo}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error getting leads information', error);
    return ctx.reply('Sorry, I could not retrieve your leads information. Please try again later.');
  }
};