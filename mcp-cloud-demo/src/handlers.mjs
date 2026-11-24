import {
  ValidationError,
  MissingConfigError,
  invalidArguments,
  missingConfig,
  networkError,
  apiError,
} from './errors.mjs';
import { HuaweiApiError, HuaweiNetworkError } from './client.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertIntInRange(value, min, max, name) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${name} 须为 ${min}-${max} 的整数`);
  }
  return n;
}

function extractIps(addresses) {
  const private_ips = [];
  const floating_ips = [];
  for (const list of Object.values(addresses || {})) {
    for (const item of list || []) {
      if (item['OS-EXT-IPS:type'] === 'fixed') private_ips.push(item.addr);
      else if (item['OS-EXT-IPS:type'] === 'floating') floating_ips.push(item.addr);
    }
  }
  return { private_ips, floating_ips };
}

function serverSummary(server) {
  const { private_ips, floating_ips } = extractIps(server.addresses);
  return {
    id: server.id,
    name: server.name,
    status: server.status,
    vcpus: server.flavor ? Number(server.flavor.vcpus) : undefined,
    ram_mb: server.flavor ? Number(server.flavor.ram) : undefined,
    private_ips,
    floating_ips,
    availability_zone: server['OS-EXT-AZ:availability_zone'],
    created_at: server.created,
  };
}

function serverDetail(server) {
  const { private_ips, floating_ips } = extractIps(server.addresses);
  return {
    id: server.id,
    name: server.name,
    status: server.status,
    vm_state: server['OS-EXT-STS:vm_state'],
    vcpus: server.flavor ? Number(server.flavor.vcpus) : undefined,
    ram_mb: server.flavor ? Number(server.flavor.ram) : undefined,
    image_id: server.image ? server.image.id : undefined,
    private_ips,
    floating_ips,
    availability_zone: server['OS-EXT-AZ:availability_zone'],
    security_group_names: (server.security_groups || []).map((g) => g.name),
    created_at: server.created,
    updated_at: server.updated,
  };
}

async function run(fn) {
  try {
    const data = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    if (e instanceof ValidationError) return invalidArguments(e.message);
    if (e instanceof MissingConfigError) return missingConfig(e.missing);
    if (e instanceof HuaweiNetworkError) return networkError(e.message);
    if (e instanceof HuaweiApiError) {
      return apiError({
        error_code: e.payload.error_code,
        error_msg: e.payload.error_msg,
        http_status: e.httpStatus,
      });
    }
    return networkError(e?.message || String(e));
  }
}

export const handlers = {
  list_servers(args, client) {
    return run(async () => {
      const limit = assertIntInRange(args.limit, 1, 1000, 'limit');
      const offset = assertIntInRange(args.offset, 0, 10000, 'offset');
      const projectId = await client.requireProjectId();
      const data = await client.request('GET', `/v1/${projectId}/cloudservers/detail`, {
        query: { limit: limit ?? 25, offset: offset ?? 0, ...(args.name ? { name: args.name } : {}) },
      });
      const servers = (data.servers || []).map(serverSummary);
      return { total: typeof data.count === 'number' ? data.count : servers.length, servers };
    });
  },

  show_server(args, client) {
    return run(async () => {
      const serverId = String(args.server_id || '');
      if (!UUID_RE.test(serverId)) throw new ValidationError('server_id 须为 36 位 UUID 格式');
      const projectId = await client.requireProjectId();
      const data = await client.request('GET', `/v1/${projectId}/cloudservers/${serverId}`);
      return serverDetail(data.server || {});
    });
  },

  list_availability_zones(_args, client) {
    return run(async () => {
      const projectId = await client.requireProjectId();
      const data = await client.request('GET', `/v1/${projectId}/availability-zones`);
      return {
        availability_zones: (data.availabilityZoneInfo || []).map((zone) => ({
          zone_name: zone.zoneName,
          available: zone.zoneState ? zone.zoneState.available === true : false,
        })),
      };
    });
  },

  get_project_id(args, client) {
    return run(async () => {
      const region = args.region || client.region;
      const data = await client.request('GET', '/v3/projects', { service: 'iam' });
      const projects = data.projects || [];
      const matched = projects.filter((p) => p.name === region);
      return { region, project_id: matched.length ? matched[0].id : undefined, project_count: projects.length };
    });
  },
};