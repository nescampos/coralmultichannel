import * as sql from 'mssql';
import { IDatabase } from './IDatabase';

/**
 * Implementación de la base de datos usando SQL Server.
 * Esta implementación está diseñada para entornos de producción,
 * proporcionando todas las características empresariales de SQL Server
 * como alta disponibilidad, backups automáticos y mejor escalabilidad.
 */
export class SQLServerDatabase implements IDatabase {
    private pool: sql.ConnectionPool;

    /**
     * Constructor que inicializa el pool de conexiones de SQL Server.
     * @param config - Configuración de conexión a SQL Server incluyendo credenciales y opciones
     */
    constructor(config: sql.config) {
        this.pool = new sql.ConnectionPool(config);
    }

    /**
     * Inicializa la estructura de la base de datos.
     * Crea las tablas e índices necesarios si no existen, utilizando características
     * específicas de SQL Server como NVARCHAR para soporte Unicode y DATETIME2 para
     * precisión temporal.
     */
    async initialize(): Promise<void> {
        await this.pool.connect();
        const transaction = new sql.Transaction(this.pool);
        try {
            await transaction.begin();
            // Tabla de usuario global
            await transaction.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'global_user')
                CREATE TABLE global_user (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(250)
                )
            `);
            // Identidad de usuario por proveedor
            await transaction.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_provider_identity')
                CREATE TABLE user_provider_identity (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    global_user_id INT NOT NULL,
                    provider NVARCHAR(100) NOT NULL,
                    external_id NVARCHAR(250) NOT NULL,
                    CONSTRAINT UQ_provider_external_id UNIQUE (provider, external_id),
                    FOREIGN KEY (global_user_id) REFERENCES global_user(id)
                )
            `);
            // Historial de mensajes
            await transaction.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'chat_history')
                CREATE TABLE chat_history (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_provider_identity_id INT NOT NULL,
                    message NVARCHAR(MAX),
                    role NVARCHAR(50),
                    timestamp DATETIME2 DEFAULT GETDATE(),
                    FOREIGN KEY (user_provider_identity_id) REFERENCES user_provider_identity(id)
                )
            `);
            await transaction.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_chat_history_user_provider_identity_id')
                CREATE INDEX idx_chat_history_user_provider_identity_id ON chat_history(user_provider_identity_id)
            `);
            await transaction.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_chat_history_timestamp')
                CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp)
            `);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async getOrCreateUserProviderIdentity(provider: string, externalId: string, name?: string): Promise<{ identityId: number, globalUserId: number }> {
        // Buscar identidad existente
        let result = await this.pool.request()
            .input('provider', sql.NVarChar, provider)
            .input('externalId', sql.NVarChar, externalId)
            .query('SELECT id, global_user_id FROM user_provider_identity WHERE provider = @provider AND external_id = @externalId');
        if (result.recordset.length > 0) {
            return { identityId: result.recordset[0].id, globalUserId: result.recordset[0].global_user_id };
        }
        // Crear global_user
        let insertUser = await this.pool.request()
            .input('name', sql.NVarChar, name || externalId)
            .query('INSERT INTO global_user (name) OUTPUT INSERTED.id VALUES (@name)');
        const globalUserId = insertUser.recordset[0].id;
        // Crear identidad
        let insertIdentity = await this.pool.request()
            .input('globalUserId', sql.Int, globalUserId)
            .input('provider', sql.NVarChar, provider)
            .input('externalId', sql.NVarChar, externalId)
            .query('INSERT INTO user_provider_identity (global_user_id, provider, external_id) OUTPUT INSERTED.id VALUES (@globalUserId, @provider, @externalId)');
        const identityId = insertIdentity.recordset[0].id;
        return { identityId, globalUserId };
    }

    async saveMessageByProvider(provider: string, externalId: string, message: string, role: 'user' | 'assistant', name?: string): Promise<void> {
        const { identityId } = await this.getOrCreateUserProviderIdentity(provider, externalId, name);
        await this.pool.request()
            .input('identityId', sql.Int, identityId)
            .input('message', sql.NVarChar, message)
            .input('role', sql.NVarChar, role)
            .query('INSERT INTO chat_history (user_provider_identity_id, message, role) VALUES (@identityId, @message, @role)');
    }

    async getRecentMessagesByProvider(provider: string, externalId: string, limit: number = 10): Promise<Array<{message: string, role: string, timestamp: string}>> {
        // Primero obtenemos el global_user_id
        const identityResult = await this.pool.request()
            .input('provider', sql.NVarChar, provider)
            .input('externalId', sql.NVarChar, externalId)
            .query('SELECT global_user_id FROM user_provider_identity WHERE provider = @provider AND external_id = @externalId');
            
        if (identityResult.recordset.length === 0) return [];
        const globalUserId = identityResult.recordset[0].global_user_id;

        // Luego obtenemos los mensajes del historial usando el global_user_id
        const result = await this.pool.request()
            .input('globalUserId', sql.Int, globalUserId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT ch.message, ch.role, ch.timestamp
                FROM chat_history ch
                INNER JOIN user_provider_identity upi ON ch.user_provider_identity_id = upi.id
                WHERE upi.global_user_id = @globalUserId
                ORDER BY ch.timestamp DESC
                OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
            `);

        return result.recordset.map(row => ({
            message: row.message,
            role: row.role,
            timestamp: row.timestamp.toISOString()
        }));
    }

    /**
     * @inheritdoc
     * Utiliza parámetros SQL para prevenir inyección SQL y retorna la información
     * de deuda de un usuario específico.
     */
    async getUserDebt(phoneNumber: string): Promise<{
        phoneNumber: string;
        name: string | null;
        debtAmount: number;
        dueDate: Date;
        createdAt: Date;
    } | null> {
        const result = await this.pool.request()
            .input('phoneNumber', sql.NVarChar, phoneNumber)
            .query(`
                SELECT phone_number, name, debt_amount, due_date, created_at
                FROM user_debt
                WHERE phone_number = @phoneNumber
            `);

        if (result.recordset.length === 0) return null;

        const row = result.recordset[0];
        return {
            phoneNumber: row.phone_number,
            name: row.name,
            debtAmount: row.debt_amount,
            dueDate: new Date(row.due_date),
            createdAt: new Date(row.created_at)
        };
    }

    /**
     * @inheritdoc
     * Utiliza parámetros SQL para prevenir inyección SQL y retorna todas las deudas
     * vencidas hasta una fecha específica, ordenadas por fecha de vencimiento.
     */
    async getOverdueDebts(date: Date): Promise<Array<{
        phoneNumber: string;
        name: string | null;
        debtAmount: number;
        dueDate: Date;
        createdAt: Date;
    }>> {
        const result = await this.pool.request()
            .input('date', sql.Date, date)
            .query(`
                SELECT phone_number, name, debt_amount, due_date, created_at
                FROM user_debt
                WHERE due_date <= @date
                ORDER BY due_date ASC
            `);

        return result.recordset.map(row => ({
            phoneNumber: row.phone_number,
            name: row.name,
            debtAmount: row.debt_amount,
            dueDate: new Date(row.due_date),
            createdAt: new Date(row.created_at)
        }));
    }

    /**
     * @inheritdoc
     * Cierra el pool de conexiones de SQL Server de manera segura.
     */
    async close(): Promise<void> {
        await this.pool.close();
    }
} 