import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDb } from '../../db/client';
import { ChatGraphRepository } from '../../db/chatGraphRepo';
import { FileGraphRepository } from '../../db/fileGraphRepo';
import { WorkspaceRepository } from '../../db/workspaceRepo';
import { createStrataGraphMcpServer } from './mcpServer';

async function main() {
  const db = getDb();
  const { server } = createStrataGraphMcpServer({
    workspaceRepo: new WorkspaceRepository(db),
    fileGraphRepo: new FileGraphRepository(db),
    chatGraphRepo: new ChatGraphRepository(db),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Error iniciando servidor MCP stdio:', err);
  process.exit(1);
});
