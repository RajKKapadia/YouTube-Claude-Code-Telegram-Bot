import { DatabaseService } from '../services/db.service';
import { logger } from '../utils/logger';
import WebServer from './server';

/**
 * Main function to start the web server in standalone mode
 */
async function main() {
  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    const dbService = DatabaseService.getInstance();
    await dbService.connect();
    
    // Start the web server for lead management
    logger.info('Starting the web server in standalone mode...')
    const webServer = new WebServer();
    await webServer.start();
    
    logger.info('Web server is running');
    
    // Handle graceful shutdown
    process.once('SIGINT', async () => {
      logger.info('Shutting down web server');
      await dbService.disconnect();
      process.exit(0);
    });
    
    process.once('SIGTERM', async () => {
      logger.info('Shutting down web server');
      await dbService.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Web server failed to start', error);
    process.exit(1);
  }
}

// Start the web server
main();