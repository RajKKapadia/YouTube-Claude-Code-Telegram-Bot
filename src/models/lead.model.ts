import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for the static methods
interface ILeadModel extends Model<ILead> {
  createLead(
    userId: mongoose.Types.ObjectId,
    telegramId: string,
    leadData: {
      name: string;
      email: string;
      phoneNumber: string;
      additionalInfo?: Record<string, any>;
    }
  ): Promise<ILead>;
  
  updateLeadStatus(
    leadId: mongoose.Types.ObjectId | string,
    status: 'new' | 'contacted' | 'callback' | 'completed' | 'not_interested',
    data?: {
      callbackDate?: Date;
      notes?: string;
    }
  ): Promise<ILead | null>;
}

export interface ILead extends Document {
  userId: mongoose.Types.ObjectId;
  telegramId: string;
  name: string;
  email: string;
  phoneNumber: string;
  source: string;
  status: 'new' | 'contacted' | 'callback' | 'completed' | 'not_interested';
  callbackDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  additionalInfo?: Record<string, any>;
}

const LeadSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: 'telegram_bot',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'callback', 'completed', 'not_interested'],
      default: 'new',
      index: true
    },
    callbackDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
    additionalInfo: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create a new lead
LeadSchema.statics.createLead = async function(
  userId: mongoose.Types.ObjectId,
  telegramId: string,
  leadData: {
    name: string;
    email: string;
    phoneNumber: string;
    additionalInfo?: Record<string, any>;
  }
): Promise<ILead> {
  return this.create({
    userId,
    telegramId,
    name: leadData.name,
    email: leadData.email,
    phoneNumber: leadData.phoneNumber,
    status: 'new',
    additionalInfo: leadData.additionalInfo || {},
    createdAt: new Date(),
  });
};

// Update lead status
LeadSchema.statics.updateLeadStatus = async function(
  leadId: mongoose.Types.ObjectId | string,
  status: 'new' | 'contacted' | 'callback' | 'completed' | 'not_interested',
  data?: {
    callbackDate?: Date;
    notes?: string;
  }
): Promise<ILead | null> {
  const updateData: any = { status };
  
  if (data) {
    if (data.callbackDate) {
      updateData.callbackDate = data.callbackDate;
    }
    
    if (data.notes) {
      updateData.notes = data.notes;
    }
  }
  
  return this.findByIdAndUpdate(
    leadId,
    { $set: updateData },
    { new: true }
  );
};

export const Lead = mongoose.model<ILead, ILeadModel>('Lead', LeadSchema);