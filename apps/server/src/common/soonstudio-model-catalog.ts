import officialCatalog from "./soonstudio-models.json";

/** Public catalogue metadata is not an account's inference authorization. */
export type SoonStudioModelType = "text" | "image" | "video" | "audio";
export type SoonStudioParameter = {
  name: string;
  type?: unknown;
  required?: boolean;
  enum?: unknown[];
  [key: string]: unknown;
};
export type SoonStudioApiExample = {
  id?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  contentType?: "json" | "multipart";
  headers?: Record<string, string>;
  bodyTemplate?: unknown;
  requestParams?: SoonStudioParameter[];
  source?: string;
};
export type SoonStudioModel = {
  id: string;
  name: string;
  maker: string;
  makerSlug?: string;
  primaryType: SoonStudioModelType;
  inputs: string[];
  outputs: string[];
  endpoints: string[];
  categories: string[];
  groups: string[];
  deprecated?: boolean;
  unsupportedReason?: string;
  apiExamples?: SoonStudioApiExample[];
  runwareNative?: {
    air?: string;
    taskType?: string;
    runnable?: boolean;
    status?: string;
    supportsAsync?: boolean;
    metadataUrl?: string;
    requestSchema?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export const SOONSTUDIO_MODELS: readonly SoonStudioModel[] = Object.freeze(
  (officialCatalog.models as unknown as SoonStudioModel[]).map((model) => Object.freeze(model)),
);
export const SOONSTUDIO_MODEL_IDS: readonly string[] = Object.freeze(SOONSTUDIO_MODELS.map((model) => model.id));
export const SOONSTUDIO_MODEL_CATALOG_INFO = Object.freeze({
  source: officialCatalog.source,
  docs: officialCatalog.docs,
  retrievedAt: officialCatalog.retrievedAt,
  total: SOONSTUDIO_MODELS.length,
  active: SOONSTUDIO_MODELS.filter((model) => !model.deprecated).length,
  deprecated: SOONSTUDIO_MODELS.filter((model) => model.deprecated).length,
  inferenceVerified: false,
});

const byId = new Map(SOONSTUDIO_MODELS.map((model) => [model.id, model]));
const foldedIds = new Map<string, SoonStudioModel | null>();
for (const model of SOONSTUDIO_MODELS) {
  const folded = model.id.toLowerCase();
  foldedIds.set(folded, foldedIds.has(folded) ? null : model);
}

/** Exact model IDs take priority; case folding is accepted only when unambiguous. */
export function getSoonStudioModel(modelId: string): SoonStudioModel | undefined {
  const id = String(modelId || "").trim();
  return byId.get(id) || foldedIds.get(id.toLowerCase()) || undefined;
}

export type SoonStudioModelQuery = {
  search?: string;
  category?: string;
  primaryType?: SoonStudioModelType;
  maker?: string;
  group?: string;
  includeDeprecated?: boolean;
  supportedOnly?: boolean;
  includeContracts?: boolean;
  offset?: number;
  limit?: number;
};

const boundedInteger = (value: unknown, fallback: number, maximum: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, Math.floor(number))) : fallback;
};

/** Contracts are returned on demand so browsing does not transfer every native schema. */
export function listSoonStudioModels(query: SoonStudioModelQuery = {}) {
  const terms = String(query.search || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const category = String(query.category || "").trim().toLowerCase();
  const maker = String(query.maker || "").trim().toLowerCase();
  const group = String(query.group || "").trim();
  const offset = boundedInteger(query.offset, 0, Number.MAX_SAFE_INTEGER);
  const limit = Math.max(1, boundedInteger(query.limit, 50, 200));
  const matches = SOONSTUDIO_MODELS.filter((model) => {
    if (!query.includeDeprecated && model.deprecated) return false;
    if (query.supportedOnly && model.unsupportedReason) return false;
    if (category && category !== "all" && !model.categories.includes(category)) return false;
    if (query.primaryType && model.primaryType !== query.primaryType) return false;
    if (maker && model.maker.toLowerCase() !== maker && model.makerSlug?.toLowerCase() !== maker) return false;
    if (group && !model.groups.includes(group)) return false;
    if (!terms.length) return true;
    const text = [model.id, model.name, model.maker, model.makerSlug, model.primaryType, ...model.categories, ...model.inputs, ...model.outputs].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const page = matches.slice(offset, offset + limit);
  const data = query.includeContracts ? page : page.map(({ apiExamples, runwareNative, ...model }) => model);
  return { object: "list" as const, total: matches.length, offset, limit, hasMore: offset + page.length < matches.length, data };
}
