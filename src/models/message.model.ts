import mongoose, { Schema, Document, Model } from 'mongoose';

// Define interface for static methods
interface IMessageModel extends Model<IMessage> {
  createMessage(
    userId: mongoose.Types.ObjectId,
    telegramId: string,
    threadId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<IMessage>;
}

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;
  telegramId: string;
  threadId: string;
  userMessage: string;
  assistantResponse: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
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
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    userMessage: {
      type: String,
      required: true,
    },
    assistantResponse: {
      type: String,
      required: true,
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

// Create a new message record
MessageSchema.statics.createMessage = async function(
  userId: mongoose.Types.ObjectId,
  telegramId: string, 
  threadId: string, 
  userMessage: string,
  assistantResponse: string
): Promise<IMessage> {
  return this.create({
    userId,
    telegramId,
    threadId,
    userMessage,
    assistantResponse,
    createdAt: new Date(),
  });
};

export const Message = mongoose.model<IMessage, IMessageModel>('Message', MessageSchema);