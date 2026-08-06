"use client";

import { useSyncExternalStore } from "react";
import { getLocal, setLocal, generateId, formatDateTime } from "@/lib/utils";
import { DataSourceRecord, IntegratedTable } from "@/types";
import { seedDataSources } from "@/lib/mock-data/data-source";

const DS_KEY = "ds_records";
const TBL_KEY = "ds_integrated_tables";

// ========== 模块级状态 ==========
// 初值用静态 seed，保证 SSR 与 CSR 首渲染一致（避免 hydration mismatch）
let dataSources: DataSourceRecord[] = seedDataSources;
let integratedTables: IntegratedTable[] = [];
let hydrated = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

// 首次订阅时从 localStorage 合并已保存数据（仅客户端）
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const savedDs = getLocal<DataSourceRecord[] | null>(DS_KEY, null);
  const savedTbl = getLocal<IntegratedTable[] | null>(TBL_KEY, null);
  if (savedDs && Array.isArray(savedDs)) dataSources = savedDs;
  if (savedTbl && Array.isArray(savedTbl)) integratedTables = savedTbl;
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  hydrateOnce();
  return () => listeners.delete(listener);
}

// ========== 快照 ==========
function getDsSnapshot(): DataSourceRecord[] {
  return dataSources;
}
function getTblSnapshot(): IntegratedTable[] {
  return integratedTables;
}
// SSR 快照：返回静态 seed，确保服务端与首屏一致
function getDsServerSnapshot(): DataSourceRecord[] {
  return seedDataSources;
}
function getTblServerSnapshot(): IntegratedTable[] {
  return [];
}

// ========== Hooks ==========
export function useDataSources(): DataSourceRecord[] {
  return useSyncExternalStore(subscribe, getDsSnapshot, getDsServerSnapshot);
}

export function useIntegratedTables(): IntegratedTable[] {
  return useSyncExternalStore(subscribe, getTblSnapshot, getTblServerSnapshot);
}

// ========== 持久化 ==========
function persistDs() {
  setLocal(DS_KEY, dataSources);
}
function persistTbl() {
  setLocal(TBL_KEY, integratedTables);
}

// ========== 数据源 CRUD ==========
export type NewDataSource = Omit<DataSourceRecord, "id" | "createdAt" | "updatedAt" | "creator" | "updater">;

export function addDataSource(rec: NewDataSource): DataSourceRecord {
  const now = formatDateTime(Date.now());
  const full: DataSourceRecord = {
    ...rec,
    id: generateId(),
    creator: "admin",
    updater: "admin",
    createdAt: now,
    updatedAt: now,
  };
  dataSources = [full, ...dataSources];
  persistDs();
  emit();
  return full;
}

export function updateDataSource(id: string, patch: Partial<DataSourceRecord>): void {
  const now = formatDateTime(Date.now());
  dataSources = dataSources.map((d) =>
    d.id === id ? { ...d, ...patch, updater: "admin", updatedAt: now } : d
  );
  persistDs();
  emit();
}

export function removeDataSource(id: string): void {
  dataSources = dataSources.filter((d) => d.id !== id);
  persistDs();
  emit();
}

export function setDataSourceStatus(
  id: string,
  status: DataSourceRecord["status"]
): void {
  const now = formatDateTime(Date.now());
  dataSources = dataSources.map((d) => (d.id === id ? { ...d, status, updatedAt: now } : d));
  persistDs();
  emit();
}

export function getDataSourceById(id: string): DataSourceRecord | undefined {
  return dataSources.find((d) => d.id === id);
}

// ========== 集成数据表 ==========
export function addIntegratedTables(tables: IntegratedTable[]): number {
  const existing = new Set(integratedTables.map((t) => `${t.databaseName}:${t.name}`));
  const fresh = tables.filter((t) => !existing.has(`${t.databaseName}:${t.name}`));
  if (fresh.length === 0) return 0;
  integratedTables = [...integratedTables, ...fresh];
  persistTbl();
  emit();
  return fresh.length;
}

export function removeIntegratedTable(id: string): void {
  integratedTables = integratedTables.filter((t) => t.id !== id);
  persistTbl();
  emit();
}

export function syncIntegratedTable(id: string): void {
  const now = formatDateTime(Date.now());
  integratedTables = integratedTables.map((t) =>
    t.id === id ? { ...t, lastSyncedAt: now } : t
  );
  persistTbl();
  emit();
}
