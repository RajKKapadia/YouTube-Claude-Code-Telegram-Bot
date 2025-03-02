import OpenAI from 'openai';
import { RunSubmitToolOutputsParams } from 'openai/resources/beta/threads/runs/runs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserService } from './user.service';
import { LeadService } from './lead.service';
import { BotContext, ThreadStorage } from '../types';

export class OpenAIService {
  private openai: OpenAI;
  private userService: UserService;
  private leadService: LeadService;
  private temporaryThreadStorage: Map<string, ThreadStorage>; // Used only when DB fails
  private readonly THREAD_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.userService = new UserService();
    this.leadService = new LeadService();
    this.temporaryThreadStorage = new Map();
    
    // Setup periodic cleanup of old threads in temporary storage
    setInterval(() => this.cleanupExpiredThreads(), this.THREAD_EXPIRY_MS);
  }

  /**
   * Gets or creates a thread for a user
   */
  private async getOrCreateThreadForUser(ctx: BotContext, userId: string): Promise<string> {
    try {
      // First try to get thread ID from database
      const threadId = await this.userService.getThreadId(userId);
      
      if (threadId) {
        logger.debug(`Retrieved existing thread ${threadId} for user ${userId} from database`);
        return threadId;
      }
      
      // If not in database, create a new thread
      const thread = await this.openai.beta.threads.create();
      
      try {
        // Store the thread ID in the database
        await this.userService.getOrCreateUser(ctx, thread.id);
        logger.info(`Created new thread ${thread.id} for user ${userId} and stored in database`);
      } catch (dbError) {
        // If database save fails, use temporary storage as fallback
        logger.error('Failed to store thread in database, using temporary storage', dbError);
        this.temporaryThreadStorage.set(userId, {
          threadId: thread.id,
          lastUpdated: new Date()
        });
      }
      
      return thread.id;
    } catch (error) {
      logger.error('Failed to create or retrieve thread', error);
      
      // Fallback to temporary storage if we have it
      const userThread = this.temporaryThreadStorage.get(userId);
      if (userThread) {
        logger.info(`Using fallback thread ${userThread.threadId} for user ${userId} from temporary storage`);
        return userThread.threadId;
      }
      
      throw new Error('Failed to create conversation thread');
    }
  }

  /**
   * Handle function calls from the assistant
   */
  private async handleFunctionCalls(ctx: BotContext, userId: string, threadId: string, runId: string): Promise<boolean> {
    try {
      // Get the run
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      
      // Check if there are required actions
      if (run.status !== 'requires_action' || run.required_action?.type !== 'submit_tool_outputs') {
        return false; // No function calls to handle
      }
      
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs: RunSubmitToolOutputsParams.ToolOutput[] = [];
      
      // Process each tool call
      for (const toolCall of toolCalls) {
        try {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          logger.info(`Processing function call: ${functionName} with args: ${JSON.stringify(functionArgs)}`);
          
          if (functionName === 'gather_user_info') {
            // Validate the arguments
            const validation = this.leadService.validateLeadData(functionArgs);
            
            if (!validation.isValid) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: validation.errors.join(', ')
                })
              });
              continue;
            }
            
            // Store the lead info
            const lead = await this.leadService.storeLead(userId, functionArgs);
            
            if (lead) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: true,
                  message: `Successfully stored lead information for ${functionArgs.name}`
                })
              });
            } else {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({
                  success: false,
                  error: 'Failed to store lead information in the database'
                })
              });
            }
          } else {
            // Unsupported function
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({
                success: false,
                error: `Function '${functionName}' is not supported`
              })
            });
          }
        } catch (error) {
          logger.error(`Error processing tool call`, error);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({
              success: false,
              error: 'Internal error processing function call'
            })
          });
        }
      }
      
      // Submit the tool outputs back to the assistant
      if (toolOutputs.length > 0) {
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: toolOutputs
        });
        return true; // Successfully handled function calls
      }
      
      return false;
    } catch (error) {
      logger.error('Error handling function calls', error);
      return false;
    }
  }

  /**
   * Asks the assistant a question and returns the response
   */
  public async askAssistant(ctx: BotContext, userId: string, message: string): Promise<string> {
    try {
      // Get or create a thread for the user
      const threadId = await this.getOrCreateThreadForUser(ctx, userId);

      // Add the user's message to the thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
      });

      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: config.openai.assistantId,
      });

      // Poll for the run to complete
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Wait until the run is completed or requires action
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      
      while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
          throw new Error(`Run failed with status: ${runStatus.status}`);
        }
        
        if (runStatus.status === 'requires_action') {
          // Handle function calls
          const handled = await this.handleFunctionCalls(ctx, userId, threadId, run.id);
          
          if (!handled) {
            throw new Error('Failed to handle assistant function calls');
          }
        }
        
        // Safety check to prevent infinite loops
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Timed out waiting for the assistant to respond');
        }
        
        // Wait for a short time before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the messages from the thread
      const messages = await this.openai.beta.threads.messages.list(threadId);
      
      // Find the latest assistant message
      const assistantMessages = messages.data
        .filter(msg => msg.role === 'assistant')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (assistantMessages.length === 0) {
        logger.warn(`No assistant messages found in thread ${threadId}`);
        return "I couldn't generate a response. Please try again.";
      }

      // Extract text content from the assistant's message
      const latestMessage = assistantMessages[0];
      let responseText = '';

      try {
        if (latestMessage.content && latestMessage.content.length > 0) {
          const textContent = latestMessage.content.filter(item => item.type === 'text');
          responseText = textContent.map(item => {
            if (item.type === 'text') {
              return item.text.value;
            }
            return '';
          }).join('\n');
        }
      } catch (error) {
        logger.error(`Error parsing message content: ${JSON.stringify(latestMessage)}`, error);
        return "I had trouble parsing the response. Please try again.";
      }

      // Record this interaction in the database
      try {
        const user = await this.userService.getOrCreateUser(ctx, threadId);
        await this.userService.recordMessageInteraction(user, message, responseText);
      } catch (dbError) {
        logger.error('Failed to record message interaction in database', dbError);
        // Continue even if we can't record the interaction
      }

      return responseText || "I couldn't generate a response. Please try again.";
    } catch (error) {
      logger.error('Error asking assistant', error);
      return "Sorry, I encountered an error while processing your request. Please try again later.";
    }
  }

  /**
   * Resets a user's conversation by creating a new thread
   */
  public async resetConversation(ctx: BotContext, userId: string): Promise<boolean> {
    try {
      // Try to create a new thread
      const thread = await this.openai.beta.threads.create();
      
      // Update the user's thread ID in the database
      try {
        await this.userService.updateThreadId(userId, thread.id);
        logger.info(`Reset conversation for user ${userId} with new thread ${thread.id}`);
      } catch (dbError) {
        logger.error('Failed to update thread ID in database', dbError);
        
        // Fallback to temporary storage
        this.temporaryThreadStorage.set(userId, {
          threadId: thread.id,
          lastUpdated: new Date()
        });
      }
      
      return true;
    } catch (error) {
      logger.error('Error resetting conversation', error);
      return false;
    }
  }

  /**
   * Clean up expired threads in temporary storage to prevent memory leaks
   */
  private cleanupExpiredThreads(): void {
    const now = new Date();
    let cleanupCount = 0;
    
    for (const [userId, threadData] of this.temporaryThreadStorage.entries()) {
      const timeDiff = now.getTime() - threadData.lastUpdated.getTime();
      if (timeDiff > this.THREAD_EXPIRY_MS) {
        this.temporaryThreadStorage.delete(userId);
        cleanupCount++;
      }
    }
    
    if (cleanupCount > 0) {
      logger.info(`Cleaned up ${cleanupCount} expired threads from temporary storage`);
    }
  }
}