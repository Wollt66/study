/**
 * 管理端契约客户端：`C-REGION@1` / `C-INTERSECTION@1`。
 * 全部接口需 Bearer（由 `api/client.ts` 自动附带访问令牌）。
 */
import type { RegionLevel } from '@/types'
import { del, get, post, put, type QueryParams } from './client'

/* --------------------------------------------------------------- 通用分页 */

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageQuery {
  keyword?: string
  enabled?: boolean
  page?: number
  pageSize?: number
}

/* --------------------------------------------------------------- 区域管理 */

export interface RegionItem {
  regionCode: number
  regionName: string
  level: RegionLevel
  provinceCode: number
  /** [经度, 纬度] */
  centroid: [number, number]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RegionQuery extends PageQuery {
  level?: RegionLevel
}

export interface RegionCreatePayload {
  regionCode: number
  regionName: string
  level: RegionLevel
  provinceCode: number
  centroid: [number, number]
  enabled?: boolean
}

/** 更新时 `regionCode` / `level` / `provinceCode` 不可改 */
export interface RegionUpdatePayload {
  regionName?: string
  centroid?: [number, number]
  enabled?: boolean
}

export interface RegionDeleteResult {
  regionCode: number
  deleted: boolean
}

export function listRegions(query: RegionQuery = {}): Promise<PageResult<RegionItem>> {
  const params: QueryParams = {
    level: query.level,
    keyword: query.keyword,
    enabled: query.enabled,
    page: query.page,
    pageSize: query.pageSize
  }
  return get<PageResult<RegionItem>>('/admin/regions', params)
}

export function createRegion(payload: RegionCreatePayload): Promise<RegionItem> {
  return post<RegionItem>('/admin/regions', payload)
}

export function updateRegion(regionCode: number, payload: RegionUpdatePayload): Promise<RegionItem> {
  return put<RegionItem>(`/admin/regions/${encodeURIComponent(String(regionCode))}`, payload)
}

export function deleteRegion(regionCode: number): Promise<RegionDeleteResult> {
  return del<RegionDeleteResult>(`/admin/regions/${encodeURIComponent(String(regionCode))}`)
}

/* --------------------------------------------------------------- 路口管理 */

export interface IntersectionItem {
  intersectionId: string
  intersectionName: string
  cityCode: number
  /** [0.1, 3.0]，影响流量基线 */
  roadWeight: number
  /** [经度, 纬度] */
  coord: [number, number]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface IntersectionQuery extends PageQuery {
  cityCode?: number
}

export interface IntersectionCreatePayload {
  intersectionId: string
  intersectionName: string
  cityCode: number
  roadWeight: number
  coord: [number, number]
  enabled?: boolean
}

export interface IntersectionUpdatePayload {
  intersectionName?: string
  cityCode?: number
  roadWeight?: number
  coord?: [number, number]
  enabled?: boolean
}

export interface IntersectionDeleteResult {
  intersectionId: string
  deleted: boolean
}

export function listIntersections(query: IntersectionQuery = {}): Promise<PageResult<IntersectionItem>> {
  const params: QueryParams = {
    cityCode: query.cityCode,
    keyword: query.keyword,
    enabled: query.enabled,
    page: query.page,
    pageSize: query.pageSize
  }
  return get<PageResult<IntersectionItem>>('/admin/intersections', params)
}

export function createIntersection(payload: IntersectionCreatePayload): Promise<IntersectionItem> {
  return post<IntersectionItem>('/admin/intersections', payload)
}

export function updateIntersection(
  intersectionId: string,
  payload: IntersectionUpdatePayload
): Promise<IntersectionItem> {
  return put<IntersectionItem>(`/admin/intersections/${encodeURIComponent(intersectionId)}`, payload)
}

export function deleteIntersection(intersectionId: string): Promise<IntersectionDeleteResult> {
  return del<IntersectionDeleteResult>(`/admin/intersections/${encodeURIComponent(intersectionId)}`)
}