import { WebSocketServer } from 'ws';
import { parseWebRTCMessage, sendWebRTCResponse } from '../../channels/webrtc';
import { messageService } from '../messageService';

export class WebRTCServer {
  private wss: WebSocketServer;
  private sessions = new Map<string, any>();

  constructor(port?: number) {
    // Si no se pasa un servidor HTTP, crear uno independiente
    if (port) {
      this.wss = new WebSocketServer({ port });
    } else {
      // Intentar usar el servidor HTTP existente
      this.wss = new WebSocketServer({ 
        port: 3001, // Puerto separado para WebSocket
        path: '/voice'
      });
    }
    
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = this.generateSessionId();
      this.sessions.set(sessionId, ws);

      console.log(`WebSocket connection established: ${sessionId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Solo procesar mensajes de audio y texto, no los de control
          if (message.type === 'audio' || message.type === 'text') {
            const parsedMessage = await parseWebRTCMessage(message);
            
            // Procesar con el asistente
            const response = await messageService.processUserMessage(
              'webrtc', 
              parsedMessage.from, 
              parsedMessage.text
            );

            // Enviar respuesta
            const audioResponse = await sendWebRTCResponse(
              parsedMessage.from, 
              response, 
              sessionId
            );

            ws.send(JSON.stringify(audioResponse));
          } else if (message.type === 'call_start') {
            // Confirmar inicio de llamada
            ws.send(JSON.stringify({
              type: 'call_started',
              sessionId: sessionId,
              message: 'Llamada iniciada correctamente'
            }));
          } else if (message.type === 'call_end') {
            // Confirmar fin de llamada
            ws.send(JSON.stringify({
              type: 'call_ended',
              sessionId: sessionId,
              message: 'Llamada terminada'
            }));
          }
        } catch (error: any) {
          console.error('WebSocket error:', error);
          ws.send(JSON.stringify({ 
            type: 'error',
            error: error.message 
          }));
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket connection closed: ${sessionId}`);
        this.sessions.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.sessions.delete(sessionId);
      });
    });

    this.wss.on('listening', () => {
      console.log('WebRTC WebSocket server is listening');
    });
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
