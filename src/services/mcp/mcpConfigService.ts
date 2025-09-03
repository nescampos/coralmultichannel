import { IDatabase, MCPServerConfig } from '../../database/IDatabase';
import { DatabaseFactory } from '../../database/DatabaseFactory';

export class MCPConfigService {
    private db: IDatabase;

    constructor(database?: IDatabase) {
        this.db = database || DatabaseFactory.createDatabase();
    }

    /**
     * Get all active MCP servers
     */
    async getServers(): Promise<MCPServerConfig[]> {
        return this.db.getMCPServers();
    }

    /**
     * Add or update an MCP server
     */
    async saveServer(server: MCPServerConfig): Promise<void> {
        await this.db.saveMCPServer(server);
    }

    /**
     * Delete an MCP server by name
     */
    async deleteServer(name: string): Promise<void> {
        await this.db.deleteMCPServer(name);
    }

    /**
     * Get a specific MCP server by name
     */
    async getServer(name: string): Promise<MCPServerConfig | null> {
        const servers = await this.db.getMCPServers();
        return servers.find(s => s.name === name) || null;
    }

    /**
     * Initialize default MCP servers if none exist
     */
    async initializeDefaultServers(): Promise<void> {
        const servers = await this.getServers();
        if (servers.length === 0) {
            const defaultServers: MCPServerConfig[] = [
                {
                    name: 'gitmcp',
                    url: 'https://gitmcp.io/docs',
                    version: '1.0.0',
                    isActive: true
                }
            ];

            for (const server of defaultServers) {
                await this.saveServer(server);
            }
        }
    }
}

// Export a singleton instance
export const mcpConfigService = new MCPConfigService();
