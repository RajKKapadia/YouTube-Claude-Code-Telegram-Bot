import mongoose, { Schema, Document, Model } from 'mongoose';

// Define interface for static methods
interface IUserModel extends Model<IUser> {
  createOrUpdateFromTelegramCtx(
    telegramId: string, 
    threadId: string, 
    userData: any
  ): Promise<IUser>;
}

export interface IUser extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  threadId: string;
  messageCount: number;
  firstInteractionAt: Date;
  lastInteractionAt: Date;
  isActive: boolean;
  
  // Instance methods
  incrementMessageCount(): Promise<IUser>;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    threadId: {
      type: String,
      required: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    firstInteractionAt: {
      type: Date,
      default: Date.now,
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add a method to increment message count
UserSchema.methods.incrementMessageCount = function(this: IUser): Promise<IUser> {
  this.messageCount += 1;
  this.lastInteractionAt = new Date();
  return this.save();
};

// Create or update a user from a Telegram context
UserSchema.statics.createOrUpdateFromTelegramCtx = async function(telegramId: string, threadId: string, userData: any): Promise<IUser> {
  const user = await this.findOne({ telegramId });
  
  if (user) {
    // Update user data if it exists
    user.username = userData.username;
    user.firstName = userData.firstName;
    user.lastName = userData.lastName;
    user.lastInteractionAt = new Date();
    return user.save();
  } else {
    // Create new user if not found
    return this.create({
      telegramId,
      threadId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      firstInteractionAt: new Date(),
      lastInteractionAt: new Date(),
    });
  }
};

export const User = mongoose.model<IUser, IUserModel>('User', UserSchema);