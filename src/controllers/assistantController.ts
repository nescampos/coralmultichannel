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

// Utilidad para parsear los parámetros del string tipo key="value", key2="value2"
function parseParams(paramsRaw: string): Record<string, any> {
  const regex = /(\w+)\s*=\s*"(.*?)"/g;
  const params: Record<string, string> = {};
  let match;
  while ((match = regex.exec(paramsRaw)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

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
    //console.log('Processing AI message:', { provider, externalId, text }); // Debug log
    
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
    
    let response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: modelTemperature
    });
    let content = response.choices[0].message?.content ?? '';
    
    // More flexible regex to match tool calls
    // This will match formats like:
    // [TOOL_CALL] get_status()
    // [get_status()]
    // get_status()
    const toolCallMatch = content.match(/(?:$[^$]*$(?:\s*))?(\w+)\(([^)]*)\)/);
    if (toolCallMatch) {
      const [, toolName, paramsRaw] = toolCallMatch;
      // Normalize tool name (remove TOOL_CALL prefix if present)
      const normalizedToolName = toolName.replace(/^TOOL_CALL\s+/, '').trim();
      const tool = tools[normalizedToolName];
      if (!tool) throw new Error(`Tool ${normalizedToolName} not found`);
      let params = parseParams(paramsRaw);
      if (tool.definition.function.parameters.properties.externalId && !params.externalId) {
        params.externalId = externalId;
      }
      const required = tool.definition.function.parameters.required || [];
      for (const req of required) {
        if (!(req in params)) {
          throw new Error(`Falta el parámetro requerido: ${req}`);
        }
      }
      const toolResult = await tool.handler(params);
      messages.push({ role: 'assistant', content });
      messages.push({ role: 'function', name: normalizedToolName, content: toolResult });
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