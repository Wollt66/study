import { z } from 'zod';

export const TOOLS = [
  {
    name: 'list_servers',
    description: '查询华为云 ECS 云服务器列表（GET /v1/{project_id}/cloudservers/detail）',
    inputSchema: {
      limit: z.number().int().min(1).max(1000).optional().describe('每页数量（选填，1-1000，默认 25）'),
      offset: z.number().int().min(0).max(10000).optional().describe('偏移量（选填，0-10000 的非负整数，默认 0）'),
      name: z.string().min(1).max(128).optional().describe('按云服务器名称模糊过滤（选填）'),
    },
  },
  {
    name: 'show_server',
    description: '查询单台云服务器详情（GET /v1/{project_id}/cloudservers/{server_id}）',
    inputSchema: {
      server_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'server_id 须为 36 位 UUID 格式').describe('云服务器 ID（必填，UUID）'),
    },
  },
  {
    name: 'list_availability_zones',
    description: '查询当前区域可用区列表（GET /v1/{project_id}/availability-zones）',
    inputSchema: {},
  },
  {
    name: 'get_project_id',
    description: '查询华为云 IAM 项目 ID（GET /v3/projects），用于确认区域 project_id 配置',
    inputSchema: {
      region: z.string().regex(/^[a-z0-9-]+$/).optional().describe('区域名（选填，默认取 HUAWEI_REGION 配置）'),
    },
  },
];