import { createHash } from "node:crypto";
import { CONNECTION_BRAND_TOOLS } from "./brand-operations.policy";

export const PRODUCTION_GRANT_VERSION = "brand-production/1.0.0";
export const DEFAULT_PRODUCTION_POLICY_VERSION = "brand-default-production/1.0.0";
export const PRODUCTION_CAPABILITIES = ["image_generation", "speech_synthesis", "runninghub_generation"] as const;
export type ProductionCapability = typeof PRODUCTION_CAPABILITIES[number];
export const PRODUCTION_CHOICES = [
  { id: "image_generation", label: "图片生成" },
  { id: "speech_synthesis", label: "语音合成" },
  { id: "runninghub_generation", label: "RunningHub 生成" },
];
export type ConnectionGrant = { tools: string[]; production?: { capabilities: ProductionCapability[]; expiresAt: string; purpose: string } };

export function normalizeProductionCapabilities(value: unknown): ProductionCapability[] {
  if (!Array.isArray(value) || value.length > 3 || value.some(v => !PRODUCTION_CAPABILITIES.includes(v))) throw new Error("请选择有效的制作能力");
  return [...new Set(value)].sort() as ProductionCapability[];
}

/** Old frozen arrays remain byte-compatible. Unknown versions fail closed. */
export function readConnectionGrant(value?: string | null): ConnectionGrant {
  try {
    const data = JSON.parse(value || "[]");
    if (Array.isArray(data)) return { tools: [...new Set(data.filter((v): v is string => typeof v === "string"))] };
    if (data?.version !== PRODUCTION_GRANT_VERSION || !Array.isArray(data.tools) || data.tools.some((v: unknown) => typeof v !== "string") || !data.production) return { tools: [] };
    const capabilities = normalizeProductionCapabilities(data.production.capabilities);
    if (typeof data.production.expiresAt !== "string" || !Number.isFinite(Date.parse(data.production.expiresAt)) || typeof data.production.purpose !== "string") return { tools: [] };
    return { tools: [...new Set(data.tools)] as string[], production: { capabilities, expiresAt: data.production.expiresAt, purpose: data.production.purpose } };
  } catch { return { tools: [] }; }
}

export function writeConnectionGrant(grant: ConnectionGrant) {
  if (!grant.production?.capabilities.length) return JSON.stringify(grant.tools);
  return JSON.stringify({ version: PRODUCTION_GRANT_VERSION, tools: grant.tools, production: grant.production });
}

export function activeProductionCapabilities(grant: ConnectionGrant, _now = Date.now()): ProductionCapability[] {
  // Production is part of the complete brand operating connection. Legacy lease
  // objects remain readable for history, but no longer impose a separate timer.
  return CONNECTION_BRAND_TOOLS.every(tool => grant.tools.includes(tool)) ? [...PRODUCTION_CAPABILITIES] : [];
}

export function effectiveConnectionTools(grant: ConnectionGrant, now = Date.now()) {
  const tools = [...grant.tools];
  if (activeProductionCapabilities(grant, now).includes("image_generation")) tools.push("create_design_work");
  return [...new Set(tools)];
}

/** Digest includes the stored lease, never its time-dependent active state. */
export function connectionGrantHash(value?: string | null) {
  const grant = readConnectionGrant(value), tools = [...grant.tools].sort();
  const canonical = grant.production?.capabilities.length ? { version: PRODUCTION_GRANT_VERSION, tools, production: { ...grant.production, capabilities: [...grant.production.capabilities].sort() } } : tools;
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
