/**
 * 数据库初始化脚本（T1 交付物）
 *
 * 执行顺序：
 *   1) 校验配置（config.mjs）与 ADMIN_INIT_PASSWORD（本脚本额外要求）；
 *   2) 连接 MySQL（不指定库），CREATE DATABASE IF NOT EXISTS `<DB_NAME>`；
 *   3) 依次执行 sql/01_schema.sql（10 张表，CREATE TABLE IF NOT EXISTS）；
 *   4) 生成 bcrypt(cost=10) 口令哈希，替换 sql/02_seed.sql 中的占位符后执行；
 *   5) 输出表数量与种子计数，任一关键计数低于预期则退出码 1。
 *
 * 幂等性：脚本可重复执行；DDL 为 IF NOT EXISTS，种子为 ON DUPLICATE KEY UPDATE，
 * 重复执行不会新增行，也不会把管理端已修改的启停/删除/口令状态覆盖回种子值。
 *
 * 安全：README 与日志均不输出明文口令；SQL 文件只保留占位符，明文仅在运行期内存中短暂存在。
 *
 * 用法：npm run db:init   （即 node scripts/init-db.mjs）
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

import { BACKEND_ROOT, config } from '../src/config.mjs'

const SCHEMA_FILE = path.join(BACKEND_ROOT, 'sql', '01_schema.sql')
const SEED_FILE = path.join(BACKEND_ROOT, 'sql', '02_seed.sql')

/** 期望存在的 10 张表（顺序与 C-DB-SCHEMA@1 表号一致） */
const EXPECTED_TABLES = [
  'admin_user',
  'admin_refresh_token',
  'traffic_region',
  'traffic_intersection',
  'traffic_region_snapshot',
  'traffic_intersection_snapshot',
  'traffic_hour_flow',
  'traffic_accident',
  'traffic_collect_job',
  'admin_audit_log'
]

/** 种子规模下界（允许管理端在初始化后新增数据，因此只做下界断言） */
const EXPECTED_COUNTS = {
  country: 1,
  province: 34,
  city: 66,
  regionTotal: 101,
  intersection: 864,
  admin: 1,
  collectJob: 5
}

/**
 * SQL 语句拆分器：按分号切分，正确跳过字符串、反引号标识符与三种注释。
 * @param {string} source SQL 全文
 * @returns {string[]} 可执行的语句列表（已去除空语句）
 */
export function splitSqlStatements(source) {
  const statements = []
  let buffer = ''
  let index = 0
  // normal | lineComment | blockComment | single | double | backtick
  let state = 'normal'

  const flush = () => {
    const statement = buffer.trim()
    if (statement !== '') statements.push(statement)
    buffer = ''
  }

  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]

    if (state === 'normal') {
      if (char === '-' && next === '-') {
        state = 'lineComment'
        index += 2
        continue
      }
      if (char === '#') {
        state = 'lineComment'
        index += 1
        continue
      }
      if (char === '/' && next === '*') {
        state = 'blockComment'
        index += 2
        continue
      }
      if (char === "'") {
        state = 'single'
        buffer += char
        index += 1
        continue
      }
      if (char === '"') {
        state = 'double'
        buffer += char
        index += 1
        continue
      }
      if (char === '`') {
        state = 'backtick'
        buffer += char
        index += 1
        continue
      }
      if (char === ';') {
        flush()
        index += 1
        continue
      }
      buffer += char
      index += 1
      continue
    }

    if (state === 'lineComment') {
      if (char === '\n') {
        state = 'normal'
        buffer += ' '
      }
      index += 1
      continue
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        state = 'normal'
        buffer += ' '
        index += 2
        continue
      }
      index += 1
      continue
    }

    // 字符串与反引号内部：保留字符，处理转义
    if (state === 'single' || state === 'double') {
      if (char === '\\') {
        buffer += char + (next ?? '')
        index += 2
        continue
      }
      const closing = state === 'single' ? "'" : '"'
      if (char === closing) {
        // 连续两个引号表示转义引号
        if (next === closing) {
          buffer += char + next
          index += 2
          continue
        }
        state = 'normal'
      }
      buffer += char
      index += 1
      continue
    }

    // backtick
    if (char === '`') {
      if (next === '`') {
        buffer += char + next
        index += 2
        continue
      }
      state = 'normal'
    }
    buffer += char
    index += 1
  }

  flush()
  return statements
}

/**
 * 转义 SQL 单引号字符串字面量（用于占位符替换，非用户输入拼接查询）。
 * @param {string} value 原始字符串
 * @returns {string} 可安全放入 '...' 的字面量内容
 */
export function escapeSqlString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u001a/g, '\\Z')
}

/**
 * 把种子 SQL 中的管理员占位符替换为运行期生成的值。
 * @param {string} sql 种子 SQL 全文
 * @param {{username: string, passwordHash: string}} values 替换值
 * @returns {string}
 */
export function renderSeedSql(sql, values) {
  return sql
    .replaceAll('{{ADMIN_USERNAME}}', escapeSqlString(values.username))
    .replaceAll('{{ADMIN_PASSWORD_HASH}}', escapeSqlString(values.passwordHash))
}

/** 摘要中用到的语句片段（脱敏后展示，便于定位失败语句） */
function snippet(statement, length = 90) {
  const singleLine = statement.replace(/\s+/g, ' ').trim()
  return singleLine.length > length ? `${singleLine.slice(0, length)}…` : singleLine
}

/**
 * 逐条执行 SQL，返回执行统计。
 * @param {import('mysql2/promise').Connection} connection 数据库连接
 * @param {string[]} statements 语句列表
 * @param {string} label 日志标签
 * @returns {Promise<{statements: number, elapsedMs: number}>}
 */
async function runStatements(connection, statements, label) {
  const startedAt = Date.now()
  for (let i = 0; i < statements.length; i += 1) {
    const statement = statements[i]
    try {
      await connection.query(statement)
    } catch (error) {
      console.error(`[init-db] ${label} 第 ${i + 1}/${statements.length} 条语句执行失败：`)
      console.error(`  语句：${snippet(statement)}`)
      console.error(`  原因：${error instanceof Error ? error.message : String(error)}`)
      if (error && typeof error === 'object' && 'sqlMessage' in error) {
        console.error(`  MySQL：${error.sqlMessage}`)
      }
      throw error
    }
  }
  return { statements: statements.length, elapsedMs: Date.now() - startedAt }
}

/**
 * 输出数据库连接失败的中文排查指引。
 * @param {unknown} error 异常
 * @param {string} database 目标库名
 */
function reportConnectionFailure(error, database) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('')
  console.error(`[init-db] 数据库连接失败：${message}`)
  console.error('请依次检查：')
  console.error(`  1) MySQL 服务是否已启动（Windows 服务名通常为 MySQL80）：net start MySQL80（需管理员权限）`)
  console.error(`  2) .env 中 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD 是否正确（目标库：${database}）`)
  console.error('  3) DB_USER 是否具备 CREATE DATABASE 与建表权限')
  console.error('  4) 若刚安装 MySQL，请确认端口未被占用、账号已初始化')
  console.error('')
}

/**
 * 建立到目标库的连接（库不存在时先创建）。
 * @param {typeof config} cfg 配置
 * @returns {Promise<import('mysql2/promise').Connection>}
 */
async function openDatabase(cfg) {
  // 库名已在 config.mjs 限制为 [A-Za-z0-9_]，此处再加反引号包裹，防止标识符注入。
  const connectionOptions = {
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    charset: cfg.db.charset,
    timezone: '+08:00',
    dateStrings: true,
    decimalNumbers: true,
    connectTimeout: 10_000
  }

  let bootstrap
  try {
    bootstrap = await mysql.createConnection(connectionOptions)
  } catch (error) {
    reportConnectionFailure(error, cfg.db.name)
    throw error
  }

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    )
  } finally {
    await bootstrap.end()
  }

  try {
    return await mysql.createConnection({ ...connectionOptions, database: cfg.db.name })
  } catch (error) {
    reportConnectionFailure(error, cfg.db.name)
    throw error
  }
}

/**
 * 收集表清单与种子计数。
 * @param {import('mysql2/promise').Connection} connection 数据库连接
 * @param {string} database 库名
 * @param {string} adminUsername 管理员用户名
 * @returns {Promise<{tables: string[], counts: Record<string, number>}>}
 */
async function collectFacts(connection, database, adminUsername) {
  const [tableRows] = await connection.query(
    'SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [database]
  )
  const tables = tableRows.map(row => String(row.tableName))

  const [levelRows] = await connection.query(
    'SELECT level, COUNT(*) AS total FROM traffic_region GROUP BY level'
  )
  const byLevel = Object.fromEntries(levelRows.map(row => [String(row.level), Number(row.total)]))

  const [[intersectionRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM traffic_intersection'
  )
  const [[adminRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM admin_user WHERE username = ?',
    [adminUsername]
  )
  const [[jobRow]] = await connection.query('SELECT COUNT(*) AS total FROM traffic_collect_job')

  return {
    tables,
    counts: {
      country: byLevel.country ?? 0,
      province: byLevel.province ?? 0,
      city: byLevel.city ?? 0,
      regionTotal: Object.values(byLevel).reduce((sum, value) => sum + value, 0),
      intersection: Number(intersectionRow.total),
      admin: Number(adminRow.total),
      collectJob: Number(jobRow.total)
    }
  }
}

/**
 * 校验初始化结果；返回问题列表（空数组表示通过）。
 * @param {{tables: string[], counts: Record<string, number>}} facts 实测结果
 * @returns {string[]}
 */
function validateFacts(facts) {
  const issues = []
  for (const table of EXPECTED_TABLES) {
    if (!facts.tables.includes(table)) issues.push(`缺少表：${table}`)
  }
  const { counts } = facts
  if (counts.country !== EXPECTED_COUNTS.country) {
    issues.push(`traffic_region 全国应为 ${EXPECTED_COUNTS.country} 条，实际 ${counts.country} 条`)
  }
  if (counts.province < EXPECTED_COUNTS.province) {
    issues.push(`traffic_region 省份应不少于 ${EXPECTED_COUNTS.province} 条，实际 ${counts.province} 条`)
  }
  if (counts.city < EXPECTED_COUNTS.city) {
    issues.push(`traffic_region 城市应不少于 ${EXPECTED_COUNTS.city} 条，实际 ${counts.city} 条`)
  }
  if (counts.intersection < EXPECTED_COUNTS.intersection) {
    issues.push(
      `traffic_intersection 应不少于 ${EXPECTED_COUNTS.intersection} 条，实际 ${counts.intersection} 条`
    )
  }
  if (counts.admin < EXPECTED_COUNTS.admin) {
    issues.push(`admin_user 应不少于 ${EXPECTED_COUNTS.admin} 条（按种子用户名统计），实际 ${counts.admin} 条`)
  }
  if (counts.collectJob < EXPECTED_COUNTS.collectJob) {
    issues.push(
      `traffic_collect_job 应不少于 ${EXPECTED_COUNTS.collectJob} 条，实际 ${counts.collectJob} 条`
    )
  }
  return issues
}

/** 打印初始化摘要 */
function printSummary({ cfg, schemaStat, seedStat, facts }) {
  const pad = (text, width) => String(text).padEnd(width, ' ')
  console.info('')
  console.info('==================== 数据库初始化摘要 ====================')
  console.info(`数据库：${cfg.db.name}（${cfg.db.host}:${cfg.db.port}，账号 ${cfg.db.user}）`)
  console.info(
    `结构：sql/01_schema.sql  ${schemaStat.statements} 条语句  ${schemaStat.elapsedMs}ms  表 ${facts.tables.length}/${EXPECTED_TABLES.length}`
  )
  console.info(
    `种子：sql/02_seed.sql    ${seedStat.statements} 条语句  ${seedStat.elapsedMs}ms  管理员口令哈希：bcrypt cost=10（未落明文）`
  )
  console.info('')
  console.info('表清单：')
  console.info(`  ${facts.tables.join(', ')}`)
  console.info('')
  console.info('种子计数：')
  console.info(
    `  ${pad('traffic_region', 26)}${facts.counts.regionTotal}  （全国 ${facts.counts.country} / 省 ${facts.counts.province} / 市 ${facts.counts.city}）`
  )
  console.info(`  ${pad('traffic_intersection', 26)}${facts.counts.intersection}`)
  console.info(`  ${pad('admin_user', 26)}${facts.counts.admin}  （username=${cfg.adminInitUsername}）`)
  console.info(`  ${pad('traffic_collect_job', 26)}${facts.counts.collectJob}`)
  console.info('')
  console.info('幂等性：本脚本可重复执行，行数与内容保持不变（管理端运行期新增数据不会被清除）。')
  console.info('==========================================================')
  console.info('')
}

/**
 * 执行完整初始化流程。
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  if (config.adminInitPassword === '') {
    console.error('')
    console.error('[init-db] 无法初始化：ADMIN_INIT_PASSWORD 为空。')
    console.error('请在 .env 中设置管理员初始口令（仅用于首次初始化，正式环境必须覆盖）。')
    console.error('')
    process.exitCode = 1
    return
  }

  if (config.adminInitPassword.length < 8) {
    console.warn('[init-db] 警告：ADMIN_INIT_PASSWORD 长度小于 8，仅建议用于本地演示。')
  }

  console.info(`[init-db] 连接数据库 ${config.db.user}@${config.db.host}:${config.db.port}，目标库 ${config.db.name}`)
  const connection = await openDatabase(config)

  try {
    // ---- 1) 结构 ----
    const schemaSql = readFileSync(SCHEMA_FILE, 'utf8')
    const schemaStatements = splitSqlStatements(schemaSql)
    console.info(`[init-db] 执行 ${path.basename(SCHEMA_FILE)}（${schemaStatements.length} 条语句）…`)
    const schemaStat = await runStatements(connection, schemaStatements, '01_schema.sql')

    // ---- 2) 种子（管理员口令哈希在运行期生成，SQL 文件不含明文/固定哈希） ----
    const passwordHash = bcrypt.hashSync(config.adminInitPassword, 10)
    const seedSql = renderSeedSql(readFileSync(SEED_FILE, 'utf8'), {
      username: config.adminInitUsername,
      passwordHash
    })
    if (seedSql.includes('{{')) {
      throw new Error('种子 SQL 仍有未替换的占位符，请检查 02_seed.sql 与 renderSeedSql 是否一致')
    }
    const seedStatements = splitSqlStatements(seedSql)
    console.info(`[init-db] 执行 ${path.basename(SEED_FILE)}（${seedStatements.length} 条语句）…`)
    const seedStat = await runStatements(connection, seedStatements, '02_seed.sql')

    // ---- 3) 结果校验 ----
    const facts = await collectFacts(connection, config.db.name, config.adminInitUsername)
    printSummary({ cfg: config, schemaStat, seedStat, facts })

    const issues = validateFacts(facts)
    if (issues.length > 0) {
      console.error('[init-db] 初始化结果不符合预期：')
      for (const issue of issues) console.error(`  - ${issue}`)
      console.error('')
      process.exitCode = 1
      return
    }

    console.info('[init-db] 初始化完成：结构与种子数据均已就绪。')
    console.info('')
    console.info(`下一步：npm start，然后用 ${config.adminInitUsername} 与 ADMIN_INIT_PASSWORD 登录。`)
    console.info('')
  } finally {
    await connection.end()
  }
}

// 直接执行本文件时运行初始化；被测试 import 时不自动执行（由调用方显式调用 initDatabase）。
const currentFile = path.resolve(fileURLToPath(import.meta.url)).toLowerCase()
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : ''
const isDirectRun = invokedFile !== '' && currentFile === invokedFile

if (isDirectRun) {
  initDatabase().catch(error => {
    console.error('')
    console.error(`[init-db] 初始化失败：${error instanceof Error ? error.message : String(error)}`)
    console.error('')
    process.exitCode = 1
  })
}