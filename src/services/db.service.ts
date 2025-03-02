import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Already connected to MongoDB');
      return;
    }

    try {
      // Set mongoose options
      mongoose.set('strictQuery', false);
      
      // Connect to MongoDB
      await mongoose.connect(config.mongodb.uri);
      
      this.isConnected = true;
      logger.info('Connected to MongoDB');
      
      // Handle connection errors
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', err);
        this.isConnected = false;
      });
      
      // Handle disconnection
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });
      
      // Handle reconnection
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB', error);
      throw error;
    }
  }

  /**
   * Check if connected to MongoDB
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }
}