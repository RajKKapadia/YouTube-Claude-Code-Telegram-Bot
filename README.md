# YouTube Claude Code Telegram Bot

A Telegram bot created with Node.js and TypeScript that integrates with OpenAI Assistant API.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Create a Telegram bot using [BotFather](https://t.me/botfather) and get your bot token
4. Create an OpenAI Assistant in the OpenAI platform and get your Assistant ID
5. Set up a MongoDB database (local or MongoDB Atlas)
6. Update the `.env` file with your credentials:
   ```
   BOT_TOKEN=your_telegram_bot_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_ASSISTANT_ID=your_assistant_id_here
   MONGODB_URI=your_mongodb_connection_string
   ```

7. Configure the `gather_user_info` function in your OpenAI Assistant:
   - Go to the OpenAI platform and open your Assistant
   - Add a new function with the following schema:
   ```json
   {
     "name": "gather_user_info",
     "description": "Collect user information for lead generation and storage",
     "parameters": {
       "type": "object",
       "properties": {
         "name": {
           "type": "string",
           "description": "The user's full name"
         },
         "email": {
           "type": "string",
           "description": "The user's email address"
         },
         "phone_number": {
           "type": "string",
           "description": "The user's phone number"
         }
       },
       "required": ["name", "email", "phone_number"]
     }
   }
   ```

8. Admin UI credentials (accessible at http://localhost:3000):
   - By default, the admin UI uses these credentials:
     - Username: admin
     - Password: password123
   - You can change these in the `.env` file:
   ```
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_secure_password
   ```

## Development

Run the bot in development mode with hot reloading:
```
pnpm dev
```

## Production

Build the TypeScript code:
```
pnpm build
```

Start the bot:
```
pnpm start
```

## Features

- Basic command handling (/start, /help, /about, /reset, /stats, /leads)
- Integration with OpenAI Assistant API with function calling support
- Support for the `gather_user_info` function to collect lead information
- Persistent conversations with OpenAI threads
- MongoDB integration for user and lead data storage
- User message statistics tracking
- Lead information collection and storage
- Web-based admin UI for lead management
- Lead status tracking (new, contacted, callback, completed, not interested)
- TypeScript support
- Hot reloading during development
- Scalable architecture with separation of concerns
- Thread expiry management
- Robust error handling with fallback mechanisms

## Project Structure

```
src/
  ├── config/          # Configuration management
  ├── services/        # Core application services
  │   ├── openai.service.ts    # OpenAI Assistant integration
  │   ├── message.service.ts   # Message processing
  │   ├── telegram.service.ts  # Telegram bot management
  │   ├── db.service.ts        # Database connection management
  │   ├── lead.service.ts      # Lead management service
  │   └── user.service.ts      # User data management
  ├── models/          # MongoDB models
  │   ├── user.model.ts        # User data schema
  │   ├── message.model.ts     # Message history schema
  │   └── lead.model.ts        # Lead information schema
  ├── handlers/        # Command handlers
  ├── utils/           # Utility functions
  │   └── logger.ts    # Enhanced logging utility
  ├── types/           # TypeScript type definitions
  ├── web/             # Web interface for lead management
  │   ├── server.ts           # Express server
  │   ├── views/              # EJS templates
  │   │   ├── dashboard.ejs   # Leads listing page
  │   │   ├── lead-details.ejs # Lead detail view
  │   │   ├── login.ejs       # Admin login page
  │   │   └── partials/       # Reusable template parts
  │   └── public/             # Static assets
  └── index.ts         # Application entry point
```

### Architecture

This application follows a service-oriented architecture:

- **Config Module**: Centralized configuration management
- **Services**: Core business logic separated into cohesive services
  - `TelegramService`: Manages the Telegram bot
  - `OpenAIService`: Handles OpenAI API integration
  - `MessageService`: Processes incoming messages
- **Handlers**: Command-specific logic
- **Utils**: Shared utilities like logging
- **Types**: TypeScript type definitions for better code quality

### Troubleshooting

If you encounter errors when running the bot, here are some common solutions:

1. **TypeScript errors with message objects**:
   - The bot now properly handles different message types by using type guards
   - We use `'text' in ctx.message` to check if a message contains text

2. **Issues with command handler return types**:
   - The CommandHandler type is defined to allow any return type
   - This accommodates the various return types from Telegraf's context methods

3. **OpenAI API errors**:
   - Check your API key and Assistant ID in the .env file
   - The app validates environment variables on startup