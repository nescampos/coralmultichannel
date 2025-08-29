import { FastifyServerOptions } from 'fastify';
import 'dotenv/config';

export const serverConfig: FastifyServerOptions = {
    logger: process.env.NODE_ENV === 'production',
    connectionTimeout: 30000,
    keepAliveTimeout: 30000,
    maxRequestsPerSocket: 0,
};


export const serverListenConfig = {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    backlog: 511, // Optimize for high concurrency
    webrtc: {
        port: process.env.WEBRTC_PORT ? Number(process.env.WEBRTC_PORT) : undefined,
    }
}; 