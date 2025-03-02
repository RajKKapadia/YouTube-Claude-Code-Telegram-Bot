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
   * Get all leads with pagination and filtering
   */
  public async getAllLeads(
    options: {
      page?: number;
      limit?: number;
      status?: string;
      searchTerm?: string;
    } = {}
  ): Promise<{ leads: ILead[]; total: number; pages: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;
      
      const query: any = {};
      
      // Apply status filter if provided
      if (options.status && options.status !== 'all') {
        query.status = options.status;
      }
      
      // Apply search term if provided
      if (options.searchTerm) {
        const searchRegex = new RegExp(options.searchTerm, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
          { notes: searchRegex }
        ];
      }
      
      const [leads, total] = await Promise.all([
        Lead.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Lead.countDocuments(query)
      ]);
      
      const pages = Math.ceil(total / limit);
      
      return {
        leads,
        total,
        pages
      };
    } catch (error) {
      logger.error('Failed to get all leads', error);
      return {
        leads: [],
        total: 0,
        pages: 0
      };
    }
  }
  
  /**
   * Get a lead by ID
   */
  public async getLeadById(leadId: string): Promise<ILead | null> {
    try {
      return await Lead.findById(leadId);
    } catch (error) {
      logger.error(`Failed to get lead with ID ${leadId}`, error);
      return null;
    }
  }
  
  /**
   * Update lead status
   */
  public async updateLeadStatus(
    leadId: string,
    status: 'new' | 'contacted' | 'callback' | 'completed' | 'not_interested',
    data?: {
      callbackDate?: Date;
      notes?: string;
    }
  ): Promise<ILead | null> {
    try {
      return await Lead.updateLeadStatus(leadId, status, data);
    } catch (error) {
      logger.error(`Failed to update lead status for ID ${leadId}`, error);
      return null;
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