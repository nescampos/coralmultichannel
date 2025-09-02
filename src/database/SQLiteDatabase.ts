import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { IDatabase } from './IDatabase';

/**
 * Implementación de la base de datos usando SQLite.
 * Esta implementación está optimizada para desarrollo local y pruebas.
 * Utiliza el archivo 'chat.db' para almacenar los datos y está configurada
 * con optimizaciones de rendimiento específicas de SQLite.
 */
export class SQLiteDatabase implements IDatabase {
    private db: sqlite3.Database;
    private run: (sql: string, params?: any[]) => Promise<any>;
    private get: (sql: string, params?: any[]) => Promise<any>;
    private all: (sql: string, params?: any[]) => Promise<any[]>;

    /**
     * Constructor que inicializa la conexión a SQLite y configura las optimizaciones.
     */
    constructor() {
        this.db = new sqlite3.Database('chat.db');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA synchronous = NORMAL');
        this.db.run('PRAGMA temp_store = MEMORY');
        this.db.run('PRAGMA cache_size = -2000');
        this.run = promisify(this.db.run.bind(this.db));
        this.get = promisify(this.db.get.bind(this.db));
        this.all = promisify(this.db.all.bind(this.db));
    }

    /**
     * Inicializa la estructura de la base de datos para usuarios globales y múltiples proveedores.
     */
    async initialize() {
        await this.run('BEGIN TRANSACTION');
        try {
            await this.run(`
                CREATE TABLE IF NOT EXISTS global_user (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT
                )
            `);
            await this.run(`
                CREATE TABLE IF NOT EXISTS user_provider_identity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    global_user_id INTEGER NOT NULL,
                    provider TEXT NOT NULL,
                    external_id TEXT NOT NULL,
                    UNIQUE(provider, external_id),
                    FOREIGN KEY (global_user_id) REFERENCES global_user(id)
                )
            `);
            await this.run(`
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_provider_identity_id INTEGER NOT NULL,
                    message TEXT,
                    role TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_provider_identity_id) REFERENCES user_provider_identity(id)
                )
            `);
            await this.run('CREATE INDEX IF NOT EXISTS idx_chat_history_user_provider_identity_id ON chat_history(user_provider_identity_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp)');
            await this.run('COMMIT');
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }

    /**
     * Busca o crea una identidad de usuario por proveedor.
     * Si no existe, crea un global_user y la identidad.
     */
    async getOrCreateUserProviderIdentity(provider: string, externalId: string, name?: string): Promise<{ identityId: number, globalUserId: number }> {
        let row = await this.get(
            'SELECT id, global_user_id FROM user_provider_identity WHERE provider = ? AND external_id = ?',
            [provider, externalId]
        );
        if (row) {
            return { identityId: row.id, globalUserId: row.global_user_id };
        }
        const result = await this.run(
            'INSERT INTO global_user (name) VALUES (?)',
            [name || externalId]
        );
        const globalUserIdRow = await this.get('SELECT last_insert_rowid() as id');
        const globalUserId = globalUserIdRow.id;
        await this.run(
            'INSERT INTO user_provider_identity (global_user_id, provider, external_id) VALUES (?, ?, ?)',
            [globalUserId, provider, externalId]
        );
        const identityIdRow = await this.get('SELECT last_insert_rowid() as id');
        return { identityId: identityIdRow.id, globalUserId };
    }

    /**
     * Guarda un mensaje en el historial de chat usando la identidad de usuario por proveedor.
     */
    async saveMessageByProvider(provider: string, externalId: string, message: string, role: 'user' | 'assistant', name?: string): Promise<void> {
        const { identityId } = await this.getOrCreateUserProviderIdentity(provider, externalId, name);
        await this.run(
            'INSERT INTO chat_history (user_provider_identity_id, message, role) VALUES (?, ?, ?)',
            [identityId, message, role]
        );
    }

    /**
     * Obtiene los mensajes más recientes para una identidad de usuario por proveedor.
     */
    async getRecentMessagesByProvider(provider: string, externalId: string, limit: number = 10): Promise<Array<{message: string, role: string, timestamp: string}>> {
        // Primero obtenemos el global_user_id
        const identityRow = await this.get(
            'SELECT global_user_id FROM user_provider_identity WHERE provider = ? AND external_id = ?',
            [provider, externalId]
        );
        if (!identityRow) return [];
        const globalUserId = identityRow.global_user_id;

        // Luego obtenemos los mensajes del historial usando el global_user_id
        const messages = await this.all(
            `SELECT ch.message, ch.role, ch.timestamp
             FROM chat_history ch
             INNER JOIN user_provider_identity upi ON ch.user_provider_identity_id = upi.id
             WHERE upi.global_user_id = ?
             ORDER BY ch.timestamp DESC
             LIMIT ?`,
            [globalUserId, limit]
        );

        return messages.map(row => ({
            message: row.message,
            role: row.role,
            timestamp: new Date(row.timestamp).toISOString()
        }));
    }

    /**
     * Cierra la conexión con la base de datos y libera los recursos.
     */
    async close(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
} 