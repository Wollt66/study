/**
 * 后端路由挂载清单（T1 冻结文件，C-APP-WIRING@1）
 *
 * 每个路由模块由唯一所有者提供，app.mjs 只按本清单动态挂载，不做任何业务逻辑：
 *   /api/auth            → src/routes/auth.routes.mjs      (T2 · C-AUTH@1)
 *   /api/admin           → src/routes/admin.routes.mjs     (T3 · C-REGION@1 / C-INTERSECTION@1)
 *   /api/traffic/history → src/routes/history.routes.mjs   (T5 · C-HISTORY@1)
 *   /api/traffic/stream  → src/routes/stream.routes.mjs    (T6 · C-SSE@1)
 *   /api/traffic         → src/routes/traffic.routes.mjs   (T4 · C-SNAPSHOT@1 / C-DASHBOARD@1)
 *
 * 约束：路由模块必须默认导出 express.Router()。文件缺失时 app.mjs 跳过并打印 warn，
 * 保证并行开发期间部分模块未就绪也能启动；全部就绪后启动日志不应再有 warn（T12 校验）。
 */

import { fileURLToPath } from 'node:url'

/** src/routes/ 目录 URL */
export const ROUTES_DIR_URL = new URL('.', import.meta.url)

/**
 * 挂载清单（键名 → 挂载点/模块/所有者）。对象本身及其子对象均冻结。
 */
export const ROUTE_MANIFEST = Object.freeze({
  auth: Object.freeze({
    key: 'auth',
    mount: '/api/auth',
    module: './auth.routes.mjs',
    owner: 'T2',
    provides: 'C-AUTH@1'
  }),
  admin: Object.freeze({
    key: 'admin',
    mount: '/api/admin',
    module: './admin.routes.mjs',
    owner: 'T3',
    provides: 'C-REGION@1 / C-INTERSECTION@1'
  }),
  history: Object.freeze({
    key: 'history',
    mount: '/api/traffic/history',
    module: './history.routes.mjs',
    owner: 'T5',
    provides: 'C-HISTORY@1'
  }),
  stream: Object.freeze({
    key: 'stream',
    mount: '/api/traffic/stream',
    module: './stream.routes.mjs',
    owner: 'T6',
    provides: 'C-SSE@1'
  }),
  traffic: Object.freeze({
    key: 'traffic',
    mount: '/api/traffic',
    module: './traffic.routes.mjs',
    owner: 'T4',
    provides: 'C-SNAPSHOT@1 / C-DASHBOARD@1'
  })
})

/** 有序清单数组（按 ROUTE_MANIFEST 声明顺序），供 app.mjs 遍历 */
export const ROUTE_MOUNTS = Object.freeze(Object.values(ROUTE_MANIFEST))

/**
 * 解析路由模块的文件 URL。
 * @param {{module: string}} item 清单项
 * @returns {URL}
 */
export function resolveRouteModuleUrl(item) {
  return new URL(item.module, ROUTES_DIR_URL)
}

/**
 * 解析路由模块的绝对路径（Windows 下用于 existsSync 判定）。
 * @param {{module: string}} item 清单项
 * @returns {string}
 */
export function resolveRouteModulePath(item) {
  return fileURLToPath(resolveRouteModuleUrl(item))
}

/**
 * 按挂载点"具体程度"排序：路径段越多越先挂载。
 * 这样 /api/traffic/history、/api/traffic/stream 一定先于 /api/traffic 匹配，
 * 避免更宽泛的前缀提前消费请求。
 * @param {ReadonlyArray<{mount: string}>} [mounts] 清单
 * @returns {Array<{mount: string}>}
 */
export function sortBySpecificity(mounts = ROUTE_MOUNTS) {
  return [...mounts].sort((a, b) => b.mount.split('/').length - a.mount.split('/').length)
}