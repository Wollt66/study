import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HuaweiCloudClient } from './src/client.mjs';
import { TOOLS } from './src/tools.mjs';
import { handlers } from './src/handlers.mjs';

export function createClientFromEnv(env = process.env) {
  return new HuaweiCloudClient({
    ak: env.HUAWEI_AK || env.HUAWEI_CLOUD_AK,
    sk: env.HUAWEI_SK || env.HUAWEI_CLOUD_SK,
    region: env.HUAWEI_REGION || 'cn-north-4',
    projectId: env.HUAWEI_PROJECT_ID || env.HUAWEI_CLOUD_PROJECT_ID,
  });
}

export function buildServer({ client } = {}) {
  const server = new McpServer({ name: 'huawei-ecs-mcp-server', version: '1.0.0' });
  const resolved = client || createClientFromEnv();
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      (args) => handlers[tool.name](args || {}, resolved)
    );
  }
  return server;
}