import { logger } from '../utils/logger';
import { Lead, ILead } from '../models/lead.model';
import { User } from '../models/user.model';
import mongoose from 'mongoose';
import { BotContext } from '../types';

export class LeadService {
  /**
   * Store lead information
   */
  public async storeLead(
    telegramId: string,
    leadData: {
      name: string;
      email: string;
      phone_number: string;
      additional_info?: Record<string, any>;
    }
  ): Promise<ILead | null> {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });

      if (!user) {
        logger.error(`No user found with telegramId: ${telegramId}`);
        return null;
      }

      // Create a new lead
      const lead = await Lead.createLead(
        user._id as mongoose.Types.ObjectId,
        telegramId,
        {
          name: leadData.name,
          email: leadData.email,
          phoneNumber: leadData.phone_number,
          additionalInfo: leadData.additional_info || {
            captured_via: 'OpenAI Assistant function',
            timestamp: new Date().toISOString()
          }
        }
      );

      logger.info(`Created new lead for user ${telegramId}: ${lead.email}`);
      return lead;
    } catch (error) {
      logger.error('Failed to store lead information', error);
      return null;
    }
  }

  /**
   * Get leads for a user
   */
  public async getLeadsByUser(telegramId: string): Promise<ILead[]> {
    try {
      return await Lead.find({ telegramId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Failed to get leads for user', error);
      return [];
    }
  }

  /**
   * Check if a valid email format
   */
  public isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if a valid phone number format
   * This is a basic check, you might want to use a more sophisticated library for this
   */
  public isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone validation - adjust based on your requirements
    return phoneNumber.length >= 8 && /^[+]?[\d\s()-]+$/.test(phoneNumber);
  }

  /**
   * Validate lead data
   */
  public validateLeadData(
    leadData: {
      name?: string;
      email?: string;
      phone_number?: string;
    }
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!leadData.name || leadData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!leadData.email || !this.isValidEmail(leadData.email)) {
      errors.push('Please provide a valid email address');
    }

    if (!leadData.phone_number || !this.isValidPhoneNumber(leadData.phone_number)) {
      errors.push('Please provide a valid phone number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}