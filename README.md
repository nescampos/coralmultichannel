# WhatsApp AI Assistant API

Una API que proporciona un asistente virtual inteligente para consultas utilizando la API de OpenAI o cualquier servicio compatible con el SDK de OpenAI (configurable por baseURL), ahora con soporte multi-canal (Twilio y WhatsApp Business API nativa) y estructura extensible para más canales.

## 🚀 Características

- Asistente virtual inteligente usando OpenAI o servicios compatibles
- Manejo automático de conversaciones por usuario
- Integración multi-canal: Twilio (WhatsApp/SMS) y WhatsApp Business API nativa (WABA)
- Webhook único y extensible para más canales
- Base de datos SQLite para desarrollo local
- Base de datos SQL Server o Supabase para producción
- Sistema de tools dinámico y extensible (ejecutadas en backend)
- Configuración flexible de modelo y endpoint (baseURL)
- Integración con Model Context Protocol (MCP) para conectar con servidores remotos

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn
- Una cuenta en OpenAI o servicio compatible con su API
- Una cuenta en Twilio (para la integración de mensajería)
- Una cuenta de WhatsApp Business API (opcional, Meta)
- SQL Server o Supabase (solo para producción)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone [url-del-repositorio]
cd agent
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto:
```env
# OpenAI Configuration
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=gpt-3.5-turbo
# Si usas un proveedor alternativo, configura el endpoint:
# OPENAI_BASE_URL=https://api.tu-proveedor.com/v1

# Número máximo de tokens para las respuestas del agente. Por defecto es 512 si no se especifica.
# MAX_TOKENS=

# Cantidad de mensajes previos que se usan como contexto de la conversación. Por defecto es 6 si no se especifica. 
# HISTORY_SIZE= 

# Temperatura del modelo para generar respuestas más aleatorias o fijas
# MODEL_TEMPERATURE=

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration (solo necesario en producción)
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
# O para SQL Server:
# DB_TYPE=sqlserver
# DB_USER=usuario_sql_server
# DB_PASSWORD=contraseña_sql_server
# DB_SERVER=host_sql_server
# DB_NAME=nombre_base_datos

# Twilio (opcional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=...

# WhatsApp Business API (WABA)
WABA_PHONE_NUMBER_ID=...
WABA_ACCESS_TOKEN=...

```

## 🚀 Comandos Disponibles

- `npm run setup-db`: Configura la base de datos (tablas genéricas)
- `npm run setup-client-db`: Configura la base de datos con tablas específicas del cliente (ejecutarlo después de setup-db)
- `npm run start-api`: Inicia el servidor API (en modo developer)
- `npm run compile`: Compila el código TypeScript
- `npm start`: Inicia en modo producción (después de la compilación)

## 📚 Estructura del Proyecto

```
src/
├── channels/       # Parsers y envío para cada canal (twilio, waba, etc.)
├── clientConfig/   # Prompt, configuraciones y tools específicas, para el caso de uso
│   ├── database/   # Lógica y modelos de base de datos específicos del cliente
│   │   ├── IClientDb.ts
│   │   ├── SQLiteClientDb.ts
│   │   ├── SQLServerClientDb.ts
│   │   ├── SupabaseClientDb.ts
│   │   ├── clientDbFactory.ts
│   │   ├── userDebt.ts      # Ejemplo: lógica de deudas específica del cliente
│   └── tools/      # Tools específicas del cliente
│   └── scripts/    # Scripts de inicialización de tablas del cliente
├── controllers/    # Controladores de la API (webhook principal)
├── database/       # Configuración y modelos de la base de datos
├── schemas/        # Esquemas de validación
├── services/       # Lógica común de procesamiento de mensajes
│   └── mcp/        # Servicios relacionados con Model Context Protocol
├── utils/          # Utilidades
├── config/         # Configuración del servidor
```

## 🌐 Soporte Multi-Canal y Webhook Único

- El endpoint `/assistant` acepta mensajes de Twilio y WhatsApp Business API nativa (y es extensible a más canales).
- El sistema detecta automáticamente el canal de origen, normaliza el mensaje y responde usando el formato adecuado:
  - **Twilio:** Responde con XML (TwiML) usando `ResponseHandler`.
  - **WABA:** Envía la respuesta usando la API de Meta.
- Para agregar más canales, solo crea un archivo en `channels/` y actualiza el dispatcher.

## 🔧 Configuración de Base de Datos

### Desarrollo Local
Por defecto, la aplicación usa SQLite en desarrollo. La base de datos se crea automáticamente como `chat.db`.

### Producción
En producción, puedes usar **SQL Server** o **Supabase**. Configura las siguientes variables de entorno según el motor:

#### SQL Server
- DB_TYPE=sqlserver
- DB_USER=usuario_sql_server
- DB_PASSWORD=contraseña_sql_server
- DB_SERVER=host_sql_server
- DB_NAME=nombre_base_datos

#### Supabase
- DB_TYPE=supabase
- SUPABASE_URL=https://your-project.supabase.co
- SUPABASE_KEY=your-supabase-service-role-key

##### Estructura de tablas para Supabase (Postgres):
```sql
CREATE TABLE global_user (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE user_provider_identity (
  id SERIAL PRIMARY KEY,
  global_user_id INTEGER NOT NULL REFERENCES global_user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  UNIQUE (provider, external_id)
);

CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_provider_identity_id INTEGER NOT NULL REFERENCES user_provider_identity(id) ON DELETE CASCADE,
  message TEXT,
  role TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_provider_identity_id ON chat_history(user_provider_identity_id);
CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp);
```

Cambia de entorno usando la variable `NODE_ENV`:
- `development`: Usa SQLite (por defecto)
- `production`: Usa SQL Server o Supabase

## 🏦 Base de datos específica del cliente

Si tu proyecto requiere tablas o lógica de base de datos que **no son genéricas** (por ejemplo, deudas, membresías, etc.), puedes aislarlas en `src/clientConfig/database/`.

- Cada motor soportado (SQLite, SQL Server, Supabase) tiene su propia implementación.
- Usa solo las variables de entorno para la conexión, no depende del core.
- Ejemplo de archivo: `userDebt.ts` (puedes crear más módulos según tus necesidades).

### Estructura de ejemplo

```
src/clientConfig/database/
  IClientDb.ts              # Interfaz común para métodos del cliente
  SQLiteClientDb.ts         # Implementación para SQLite
  SQLServerClientDb.ts      # Implementación para SQL Server
  SupabaseClientDb.ts       # Implementación para Supabase
  clientDbFactory.ts        # Selecciona el motor según la variable de entorno
  userDebt.ts               # Ejemplo: lógica de deudas
src/clientConfig/scripts/
  setupClientDatabase.ts  # Script para crear las tablas del cliente
```

### Inicialización de tablas del cliente

Para crear las tablas específicas del cliente (por ejemplo, `user_debts`), ejecuta:

```bash
npx ts-node src/clientConfig/scripts/setupClientDatabase.ts
```

### Ejemplo de uso en código

```ts
import { getUserDebt, setUserDebt } from './clientConfig/database/userDebt';

const deuda = await getUserDebt('usuario123');
await setUserDebt('usuario123', 100);
```

> Puedes crear más módulos en `clientConfig/database/` para otras tablas o lógica específica del cliente.

---

## 📝 Uso de la API y Webhook

### Endpoint Principal
```http
POST /assistant
Content-Type: application/json o application/x-www-form-urlencoded

// Twilio:
Body=mensaje_del_usuario&From=numero_telefono

// WhatsApp Business API:
{
  "messages": [
    { "from": "numero_telefono", "text": { "body": "mensaje_del_usuario" }, ... }
  ]
}
```


### Flujo de identificación y guardado de mensajes
- El backend identifica a cada usuario por la combinación de `provider` y `external_id`.
- Si la identidad no existe, se crea un nuevo usuario global y la identidad.
- Todos los mensajes se asocian a la identidad de usuario por proveedor, permitiendo conversaciones unificadas aunque el usuario cambie de canal.

### Ejemplo de Respuesta
- **Twilio:** XML (TwiML)
- **WABA:** Mensaje enviado vía API de Meta
- **Otros canales:** Adaptable

## 🔌 Integración con Model Context Protocol (MCP)

Esta API ahora incluye integración con Model Context Protocol (MCP), lo que permite conectar el asistente con servidores remotos que exponen recursos y herramientas. Esta integración amplía las capacidades del asistente sin necesidad de implementar cada herramienta localmente.

### Configuración de servidores MCP

Para conectar con servidores MCP remotos, debes configurarlos en el archivo `src/config/mcpServers.ts`:

```typescript
export const mcpServers: MCPServerConfig[] = [
  {
    url: "http://localhost:3001/mcp",
    name: "example-server",
    version: "1.0.0"
  },
  // Agrega más servidores según sea necesario
];
```

### Funcionamiento

1. Al iniciar el servidor, se conectarán automáticamente los servidores MCP configurados.
2. Las herramientas disponibles en estos servidores se registrarán y estarán disponibles para el asistente.
3. Cuando el modelo necesite usar una herramienta, verificará tanto las herramientas locales como las disponibles en los servidores MCP.
4. Los resultados de las herramientas se manejan de la misma manera que las herramientas locales.

### Ventajas

- **Extensibilidad**: Agrega nuevas funcionalidades conectándote a servidores MCP sin modificar el código local.
- **Modularidad**: Cada servidor MCP puede proporcionar un conjunto específico de herramientas y recursos.
- **Desacoplamiento**: Las herramientas se ejecutan en sus servidores respectivos, reduciendo la carga en el servidor principal.

## 🔄 Extensibilidad

### Agregar Nuevos Canales
1. Crea un nuevo archivo en la carpeta `channels/` (ej: `telegram.ts`)
2. Implementa el parser y el sender para ese canal
3. Agrega la propiedad `CHANNEL_TYPE` para especificar el nombre del canal a registrar en la base de datos para las conversaciones (por ejemplo WABA y Twilio se registran como `whatsapp`)
4. Regístralo en el dispatcher de canales

### Agregar Nuevas Tools
1. Crea un nuevo archivo en la carpeta `tools/` (tools genéricas, disponibles para todas las instancias)
2. O crea un archivo en `clientConfig/tools/` (tools específicas para un cliente)
3. Registra la tool en el archivo correspondiente (`tools/allGeneralTools.ts` para genéricas, o en el export de `clientConfig/allTools.ts` para específicas)
4. En el export final de `clientConfig/allTools.ts`, combina ambas:

```ts
import { tools as generalTools } from "../tools/allGeneralTools";
import { getStatusTool } from "./tools/getStatus";

export const tools = {
  ...generalTools,
  get_status: getStatusTool,
  // ...otras tools específicas
};
```

- Las tools específicas pueden sobrescribir a las genéricas si tienen el mismo nombre.
- Así, cada instancia puede tener tools propias y las generales siempre estarán disponibles.

> **Recomendación:** Cada nueva tool debería considerar un parámetro llamado `externalId` para recibir el identificador del usuario. Esto permite la identificación multi-canal y la trazabilidad correcta de las acciones del usuario.

## 📄 Licencia

MIT

## 👥 Contribución

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

# WhatsApp AI Assistant API (English)

An API that provides a smart virtual assistant for queries using the OpenAI API or any service compatible with the OpenAI SDK (configurable via baseURL), now with multi-channel support (Twilio and native WhatsApp Business API) and an extensible structure for more channels.

## 🚀 Features

- Smart virtual assistant using OpenAI or compatible services
- Automatic per-user conversation management
- Multi-channel integration: Twilio (WhatsApp/SMS) and native WhatsApp Business API (WABA)
- Single, extensible webhook for all channels
- SQLite database for local development
- SQL Server or Supabase database for production
- Dynamic and extensible tools system (executed in backend)
- Flexible model and endpoint (baseURL) configuration
- Integration with Model Context Protocol (MCP) to connect to remote servers

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- An OpenAI account or compatible API service
- A Twilio account (for messaging integration)
- A WhatsApp Business API (Meta) account (optional)
- SQL Server or Supabase (production only)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone [repo-url]
cd agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
# If using an alternative provider, set the endpoint:
# OPENAI_BASE_URL=https://api.your-provider.com/v1

# Maximum number of tokens for agent responses. Default is 512 if not set. 
# MAX_TOKENS=

# Number of previous messages to include as conversation context. Default is 6 if not set.  
# HISTORY_SIZE=

# Model temperature to generate more random or fixed responses
# MODEL_TEMPERATURE=

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration (production only)
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
# Or for SQL Server:
# DB_TYPE=sqlserver
# DB_USER=sql_server_user
# DB_PASSWORD=sql_server_password
# DB_SERVER=sql_server_host
# DB_NAME=database_name

# Twilio (optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=...

# WhatsApp Business API (WABA)
WABA_PHONE_NUMBER_ID=...
WABA_ACCESS_TOKEN=...

```

## 🚀 Available Commands

- `npm run setup-db`: Setup the database (generic tables)
- `npm run setup-client-db`: Setup the database with client tables (run after setup-db)
- `npm run start-api`: Start the API server (development mode)
- `npm run compile`: Compile TypeScript code
- `npm start`: Start in a production mode (after compilation)

## 📚 Project Structure

```
src/
├── channels/       # Parsers and senders for each channel (twilio, waba, etc.)
├── clientConfig/   # Prompt, configurations and specific tools for the use case
│   ├── database/   # Client-specific database logic and models
│   │   ├── IClientDb.ts
│   │   ├── SQLiteClientDb.ts
│   │   ├── SQLServerClientDb.ts
│   │   ├── SupabaseClientDb.ts
│   │   ├── clientDbFactory.ts
│   │   ├── userDebt.ts      # Example: client-specific debt logic
│   └── tools/      # Client-specific tools
│   └── scripts/    # Client table initialization scripts
├── controllers/    # API controllers (main webhook)
├── database/       # Database config and models
├── schemas/        # Validation schemas
├── services/       # Common message processing logic
│   └── mcp/        # Services related to Model Context Protocol
├── utils/          # Utilities
├── config/         # Server configuration
```

## 🌐 Multi-Channel Support & Single Webhook

- The `/assistant` endpoint accepts messages from Twilio and native WhatsApp Business API (and is extensible to more channels).
- The system automatically detects the source channel, normalizes the message, and responds using the appropriate format:
  - **Twilio:** Responds with XML (TwiML) using `ResponseHandler`.
  - **WABA:** Sends the response using Meta's API.
- To add more channels, just create a file in `channels/` and update the dispatcher.

## 🔧 Database Configuration

### Local Development
By default, the app uses SQLite in development. The database is automatically created as `chat.db`.

### Production
In production, you can use **SQL Server** or **Supabase**. Set the following environment variables according to your engine:

#### SQL Server
- DB_TYPE=sqlserver
- DB_USER=sql_server_user
- DB_PASSWORD=sql_server_password
- DB_SERVER=sql_server_host
- DB_NAME=database_name

#### Supabase
- DB_TYPE=supabase
- SUPABASE_URL=https://your-project.supabase.co
- SUPABASE_KEY=your-supabase-service-role-key

##### Table structure for Supabase (Postgres):
```sql
CREATE TABLE global_user (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE user_provider_identity (
  id SERIAL PRIMARY KEY,
  global_user_id INTEGER NOT NULL REFERENCES global_user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  UNIQUE (provider, external_id)
);

CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_provider_identity_id INTEGER NOT NULL REFERENCES user_provider_identity(id) ON DELETE CASCADE,
  message TEXT,
  role TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_provider_identity_id ON chat_history(user_provider_identity_id);
CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp);
```

Switch environments using the `NODE_ENV` variable:
- `development`: Uses SQLite (default)
- `production`: Uses SQL Server or Supabase

## 🏦 Client-Specific Database

If your project requires database tables or logic that are **not generic** (e.g., debts, memberships, etc.), you can isolate them in `src/clientConfig/database/`.

- Each supported engine (SQLite, SQL Server, Supabase) has its own implementation.
- Uses only environment variables for connection, does not depend on the core.
- Example file: `userDebt.ts` (you can create more modules as needed).

### Example structure for a debt table

```
src/clientConfig/database/
  IClientDb.ts              # Common interface for client methods
  SQLiteClientDb.ts         # SQLite implementation
  SQLServerClientDb.ts      # SQL Server implementation
  SupabaseClientDb.ts       # Supabase implementation
  clientDbFactory.ts        # Selects engine based on env variable
  userDebt.ts               # Example: debt logic
src/clientConfig/scripts/
  setupClientDatabase.ts  # Script to create client tables
```

### Client table initialization

To create client-specific tables (e.g., `user_debts`), run:

```bash
npx ts-node src/clientConfig/scripts/setupClientDatabase.ts
```

### Example usage in code

```ts
import { getUserDebt, setUserDebt } from './clientConfig/database/userDebt';

const debt = await getUserDebt('user123');
await setUserDebt('user123', 100);
```

> You can create more modules in `clientConfig/database/` for other client-specific tables or logic.


## 📝 API Usage & Webhook

### Main Endpoint
```http
POST /assistant
Content-Type: application/json or application/x-www-form-urlencoded

// Twilio:
Body=user_message&From=phone_number

// WhatsApp Business API:
{
  "messages": [
    { "from": "phone_number", "text": { "body": "user_message" }, ... }
  ]
}
```

### Identification and message storage flow
- The backend identifies each user by the combination of `provider` and `external_id`.
- If the identity does not exist, a new global user and identity are created.
- All messages are associated with the user-provider identity, allowing unified conversations even if the user switches channels.

### Example Response
- **Twilio:** XML (TwiML)
- **WABA:** Message sent via Meta API
- **Other channels:** Adaptable

## 🔌 Model Context Protocol (MCP) Integration

This API now includes integration with Model Context Protocol (MCP), which allows the assistant to connect to remote servers that expose resources and tools. This integration expands the assistant's capabilities without needing to implement each tool locally.

### MCP Server Configuration

To connect to remote MCP servers, you need to configure them in the file `src/config/mcpServers.ts`:

```typescript
export const mcpServers: MCPServerConfig[] = [
  {
    url: "http://localhost:3001/mcp",
    name: "example-server",
    version: "1.0.0"
  },
  // Add more servers as needed
];
```

### How It Works

1. When the server starts, it will automatically connect to the configured MCP servers.
2. Tools available on these servers will be registered and made available to the assistant.
3. When the model needs to use a tool, it will check both local tools and those available on MCP servers.
4. Tool results are handled in the same way as local tools.

### Benefits

- **Extensibility**: Add new functionalities by connecting to MCP servers without modifying local code.
- **Modularity**: Each MCP server can provide a specific set of tools and resources.
- **Decoupling**: Tools run on their respective servers, reducing the load on the main server.

## 🔄 Extensibility

### Adding New Channels
1. Create a new file in the `channels/` folder (e.g., `telegram.ts`)
2. Implement the parser and sender for that channel
3. Add the `CHANNEL_TYPE` property to specify the name of the channel to register in the database for conversations (for example WABA and Twilio are registered as `whatsapp`)
4. Register it in the channel dispatcher

### Adding New Tools
1. Create a new file in the `tools/` folder (generic tools, available for all instances)
2. Or create a file in `clientConfig/tools/` (client-specific tools)
3. Register the tool in the corresponding file (`tools/allGeneralTools.ts` for generic, or in the export of `clientConfig/allTools.ts` for specific)
4. In the final export of `clientConfig/allTools.ts`, combine both:

```ts
import { tools as generalTools } from "../tools/allGeneralTools";
import { getStatusTool } from "./tools/getStatus";

export const tools = {
  ...generalTools,
  get_status: getStatusTool,
  // ...other client-specific tools
};
```

- Client-specific tools can overwrite generic ones if they have the same name.
- This way, each instance can have its own tools and the generic ones will always be available.

> **Recommendation:** Every new tool should consider a parameter called `externalId` to receive the user's identifier. This allows for multi-channel identification and proper traceability of user actions.

## 📄 License

MIT

## 👥 Contribution

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request