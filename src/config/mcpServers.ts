// Configuración de servidores MCP
// Este archivo debe ser actualizado con la información de los servidores MCP que deseas conectar

export interface MCPServerConfig {
  url: string;
  name: string;
  version: string;
}

export const mcpServers: MCPServerConfig[] = [
  // Agrega aquí los servidores MCP que deseas conectar
  // Ejemplo:
  // {
  //   url: "http://localhost:3001/mcp",
  //   name: "example-server",
  //   version: "1.0.0"
  // },
  {
    url: "https://gitmcp.io/docs",
    name: "gitmcp",
    version: "1.0.0"
  }
];