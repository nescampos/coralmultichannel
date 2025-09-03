import { parseMessage, sendMessage } from '../channels';
import { FastifyRequest, FastifyReply } from 'fastify';
import { messageService } from '../services/messageService';
import { db } from '../database/db';
import { tools } from '../clientConfig/allTools';
import { assistantPrompt } from '../clientConfig/prompt';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { aiConfig } from '../config/ai';
import { CHANNEL_META_MAP } from "../channels";

function sendError(reply: FastifyReply, error: unknown) {
  reply.status(500).send({ error: (error instanceof Error ? error.message : String(error)) });
}

const openai = new OpenAI(aiConfig.openaiConfig);
const { model, maxTokens, historySize, modelTemperature } = aiConfig;

// Convertir nuestras tools al formato que espera el SDK de OpenAI
const openaiTools = Object.values(tools).map(tool => tool.definition);

export class AssistantController {
  static async handleMessage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { from, text, provider, isAudio } = await parseMessage(request.body);
      const responseText = await messageService.processUserMessage(provider, from, text);
      await sendMessage(provider, from, responseText, reply, isAudio);
      if (provider !== 'twilio') {
        reply.send({ success: true });
      }
    } catch (error) {
      sendError(reply, error);
    }
  }

  static async processAIMessage(provider: string, externalId: string, text: string, name?: string): Promise<string> {
    // Recuperar historial reciente
    const channelType = CHANNEL_META_MAP[provider]?.CHANNEL_TYPE || provider;
    const recentMessages = await db.getRecentMessagesByProvider(channelType, externalId, historySize);
    const history: ChatCompletionMessageParam[] = recentMessages
      .reverse()
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.message }));
    
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: assistantPrompt },
      ...history,
      { role: 'user', content: text }
    ];
    
    // Llamada inicial al modelo con las tools disponibles
    let response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: modelTemperature,
      tools: openaiTools, // Pasamos las tools al modelo
      tool_choice: "auto" // Dejamos que el modelo decida cuándo usar una tool
    });
    
    let message = response.choices[0].message;
    let content = message?.content ?? '';
    
    // Verificar si el modelo quiere usar una tool
    if (message?.tool_calls) {
      // Agregar el mensaje del assistant al historial
      messages.push({ role: 'assistant', content: null, tool_calls: message.tool_calls });
      
      // Ejecutar cada tool que el modelo quiere usar
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const tool = tools[toolName];
        
        if (tool) {
          try {
            // Parsear los argumentos de la tool
            const args = JSON.parse(toolCall.function.arguments);
            
            // Agregar externalId si es necesario y no está presente
            if (tool.definition.function.parameters.properties.externalId && !args.externalId) {
              args.externalId = externalId;
            }
            //console.log("External Id", externalId);
            //console.log("Args", args);
            // Verificar parámetros requeridos
            const required = tool.definition.function.parameters.required || [];
            for (const req of required) {
              if (!(req in args)) {
                throw new Error(`Falta el parámetro requerido: ${req}`);
              }
            }
            
            // Ejecutar la tool
            const toolResult = await tool.handler(args);
            
            // Agregar el resultado de la tool al historial
            messages.push({
              role: 'tool',
              //name: toolName,
              content: toolResult,
              tool_call_id: toolCall.id
            });
          } catch (error) {
            // En caso de error, reportarlo al modelo
            messages.push({
              role: 'tool',
              //name: toolName,
              content: `Error ejecutando la tool: ${error instanceof Error ? error.message : String(error)}`,
              tool_call_id: toolCall.id
            });
          }
        } else {
          // Si la tool no existe, reportar el error
          messages.push({
            role: 'tool',
            //name: toolName,
            content: `Error: La tool "${toolName}" no está disponible`,
            tool_call_id: toolCall.id
          });
        }
      }
      
      // Obtener la respuesta final del modelo después de ejecutar las tools
      response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: modelTemperature
      });
      
      content = response.choices[0].message?.content ?? '';
    }
    
    // Guardar mensajes en la base de datos
    await db.saveMessageByProvider(channelType, externalId, text, 'user', name);
    await db.saveMessageByProvider(channelType, externalId, content, 'assistant', name);
    
    return content;
  }
}