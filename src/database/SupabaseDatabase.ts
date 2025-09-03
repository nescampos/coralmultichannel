import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IDatabase } from './IDatabase';

export class SupabaseDatabase implements IDatabase {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async initialize(): Promise<void> {
    // No-op: Supabase tables must be created manually in the dashboard.
  }

  async getOrCreateUserProviderIdentity(provider: string, externalId: string, name?: string): Promise<{ identityId: number, globalUserId: number }> {
    // Buscar identidad existente
    const { data, error } = await this.client
      .from('user_provider_identity')
      .select('id, global_user_id')
      .eq('provider', provider)
      .eq('external_id', externalId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      return { identityId: data.id, globalUserId: data.global_user_id };
    }
    // Crear global_user
    const { data: userData, error: userError } = await this.client
      .from('global_user')
      .insert({ name: name || externalId })
      .select('id')
      .single();
    if (userError) throw userError;
    const globalUserId = userData.id;
    // Crear identidad
    const { data: identityData, error: identityError } = await this.client
      .from('user_provider_identity')
      .insert({ global_user_id: globalUserId, provider, external_id: externalId })
      .select('id')
      .single();
    if (identityError) throw identityError;
    return { identityId: identityData.id, globalUserId };
  }

  async saveMessageByProvider(provider: string, externalId: string, message: string, role: 'user' | 'assistant', name?: string): Promise<void> {
    const { identityId } = await this.getOrCreateUserProviderIdentity(provider, externalId, name);
    const { error } = await this.client
      .from('chat_history')
      .insert({ user_provider_identity_id: identityId, message, role, timestamp: new Date().toISOString() });
    if (error) throw error;
  }

  async getRecentMessagesByProvider(provider: string, externalId: string, limit: number = 10): Promise<Array<{message: string, role: string, timestamp: string}>> {
    const { data: identity, error: identityError } = await this.client
      .from('user_provider_identity')
      .select('global_user_id')
      .eq('provider', provider)
      .eq('external_id', externalId)
      .maybeSingle();
    if (identityError) throw identityError;
    if (!identity || !identity.global_user_id) return [];
    const { data, error } = await this.client
      .from('chat_history')
      .select('message, role, timestamp, user_provider_identity:user_provider_identity_id (provider)')
      .eq('user_provider_identity.global_user_id', identity.global_user_id)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(item => ({
      message: item.message,
      role: item.role,
      timestamp: item.timestamp
      // Incluimos el provider en la respuesta por si es necesario
      //provider: (item as any).user_provider_identity?.provider
    }));
  }


  /**
   * Obtiene todos los servidores MCP configurados.
   */
  async getMCPServers(): Promise<Array<{ id: number, name: string, url: string, version: string }>> {
    const { data, error } = await this.client
      .from('mcp_servers')
      .select('id, name, url, version')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      url: item.url,
      version: item.version
    }));
  }

  /**
   * Agrega un nuevo servidor MCP.
   */
  async addMCPServer(name: string, url: string, version: string): Promise<number> {
    const { data, error } = await this.client
      .from('mcp_servers')
      .insert({ name, url, version })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  /**
   * Actualiza un servidor MCP existente.
   */
  async updateMCPServer(id: number, name: string, url: string, version: string): Promise<void> {
    const { error } = await this.client
      .from('mcp_servers')
      .update({ name, url, version })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Elimina un servidor MCP.
   */
  async deleteMCPServer(id: number): Promise<void> {
    const { error } = await this.client
      .from('mcp_servers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async close(): Promise<void> {
    // No persistent connection to close in Supabase
  }
} 