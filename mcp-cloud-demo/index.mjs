import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.mjs';

const transport = new StdioServerTransport();
await buildServer().connect(transport);
console.error('[huawei-ecs-mcp-server] stdio 传输已启动');