/**
 * Interfaz que define el contrato para todas las implementaciones de base de datos.
 * Esta interfaz asegura que todas las implementaciones (SQLite, SQL Server, etc.)
 * proporcionen la misma funcionalidad básica necesaria para la aplicación.
 */
export interface IDatabase {
    /**
     * Inicializa la base de datos creando las tablas necesarias si no existen.
     */
    initialize(): Promise<void>;

    /**
     * Busca o crea una identidad de usuario por proveedor.
     */
    getOrCreateUserProviderIdentity(provider: string, externalId: string, name?: string): Promise<{ identityId: number, globalUserId: number }>;

    /**
     * Guarda un mensaje en el historial de chat usando la identidad de usuario por proveedor.
     */
    saveMessageByProvider(provider: string, externalId: string, message: string, role: 'user' | 'assistant', name?: string): Promise<void>;

    /**
     * Obtiene los mensajes más recientes para una identidad de usuario por proveedor.
     */
    getRecentMessagesByProvider(provider: string, externalId: string, limit?: number): Promise<Array<{message: string, role: string, timestamp: string}>>;

    /**
     * Obtiene todos los servidores MCP configurados.
     */
    getMCPServers(): Promise<Array<{ id: number, name: string, url: string, version: string }>>;

    /**
     * Agrega un nuevo servidor MCP.
     */
    addMCPServer(name: string, url: string, version: string): Promise<number>;

    /**
     * Actualiza un servidor MCP existente.
     */
    updateMCPServer(id: number, name: string, url: string, version: string): Promise<void>;

    /**
     * Elimina un servidor MCP.
     */
    deleteMCPServer(id: number): Promise<void>;

    /**
     * Cierra la conexión con la base de datos y libera los recursos.
     */
    close(): Promise<void>;
} 