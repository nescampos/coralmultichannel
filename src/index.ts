import fastifyModule from 'fastify';
import formbody from '@fastify/formbody';
import { serverConfig, serverListenConfig } from './config/server';
import { assistantRequestSchema } from './schemas/requestSchemas';
import { ServerLifecycle } from './utils/serverLifecycle';
import { AssistantController } from './controllers/assistantController';
import path from 'path';

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

    try {
        await fastify.listen(serverListenConfig);
        console.log(`Server running at http://${serverListenConfig.host}:${serverListenConfig.port}/`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Start the server
startServer();