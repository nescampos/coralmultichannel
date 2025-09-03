import fastifyModule from 'fastify';
import formbody from '@fastify/formbody';
import { serverConfig, serverListenConfig } from './config/server';
import { assistantRequestSchema } from './schemas/requestSchemas';
import { ServerLifecycle } from './utils/serverLifecycle';
import { AssistantController } from './controllers/assistantController';
import path from 'path';
import { WebRTCServer } from './services/webrtc/websocketServer';
import { mcpClientManager } from './controllers/assistantController';

async function startServer() {
    // Initialize Fastify with configuration
    const fastify = fastifyModule(serverConfig);

    // Register plugins
    await fastify.register(formbody);

    await fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, '../uploads'),
        prefix: '/uploads/',
    });

    // Initialize database
    await ServerLifecycle.initializeDatabase();

    // Register routes
    fastify.post('/assistant', { schema: assistantRequestSchema }, AssistantController.handleMessage);

    // Register shutdown handlers
    ServerLifecycle.registerShutdownHandlers(fastify);
    
    // Add MCP client manager to shutdown handlers
    // const originalShutdownHandler = ServerLifecycle.shutdownHandler;
    // ServerLifecycle.shutdownHandler = async (signal: string) => {
    //     console.log(`Received ${signal}. Shutting down MCP connections...`);
    //     await mcpClientManager.disconnectAll();
    //     await originalShutdownHandler(signal);
    // };

    try {
        await fastify.listen(serverListenConfig);
        console.log(`Server running at http://${serverListenConfig.host}:${serverListenConfig.port}/`);
        // Inicializar servidor WebSocket para WebRTC después de que Fastify esté corriendo
        if(serverListenConfig.webrtc.port !== undefined){
            new WebRTCServer(serverListenConfig.webrtc.port);
            console.log(`WebRTC WebSocket server initialized on port ${serverListenConfig.webrtc.port}`);
        }
        
    } catch (err) {
        console.log(err);
        fastify.log.error(err);
        process.exit(1);
    }
}

// Start the server
startServer();