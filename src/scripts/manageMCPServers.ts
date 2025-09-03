import { MCPServerService } from '../services/mcp/mcpServerService';
import { db } from '../database/db';

async function listServers() {
    try {
        console.log('🗄️ Fetching MCP servers from database...');
        await db.initialize();
        const servers = await MCPServerService.getAllServers();
        
        if (servers.length === 0) {
            console.log('ℹ️  No MCP servers found in database.');
            return;
        }
        
        console.log('📋 MCP Servers:');
        servers.forEach(server => {
            console.log(`  - ID: ${server.id}, Name: ${server.name}, URL: ${server.url}, Version: ${server.version}`);
        });
    } catch (error) {
        console.error('❌ Error fetching MCP servers:', error);
    } finally {
        await db.close();
    }
}

async function addServer(name: string, url: string, version: string) {
    try {
        console.log(`➕ Adding MCP server: ${name}...`);
        await db.initialize();
        const id = await MCPServerService.addServer(name, url, version);
        console.log(`✅ MCP server added successfully with ID: ${id}`);
    } catch (error) {
        console.error('❌ Error adding MCP server:', error);
    } finally {
        await db.close();
    }
}

async function updateServer(id: number, name: string, url: string, version: string) {
    try {
        console.log(`✏️  Updating MCP server with ID: ${id}...`);
        await db.initialize();
        await MCPServerService.updateServer(id, name, url, version);
        console.log('✅ MCP server updated successfully');
    } catch (error) {
        console.error('❌ Error updating MCP server:', error);
    } finally {
        await db.close();
    }
}

async function deleteServer(id: number) {
    try {
        console.log(`🗑️  Deleting MCP server with ID: ${id}...`);
        await db.initialize();
        await MCPServerService.deleteServer(id);
        console.log('✅ MCP server deleted successfully');
    } catch (error) {
        console.error('❌ Error deleting MCP server:', error);
    } finally {
        await db.close();
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'list':
            await listServers();
            break;
        case 'add':
            if (args.length !== 4) {
                console.log('Usage: npm run mcp-servers add <name> <url> <version>');
                process.exit(1);
            }
            await addServer(args[1], args[2], args[3]);
            break;
        case 'update':
            if (args.length !== 5) {
                console.log('Usage: npm run mcp-servers update <id> <name> <url> <version>');
                process.exit(1);
            }
            await updateServer(parseInt(args[1]), args[2], args[3], args[4]);
            break;
        case 'delete':
            if (args.length !== 2) {
                console.log('Usage: npm run mcp-servers delete <id>');
                process.exit(1);
            }
            await deleteServer(parseInt(args[1]));
            break;
        default:
            console.log('Usage: npm run mcp-servers <list|add|update|delete> [args...]');
            console.log('Examples:');
            console.log('  npm run mcp-servers list');
            console.log('  npm run mcp-servers add my-server http://localhost:3001/mcp 1.0.0');
            console.log('  npm run mcp-servers update 1 my-server http://localhost:3001/mcp 1.1.0');
            console.log('  npm run mcp-servers delete 1');
            process.exit(1);
    }
}

main();