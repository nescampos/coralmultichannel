import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { ToolConfig } from "../../utils/toolConfig";
import { MCPServerService } from "./mcpServerService";
import "dotenv/config";

const coralServerUrl = process.env.CORAL_SERVER_URL;
const coralAgentId = process.env.CORAL_AGENT_ID;
const coralAgentDescription = process.env.CORAL_AGENT_DESCRIPTION;

interface MCPClientConfig 
{
    url: string;
    name: string;
    version: string;
}

type ContentItem = 
  | { type: 'text'; text: string; _meta?: any }
  | { type: 'image'; data: string; mimeType: string; _meta?: any }
  | { type: 'audio'; data: string; mimeType: string; _meta?: any }
  | { type: 'resource_link'; uri: string; _meta?: any }
  | { type: 'resource'; id: string; _meta?: any };

export class MCPClientManager 
{
    private clients: Map<string, Client> = new Map();
    private tools: Map<string, ToolConfig> = new Map();
    private serverConfigs: MCPClientConfig[] = [];
    
    // Initialize with server configurations
    constructor(serverConfigs: MCPClientConfig[] = []) {
        this.serverConfigs = serverConfigs;
    }
    
    // Connect to all configured MCP servers
    async connectAll(): Promise<void> {
        // If no server configs were provided, load them from the database
        if (this.serverConfigs.length === 0) {
            this.serverConfigs = await MCPServerService.getServerConfigs();
        }

        console.log(`Connecting to ${this.serverConfigs.length} MCP servers...`);

        for (const config of this.serverConfigs) {
            try {
                await this.addClient(config);
                console.log(`Connected to MCP server: ${config.name}`);
            } catch (error) {
                console.error(`Error connecting to MCP server ${config.name}:`, error);
            }
        }
        if (coralServerUrl && coralAgentId && coralAgentDescription) {
            const queryString = `?agentId=${encodeURIComponent(coralAgentId)}&agentDescription=${encodeURIComponent(coralAgentDescription)}`;
            const coralServer = new SSEClientTransport(new URL(coralServerUrl + queryString));
            const coralClient = new Client({name: "coral",version: "1.0.0",agentId: coralAgentId,agentDescription: coralAgentDescription});
            await coralClient.connect(coralServer);
            this.clients.set("coral", coralClient);
            console.log(`Connected to Coral server`);
        }
    }
    
    async addClient(config: MCPClientConfig): Promise<void> 
    {
        try 
        {
            // Check if already connected
            if (this.clients.has(config.name)) {
                console.log(`Already connected to MCP server: ${config.name}`);
                return;
            }
            
            const transport = new StreamableHTTPClientTransport(new URL(config.url));
            const client = new Client({name: config.name,version: config.version,});
            
            await client.connect(transport);
            this.clients.set(config.name, client);
            
            // Registrar las tools disponibles en este servidor
            await this.registerToolsFromServer(client, config.name);
        } 
        catch (error) 
        {
            console.error(`Error connecting to MCP server ${config.name}:`, error);
            throw error;
        }
    }
    
    async registerToolsFromServer(client: Client, serverName: string): Promise<void> 
    {
        try 
        {
            // Obtener las herramientas disponibles del servidor
            const toolsResponse = await client.listTools();
        
            // Convert the Zod object to a plain JavaScript array
            //const toolsList = Array.isArray(toolsResponse) ? toolsResponse : Object.values(toolsResponse);
            
            //console.log("Tools list: ", toolsList);
            // Registrar cada herramienta como una tool local
            for (const tool of toolsResponse.tools) 
            {
                const toolName = `${serverName}_${tool.name}`;
                const toolConfig: ToolConfig = 
                {
                    definition: {
                        type: "function",
                        function: {
                            name: toolName,
                            description: tool.description || "",
                            parameters: tool.inputSchema as any
                        }
                    },
                    handler: async (args: any) => {
                        try {
                            // Check if client is still connected
                            if (!this.clients.has(serverName)) {
                                throw new Error(`Client ${serverName} is not connected`);
                            }
                            
                            const result = await client.callTool({
                                name: tool.name,
                                arguments: args
                            });
                            
                            if (result.content && Array.isArray(result.content)) {
                                return result.content
                                    .map((item: ContentItem) => {
                                        switch (item.type) {
                                            case 'text':
                                                return item.text;
                                            case 'image':
                                            case 'audio':
                                                return `[${item.type} data: ${item.mimeType}]`;
                                            case 'resource_link':
                                                return `[Resource Link: ${item.uri}]`;
                                            case 'resource':
                                                return `[Resource ID: ${item.id}]`;
                                            default:
                                                return JSON.stringify(item);
                                        }
                                    })
                                    .join('\n');
                            }
                            return JSON.stringify(result);
                        } catch (error) {
                            console.error(`Error calling tool ${tool.name} on server ${serverName}:`, error);
                            throw error;
                        }
                    }
                };
           
                this.tools.set(toolName, toolConfig);
                //console.log(`Registered tool ${toolName} from server ${serverName}`);
            }
        } catch (error) {
            console.error(`Error registering tools from server ${serverName}:`, error);
        }
    }
    
    getClients(): Map<string, Client> {
        return this.clients;
    }
    
    getTools(): Map<string, ToolConfig> {
        return this.tools;
    }
    
    // Check if a client is still connected
    isClientConnected(serverName: string): boolean {
        return this.clients.has(serverName);
    }
    
    // Reconnect to a specific server
    async reconnectClient(serverName: string): Promise<void> {
        const config = this.serverConfigs.find(c => c.name === serverName);
        if (!config) {
            throw new Error(`Server configuration not found for ${serverName}`);
        }
        
        // Remove existing client if present
        if (this.clients.has(serverName)) {
            const existingClient = this.clients.get(serverName);
            if (existingClient) {
                try {
                    await existingClient.close();
                } catch (error) {
                    console.error(`Error closing existing connection to ${serverName}:`, error);
                }
            }
            this.clients.delete(serverName);
        }
        
        // Remove tools associated with this server
        for (const [toolName, _] of this.tools) {
            if (toolName.startsWith(`${serverName}_`)) {
                this.tools.delete(toolName);
            }
        }
        
        // Reconnect
        await this.addClient(config);
    }
    
    // Reconnect all clients
    async reconnectAll(): Promise<void> {
        // Clear existing connections and tools
        await this.disconnectAll();
        
        // Reload server configurations from database
        this.serverConfigs = await MCPServerService.getServerConfigs();
        
        // Reconnect to all servers
        await this.connectAll();
    }
    
    // Refresh server configurations from database
    async refreshServerConfigs(): Promise<void> {
        this.serverConfigs = await MCPServerService.getServerConfigs();
    }
    
    async disconnectAll(): Promise<void> {
            for (const [name, client] of this.clients) {
                try {
                    await client.close();
                    console.log(`Disconnected from MCP server: ${name}`);
                } catch (error) {
                    console.error(`Error disconnecting from MCP server ${name}:`, error);
                }
            }
            this.clients.clear();
            this.tools.clear();
        }
    }