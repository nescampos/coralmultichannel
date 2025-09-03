import { db } from '../database/db';

async function setupDatabase() {
    try {
        console.log('🗄️ Initializing database...');
        await db.initialize();
        console.log('✅ Database initialized successfully!');
        
        // Add example MCP server
        console.log(' Adding example MCP server...');
        try {
            const servers = await db.getMCPServers();
            if (servers.length === 0) {
                await db.addMCPServer('gitmcp', 'https://gitmcp.io/docs', '1.0.0');
                console.log('✅ Example MCP server added successfully!');
            } else {
                console.log('ℹ️  MCP servers already exist, skipping example server creation.');
            }
        } catch (error) {
            console.error('❌ Error adding example MCP server:', error);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

setupDatabase(); 