# WhatsApp AI Assistant API

Una API que proporciona un asistente virtual inteligente especializado en información de deudas de crédito automotriz, con integración multi-canal para WhatsApp (Twilio y WhatsApp Business API nativa), Telegram, Email, SIP y WebRTC.

## 🚀 Características

- Asistente virtual inteligente usando OpenAI o servicios compatibles
- Especializado en consultas de deudas de crédito automotriz
- Manejo automático de conversaciones por usuario
- Integración multi-canal:
  - WhatsApp (Twilio y WhatsApp Business API nativa)
  - Telegram
  - Email (SMTP)
  - SIP (Voice calls)
  - WebRTC (Video/Audio calls)
- Webhook único y extensible para más canales
- Base de datos SQLite para desarrollo local
- Base de datos SQL Server o Supabase para producción
- Sistema de herramientas (tools) dinámico y extensible
- Configuración flexible de modelo y endpoint (baseURL)
- Integración con Model Context Protocol (MCP) para conectar con servidores remotos
- Soporte para mensajes de voz (STT/TTS) con ElevenLabs y Deepgram

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn
- Una cuenta en OpenAI o servicio compatible con su API
- Cuentas para los canales que desees habilitar:
  - Twilio (para WhatsApp/SMS)
  - WhatsApp Business API (Meta)
  - Telegram Bot Token (para Telegram)
  - Configuración SMTP (para Email)
  - Configuración SIP (para llamadas de voz)
- SQL Server o Supabase (solo para producción)
- ElevenLabs o Deepgram (para mensajes de voz, opcional)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone [url-del-repositorio]
cd whatsappagent
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:
```bash
cp .env.example .env
```

4. Configura las variables de entorno en `.env` según tus necesidades:

```env
# OpenAI Configuration
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=gpt-3.5-turbo
# Si usas un proveedor alternativo, configura el endpoint:
# OPENAI_BASE_URL=https://api.tu-proveedor.com/v1

# Configuración del asistente
MAX_TOKENS=512
HISTORY_SIZE=6
MODEL_TEMPERATURE=0.2

# Configuración del servidor
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Configuración de base de datos
DB_TYPE=sqlite  # sqlite, sqlserver, o supabase

# Para producción con SQL Server:
# DB_TYPE=sqlserver
# DB_USER=usuario_sql_server
# DB_PASSWORD=contraseña_sql_server
# DB_SERVER=host_sql_server
# DB_NAME=nombre_base_datos

# Para producción con Supabase:
# DB_TYPE=supabase
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_KEY=tu-key-de-supabase

# Configuración de canales habilitados
CHANNEL_TELEGRAM_ENABLED=true
CHANNEL_EMAIL_ENABLED=true
CHANNEL_SIP_ENABLED=true
CHANNEL_TWILIO_ENABLED=true
CHANNEL_WABA_ENABLED=true
CHANNEL_WEBRTC_ENABLED=true

# Configuración de WhatsApp Business API
WABA_PHONE_NUMBER_ID=tu_phone_number_id
WABA_ACCESS_TOKEN=tu_access_token

# Configuración de Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_NUMBER=tu_numero_twilio
TWILIO_ALLOW_AUDIO_FILES=true

# Configuración de Telegram
TELEGRAM_BOT_TOKEN=tu_bot_token
TELEGRAM_ALLOW_AUDIO_FILES=true

# Configuración de WebRTC
WEBRTC_PORT=8080

# Configuración de almacenamiento para audios
STORAGE_TYPE=local
LOCAL_STORAGE_PUBLIC_URL=http://localhost:3000/uploads

# Configuración de correo SMTP
SMTP_HOST=tu_servidor_smtp
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_usuario
SMTP_PASS=tu_contraseña
SMTP_FROM_NAME=Nombre del remitente
SMTP_FROM_EMAIL=email@remitente.com

# Configuración de servicios de voz
SPEECH_SERVICE=elevenlabs  # elevenlabs o deepgram

# Configuración de ElevenLabs
ELEVENLABS_API_KEY=tu_api_key
ELEVENLABS_VOICE_ID=tu_voice_id

# Configuración de Deepgram
DEEPGRAM_API_KEY=tu_api_key
DEEPGRAM_MODEL_SST=nova-2
DEEPGRAM_MODEL_TTS=aura-asteria-en
```

## 🚀 Comandos Disponibles

- `npm run setup-db`: Configura la base de datos principal (tablas genéricas)
- `npm run setup-client-db`: Configura la base de datos del cliente (tablas específicas)
- `npm run mcp-servers`: Gestiona los servidores MCP conectados
- `npm run start-api`: Inicia el servidor API (en modo desarrollo)
- `npm run compile`: Compila el código TypeScript
- `npm start`: Inicia en modo producción (después de la compilación)

## 📚 Estructura del Proyecto

```
src/
├── channels/           # Parsers y envío para cada canal (twilio, waba, etc.)
├── clientConfig/       # Configuración específica del cliente
│   ├── database/       # Base de datos específica del cliente
│   ├── tools/          # Herramientas específicas del cliente
│   ├── scripts/        # Scripts de inicialización del cliente
│   └── prompt.ts       # Prompt del asistente
├── config/             # Configuración general del servidor
├── controllers/        # Controladores de la API (webhook principal)
├── database/           # Configuración y modelos de base de datos genérica
├── schemas/            # Esquemas de validación
├── services/           # Servicios comunes
│   ├── ai/             # Servicios de inteligencia artificial
│   ├── audio/          # Servicios de audio
│   ├── mcp/            # Servicios relacionados con Model Context Protocol
│   └── webrtc/         # Servicios WebRTC
├── utils/              # Utilidades
└── index.ts            # Punto de entrada de la aplicación
```

## 🌐 Soporte Multi-Canal

El asistente soporta múltiples canales de comunicación:

### WhatsApp (Twilio)
- Integración con Twilio para mensajes de WhatsApp
- Soporte para mensajes de voz (STT/TTS)
- Webhook: `/assistant` (formato TwiML)

### WhatsApp Business API (WABA)
- Integración nativa con la API de WhatsApp Business de Meta
- Webhook: `/assistant` (formato JSON)

### Telegram
- Bot de Telegram con soporte para mensajes de texto
- Configurable mediante variables de entorno

### Email
- Integración con servidores SMTP
- Envío y recepción de correos electrónicos

### SIP (Voice Calls)
- Llamadas de voz a través del protocolo SIP
- Integración con servidores SIP

### WebRTC
- Llamadas de voz y video en tiempo real
- Servidor WebSocket para señalización

## 🔧 Configuración de Base de Datos

### Desarrollo Local
Por defecto, la aplicación usa SQLite en desarrollo. Las bases de datos se crean automáticamente:
- `chat.db`: Base de datos principal para conversaciones
- `client.db`: Base de datos específica del cliente

### Producción
En producción, puedes usar **SQL Server** o **Supabase**. Configura las siguientes variables de entorno según el motor:

#### SQL Server
```env
DB_TYPE=sqlserver
DB_USER=usuario_sql_server
DB_PASSWORD=contraseña_sql_server
DB_SERVER=host_sql_server
DB_NAME=nombre_base_datos
```

#### Supabase
```env
DB_TYPE=supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-key-de-supabase
```

## 📝 Uso de la API

### Endpoint Principal
```http
POST /assistant
Content-Type: application/json o application/x-www-form-urlencoded
```

### Identificación de Usuarios
El sistema identifica a los usuarios por la combinación de `provider` y `external_id`, permitiendo conversaciones unificadas aunque el usuario cambie de canal.

### Ejemplo de Respuesta
- **Twilio:** XML (TwiML)
- **WABA:** Mensaje enviado vía API de Meta
- **Telegram:** Mensaje enviado vía API de Telegram
- **Email:** Correo electrónico enviado vía SMTP

## 🔌 Model Context Protocol (MCP) Integration

Esta API incluye integración con Model Context Protocol (MCP), lo que permite conectar el asistente con servidores remotos que exponen recursos y herramientas.

### Gestión de servidores MCP
Puedes gestionar los servidores MCP usando el comando:
```bash
npm run mcp-servers <list|add|update|delete> [args...]
```

Ejemplos:
```bash
# Listar todos los servidores
npm run mcp-servers list

# Agregar un nuevo servidor
npm run mcp-servers add nombre-servidor http://url-del-servidor/mcp version

# Actualizar un servidor existente
npm run mcp-servers update id nombre-servidor http://url-del-servidor/mcp version

# Eliminar un servidor
npm run mcp-servers delete id
```

## 🔄 Extensibilidad

### Agregar Nuevos Canales
1. Crea un nuevo archivo en la carpeta `src/channels/`
2. Implementa las funciones `parseMessage` y `sendMessage`
3. Registra el canal en el dispatcher

### Agregar Nuevas Herramientas
1. Crea un nuevo archivo en `src/clientConfig/tools/`
2. Registra la herramienta en `src/clientConfig/allTools.ts`

## 🚀 Despliegue

### Despliegue en Servidor Local
1. Configura todas las variables de entorno necesarias
2. Ejecuta los comandos de inicialización:
```bash
npm run setup-db
npm run setup-client-db
```
3. Inicia el servidor:
```bash
npm run start-api
```

### Despliegue en Producción
1. Configura las variables de entorno para producción
2. Usa una base de datos SQL Server o Supabase
3. Compila el código TypeScript:
```bash
npm run compile
```
4. Inicia el servidor en modo producción:
```bash
npm start
```

### Despliegue en Servicios en la Nube
El proyecto puede desplegarse en servicios como:
- AWS EC2
- Google Cloud Platform
- Microsoft Azure
- DigitalOcean
- Heroku
- Vercel (para versiones sin WebSocket)

## 📄 Licencia

MIT

## 👥 Contribución

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request