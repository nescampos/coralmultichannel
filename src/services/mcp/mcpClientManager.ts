import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ToolConfig } from "../../utils/toolConfig";

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
    async addClient(config: MCPClientConfig): Promise<void> 
    {
        try 
        {
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