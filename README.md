# Multi-Channel Assistant API

An intelligent virtual assistant API specialized with multi-channel integration for WhatsApp (Twilio and native WhatsApp Business API), Telegram, Email, SIP, and WebRTC.

## 🚀 Features

- Intelligent virtual assistant using OpenAI or compatible services
- Automatic conversation handling per user
- Multi-channel integration:
  - WhatsApp (Twilio and native WhatsApp Business API)
  - Telegram
  - Email (SMTP)
  - SIP (Voice calls)
  - WebRTC (Video/Audio calls)
- Single extensible webhook for more channels
- SQLite database for local development
- SQL Server or Supabase database for production
- Dynamic and extensible tool system
- Flexible model and endpoint (baseURL) configuration
- Model Context Protocol (MCP) integration to connect with remote servers
- Voice message support (STT/TTS) with ElevenLabs and Deepgram

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- An account with OpenAI or a compatible API service
- Accounts for the channels you want to enable:
  - Twilio (for WhatsApp/SMS)
  - WhatsApp Business API (Meta)
  - Telegram Bot Token (for Telegram)
  - SMTP configuration (for Email)
  - SIP configuration (for voice calls)
- SQL Server or Supabase (production only)
- ElevenLabs or Deepgram (for voice messages, optional)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd whatsappagent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env` according to your needs:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
# If using an alternative provider, configure the endpoint:
# OPENAI_BASE_URL=https://api.your-provider.com/v1

# Assistant Configuration
MAX_TOKENS=512
HISTORY_SIZE=6
MODEL_TEMPERATURE=0.2

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
DB_TYPE=sqlite  # sqlite, sqlserver, or supabase

# For production with SQL Server:
# DB_TYPE=sqlserver
# DB_USER=sql_server_user
# DB_PASSWORD=sql_server_password
# DB_SERVER=sql_server_host
# DB_NAME=database_name

# For production with Supabase:
# DB_TYPE=supabase
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-supabase-key

# Enabled Channel Configuration
CHANNEL_TELEGRAM_ENABLED=true
CHANNEL_EMAIL_ENABLED=true
CHANNEL_SIP_ENABLED=true
CHANNEL_TWILIO_ENABLED=true
CHANNEL_WABA_ENABLED=true
CHANNEL_WEBRTC_ENABLED=true

# WhatsApp Business API Configuration
WABA_PHONE_NUMBER_ID=your_phone_number_id
WABA_ACCESS_TOKEN=your_access_token

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_NUMBER=your_twilio_number
TWILIO_ALLOW_AUDIO_FILES=true

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOW_AUDIO_FILES=true

# WebRTC Configuration
WEBRTC_PORT=8080

# Audio Storage Configuration
STORAGE_TYPE=local
LOCAL_STORAGE_PUBLIC_URL=http://localhost:3000/uploads

# SMTP Mail Configuration
SMTP_HOST=your_smtp_server
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM_NAME=Sender Name
SMTP_FROM_EMAIL=sender@email.com

# Voice Services Configuration
SPEECH_SERVICE=elevenlabs  # elevenlabs or deepgram

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_VOICE_ID=your_voice_id

# Deepgram Configuration
DEEPGRAM_API_KEY=your_api_key
DEEPGRAM_MODEL_SST=nova-2
DEEPGRAM_MODEL_TTS=aura-asteria-en
```

## 🚀 Available Commands

- `npm run setup-db`: Set up the main database (generic tables)
- `npm run setup-client-db`: Set up the client database (specific tables)
- `npm run mcp-servers`: Manage connected MCP servers
- `npm run start-api`: Start the API server (development mode)
- `npm run compile`: Compile TypeScript code
- `npm start`: Start in production mode (after compilation)

## 📚 Project Structure

```
src/
├── channels/           # Parsers and sending for each channel (twilio, waba, etc.)
├── clientConfig/       # Client-specific configuration
│   ├── database/       # Client-specific database
│   ├── tools/          # Client-specific tools
│   ├── scripts/        # Client initialization scripts
│   └── prompt.ts       # Assistant prompt
├── config/             # General server configuration
├── controllers/        # API controllers (main webhook)
├── database/           # Generic database configuration and models
├── schemas/            # Validation schemas
├── services/           # Common services
│   ├── ai/             # Artificial intelligence services
│   ├── audio/          # Audio services
│   ├── mcp/            # Model Context Protocol related services
│   └── webrtc/         # WebRTC services
├── utils/              # Utilities
└── index.ts            # Application entry point
```

## 🌐 Multi-Channel Support

The assistant supports multiple communication channels:

### WhatsApp (Twilio)
- Integration with Twilio for WhatsApp messages
- Voice message support (STT/TTS)
- Webhook: `/assistant` (TwiML format)

### WhatsApp Business API (WABA)
- Native integration with Meta's WhatsApp Business API
- Webhook: `/assistant` (JSON format)

### Telegram
- Telegram bot with text message support
- Configurable via environment variables
- Webhook: `/assistant` (JSON format)

### Email
- Integration with SMTP servers
- Sending and receiving emails

### SIP (Voice Calls)
- Voice calls through the SIP protocol
- Integration with SIP servers

### WebRTC
- Real-time voice and video calls
- WebSocket server for signaling

## 🔧 Database Configuration

### Local Development
By default, the application uses SQLite in development. Databases are created automatically:
- `chat.db`: Main database for conversations
- `client.db`: Client-specific database

### Production
In production, you can use **SQL Server** or **Supabase**. Configure the following environment variables according to the engine:

#### SQL Server
```env
DB_TYPE=sqlserver
DB_USER=sql_server_user
DB_PASSWORD=sql_server_password
DB_SERVER=sql_server_host
DB_NAME=database_name
```

#### Supabase
```env
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
```

## 📝 API Usage

### Main Endpoint
```http
POST /assistant
Content-Type: application/json or application/x-www-form-urlencoded
```

### User Identification
The system identifies users by the combination of `provider` and `external_id`, allowing unified conversations even when the user changes channels.

### Response Example
- **Twilio:** XML (TwiML)
- **WABA:** Message sent via Meta API
- **Telegram:** Message sent via Telegram API
- **Email:** Email sent via SMTP

## 🔌 Model Context Protocol (MCP) Integration

This API includes integration with Model Context Protocol (MCP), which allows connecting the assistant with remote servers that expose resources and tools.

### MCP Server Management
You can manage MCP servers using the command:
```bash
npm run mcp-servers <list|add|update|delete> [args...]
```

Examples:
```bash
# List all servers
npm run mcp-servers list

# Add a new server
npm run mcp-servers add server-name http://server-url/mcp version

# Update an existing server
npm run mcp-servers update id server-name http://server-url/mcp version

# Delete a server
npm run mcp-servers delete id
```

## 🔄 Extensibility

### Adding New Channels
1. Create a new file in the `src/channels/` folder
2. Implement the `parseMessage` and `sendMessage` functions
3. Register the channel in the dispatcher

### Adding New Tools
1. Create a new file in `src/clientConfig/tools/`
2. Register the tool in `src/clientConfig/allTools.ts`

## 🚀 Deployment

### Local Server Deployment
1. Configure all necessary environment variables
2. Run initialization commands:
```bash
npm run setup-db
npm run setup-client-db
```
3. Start the server:
```bash
npm run start-api
```

### Production Deployment
1. Configure environment variables for production
2. Use a SQL Server or Supabase database
3. Compile the TypeScript code:
```bash
npm run compile
```
4. Start the server in production mode:
```bash
npm start
```

### Cloud Service Deployment
The project can be deployed on services such as:
- AWS EC2
- Google Cloud Platform
- Microsoft Azure
- DigitalOcean
- Heroku
- Vercel (for versions without WebSocket)

## 📄 License

MIT

## 👥 Contribution

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request