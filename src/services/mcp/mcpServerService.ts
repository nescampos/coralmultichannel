import { db } from '../../database/db';

export interface MCPServer {
  id: number;
  name: string;
  url: string;
  version: string;
}

export class MCPServerService {
  /**
   * Obtiene todos los servidores MCP configurados.
   */
  static async getAllServers(): Promise<MCPServer[]> {
    return await db.getMCPServers();
  }

  /**
   * Agrega un nuevo servidor MCP.
   */
  static async addServer(name: string, url: string, version: string): Promise<number> {
    return await db.addMCPServer(name, url, version);
  }

  /**
   * Actualiza un servidor MCP existente.
   */
  static async updateServer(id: number, name: string, url: string, version: string): Promise<void> {
    return await db.updateMCPServer(id, name, url, version);
  }

  /**
   * Elimina un servidor MCP.
   */
  static async deleteServer(id: number): Promise<void> {
    return await db.deleteMCPServer(id);
  }

  /**
   * Obtiene la configuración de todos los servidores MCP en el formato esperado por el MCPClientManager.
   */
  static async getServerConfigs(): Promise<Array<{ name: string, url: string, version: string }>> {
    const servers = await this.getAllServers();
    return servers.map(server => ({
      name: server.name,
      url: server.url,
      version: server.version
    }));
  }
}