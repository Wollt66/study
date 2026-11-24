#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const GEO_TARGETS = [
  { adcode: 100000, file: 'china.json', label: '全国' },
  { adcode: 440000, file: 'guangdong.json', label: '广东省' },
  { adcode: 320000, file: 'jiangsu.json', label: '江苏省' },
  { adcode: 330000, file: 'zhejiang.json', label: '浙江省' },
  { adcode: 510000, file: 'sichuan.json', label: '四川省' },
  { adcode: 440100, file: 'guangzhou.json', label: '广州市' },
  { adcode: 320100, file: 'nanjing.json', label: '南京市' },
  { adcode: 330100, file: 'hangzhou.json', label: '杭州市' },
  { adcode: 510100, file: 'chengdu.json', label: '成都市' }
]

const BASE_URL = 'https://geo.datav.aliyun.com/areas_v3/bound'
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT = path.resolve(SCRIPT_DIR, '../src/assets/geo')

const HELP = `fetch-geo —— 城市交通监控大屏 geoJSON 资源获取与裁剪工具

用法：
  node scripts/fetch-geo.mjs [选项]

选项：
  --out <dir>          输出目录（选填，默认 src/assets/geo）
  --force              强制重新下载，忽略本地已有文件（选填）
  --list               仅列出下载目标清单，不执行（选填）
  --dump-centroids     输出全部地区的 name/adcode/centroid 坐标表 JSON（选填）
  --help               显示本帮助

行为：
  1. 目标文件不存在时，从阿里 DataV areas_v3 下载对应边界 geoJSON；
  2. 对 geoJSON 逐 feature 裁剪 properties，仅保留 name / adcode / center / centroid，
     减小打包体积（坐标不做抽稀，保轮廓精度）；
  3. 文件已存在且未指定 --force 时跳过下载、仅执行裁剪（幂等）；
  4. --dump-centroids 用于提取省/市质心坐标表，供 mock 数据引擎生成事故散点坐标。

示例：
  node scripts/fetch-geo.mjs
  node scripts/fetch-geo.mjs --force
  node scripts/fetch-geo.mjs --dump-centroids > centroids.json

失败重试说明：
  单个文件下载失败将以非零码退出；可直接重跑本命令，已成功的文件会被跳过（幂等）。`

function parseArgs(argv) {
  const opts = { out: DEFAULT_OUT, force: false, list: false, dumpCentroids: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg === '--force') opts.force = true
    else if (arg === '--list') opts.list = true
    else if (arg === '--dump-centroids') opts.dumpCentroids = true
    else if (arg === '--out') {
      const next = argv[i + 1]
      if (!next) {
        console.error('错误：--out 需要一个目录参数')
        process.exit(1)
      }
      opts.out = path.resolve(next)
      i++
    } else {
      console.error(`错误：未知参数 ${arg}（使用 --help 查看用法）`)
      process.exit(1)
    }
  }
  return opts
}

function trimProperties(geojson) {
  const kept = { type: geojson.type, features: [] }
  if (geojson.bbox) kept.bbox = geojson.bbox
  for (const feature of geojson.features) {
    const p = feature.properties ?? {}
    const props = {}
    for (const key of ['name', 'adcode', 'center', 'centroid']) {
      if (p[key] !== undefined) props[key] = p[key]
    }
    kept.features.push({
      type: feature.type,
      properties: props,
      geometry: feature.geometry
    })
  }
  return kept
}

function bytes(n) {
  return `${(n / 1024).toFixed(1)}KB`
}

async function fetchOne(target, opts) {
  const filePath = path.join(opts.out, target.file)
  if (!fs.existsSync(filePath) || opts.force) {
    const url = `${BASE_URL}/${target.adcode}_full.json`
    process.stdout.write(`下载 ${target.label} ${url} ... `)
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const geojson = await res.json()
    fs.mkdirSync(opts.out, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(trimProperties(geojson)))
    console.log(`完成 ${bytes(fs.statSync(filePath).size)}`)
    return
  }
  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const trimmed = trimProperties(geojson)
  const before = fs.statSync(filePath).size
  const serialized = JSON.stringify(trimmed)
  fs.writeFileSync(filePath, serialized)
  console.log(`裁剪 ${target.label}（已存在） ${bytes(before)} -> ${bytes(serialized.length)}`)
}

function dumpCentroids(opts) {
  const result = {}
  for (const target of GEO_TARGETS) {
    const filePath = path.join(opts.out, target.file)
    if (!fs.existsSync(filePath)) {
      console.error(`警告：${target.file} 不存在，先运行下载`)
      continue
    }
    const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    result[target.label] = geojson.features.map(f => ({
      name: f.properties?.name,
      adcode: f.properties?.adcode,
      centroid: f.properties?.centroid ?? f.properties?.center
    }))
  }
  console.log(JSON.stringify(result, null, 0))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(HELP)
    return
  }
  if (opts.list) {
    console.log('下载目标清单：')
    for (const t of GEO_TARGETS) console.log(`  ${t.adcode}  ${t.label}  ->  ${t.file}`)
    return
  }
  if (opts.dumpCentroids) {
    dumpCentroids(opts)
    return
  }
  let failed = 0
  for (const target of GEO_TARGETS) {
    try {
      await fetchOne(target, opts)
    } catch (err) {
      failed++
      console.error(`失败 ${target.label}：${err.message}`)
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} 个文件失败，可直接重跑本命令续传（幂等）。`)
    process.exit(1)
  }
  const total = GEO_TARGETS.reduce((sum, t) => {
    const p = path.join(opts.out, t.file)
    return sum + (fs.existsSync(p) ? fs.statSync(p).size : 0)
  }, 0)
  console.log(`\n全部完成：${GEO_TARGETS.length} 个文件，合计 ${bytes(total)}，输出目录 ${opts.out}`)
}

main()