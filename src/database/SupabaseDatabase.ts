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


  async close(): Promise<void> {
    // No persistent connection to close in Supabase
  }
} 