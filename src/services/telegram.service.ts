import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MessageService } from './message.service';
import { 
  startHandler, 
  helpHandler, 
  aboutHandler, 
  resetHandler,
  statsHandler,
  leadsHandler
} from '../handlers/command.handlers';

export class TelegramService {
  private bot: Telegraf<BotContext>;
  private messageService: MessageService;

  constructor() {
    // Create bot instance
    this.bot = new Telegraf<BotContext>(config.telegram.token);
    
    // Create message service
    this.messageService = new MessageService();
    
    // Setup handlers
    this.setupHandlers();
  }

  /**
   * Setup bot command and message handlers
   */
  private setupHandlers(): void {
    // Command handlers
    this.bot.start(startHandler);
    this.bot.help(helpHandler);
    this.bot.command('about', aboutHandler);
    this.bot.command('reset', resetHandler);
    this.bot.command('stats', statsHandler);
    this.bot.command('leads', leadsHandler);

    // Handle text messages specifically
    this.bot.on('message', (ctx) => {
      // Only process text messages
      if (ctx.message && 'text' in ctx.message) {
        return this.messageService.processMessage(ctx);
      } else {
        // For non-text messages
        return ctx.reply('I can only process text messages. Please send a text message.');
      }
    });
    
    // Handle errors
    this.bot.catch((err, ctx) => {
      logger.error(`Bot error for ${ctx.updateType}`, err);
    });
  }

  /**
   * Start the bot
   */
  public async start(): Promise<void> {
    try {
      // Log startup information
      logger.info(`Starting ${config.app.name} v${config.app.version}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Launch the bot
      await this.bot.launch();
      logger.info('Bot started successfully');
      logger.info(`Bot username: @${this.bot.botInfo?.username || 'unknown'}`);
      
      // Enable graceful stop
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to start bot', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  private stop(signal: string): void {
    logger.info(`Stopping bot due to ${signal}`);
    this.bot.stop(signal);
  }
}