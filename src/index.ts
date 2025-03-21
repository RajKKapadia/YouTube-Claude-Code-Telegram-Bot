import { TelegramService } from './services/telegram.service';
import { DatabaseService } from './services/db.service'; 
import { logger } from './utils/logger';
import WebServer from './web/server';

/**
 * Main function to start the application
 */
async function main() {
  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    const dbService = DatabaseService.getInstance();
    await dbService.connect();
    
    // Create and start telegram service
    const telegramService = new TelegramService();
    await telegramService.start();
    
    // Start the web server for lead management
    logger.info('Starting the web server...')
    const webServer = new WebServer();
    await webServer.start();
    
    logger.info('Application is running');
    
    // Handle graceful shutdown
    process.once('SIGINT', async () => {
      logger.info('Shutting down application');
      await dbService.disconnect();
      process.exit(0);
    });
    
    process.once('SIGTERM', async () => {
      logger.info('Shutting down application');
      await dbService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Application failed to start', error);
    process.exit(1);
  }
}

// Start the application
main();