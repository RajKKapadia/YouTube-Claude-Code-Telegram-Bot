import { BotContext } from '../types';
import { User, IUser } from '../models/user.model';
import { Message } from '../models/message.model';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class UserService {
  /**
   * Get or create a user from Telegram context
   */
  public async getOrCreateUser(ctx: BotContext, threadId: string): Promise<IUser> {
    try {
      const telegramId = ctx.from?.id.toString();
      
      if (!telegramId) {
        throw new Error('Missing Telegram ID in context');
      }
      
      // Extract user data from context
      const userData = {
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
      };
      
      // Try to find user or create if not exists
      const user = await User.findOne({ telegramId });
      
      if (user) {
        // Update user data if needed
        let shouldUpdate = false;
        
        if (userData.username && user.username !== userData.username) {
          user.username = userData.username;
          shouldUpdate = true;
        }
        
        if (userData.firstName && user.firstName !== userData.firstName) {
          user.firstName = userData.firstName;
          shouldUpdate = true;
        }
        
        if (userData.lastName && user.lastName !== userData.lastName) {
          user.lastName = userData.lastName;
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          user.lastInteractionAt = new Date();
          await user.save();
          logger.debug(`Updated user ${telegramId}`);
        }
        
        return user;
      } else {
        // Create new user
        const newUser = await User.create({
          telegramId,
          threadId,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          firstInteractionAt: new Date(),
          lastInteractionAt: new Date(),
          messageCount: 0,
        });
        
        logger.info(`Created new user ${telegramId}`);
        return newUser;
      }
    } catch (error) {
      logger.error('Error getting or creating user', error);
      throw error;
    }
  }

  /**
   * Record a message interaction
   */
  public async recordMessageInteraction(
    user: IUser,
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    try {
      // Increment user message count
      user.messageCount += 1;
      user.lastInteractionAt = new Date();
      await user.save();
      
      // Save message history
      await Message.createMessage(
        user._id as mongoose.Types.ObjectId,
        user.telegramId,
        user.threadId,
        userMessage,
        assistantResponse
      );
      
      logger.debug(`Recorded message interaction for user ${user.telegramId}`);
    } catch (error) {
      logger.error('Error recording message interaction', error);
      throw error;
    }
  }

  /**
   * Get thread ID for user
   */
  public async getThreadId(telegramId: string): Promise<string | null> {
    try {
      const user = await User.findOne({ telegramId });
      return user ? user.threadId : null;
    } catch (error) {
      logger.error('Error getting thread ID', error);
      return null;
    }
  }

  /**
   * Update thread ID for user
   */
  public async updateThreadId(telegramId: string, threadId: string): Promise<boolean> {
    try {
      const result = await User.updateOne(
        { telegramId },
        { $set: { threadId, lastInteractionAt: new Date() } }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating thread ID', error);
      return false;
    }
  }

  /**
   * Get user stats
   */
  public async getUserStats(telegramId: string): Promise<any> {
    try {
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return null;
      }
      
      const messageCount = user.messageCount;
      const firstInteraction = user.firstInteractionAt;
      const daysSinceFirstInteraction = Math.floor(
        (Date.now() - firstInteraction.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        messageCount,
        firstInteraction,
        daysSinceFirstInteraction,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      logger.error('Error getting user stats', error);
      return null;
    }
  }
}