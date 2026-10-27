"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_GOALS = void 0;
exports.normalizePrivateRoadmap = normalizePrivateRoadmap;
exports.normalizePrivateActivity = normalizePrivateActivity;
exports.readPrivatePlan = readPrivatePlan;
exports.PRIVATE_GOALS = ["traffic", "conversion", "aov", "repeat"];
const object = (v, keys) => { if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)))
    throw Error("经营方案字段无效"); };
const text = (v) => { if (typeof v !== "string" || !v.trim() || v.length > 8000)
    throw Error("请完整填写经营方案的具体内容"); return v.trim(); };
const strings = (v, keys) => { object(v, keys); for (const k of keys)
    text(v[k]); };
const day = (v) => { if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)
    throw Error("经营方案日期无效"); };
const time = (v) => { text(v); if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v)))
    throw Error("经营方案时间需带时区"); day(v.slice(0, 10)); };
const count = (v, nullable = true) => { if (nullable && v === null)
    return; if (!Number.isSafeInteger(v) || v < 0)
    throw Error("价格分金额、数量必须为非负整数，未知使用null"); };
const goal = (v) => { if (!exports.PRIVATE_GOALS.includes(v))
    throw Error("私域目标限流量、转化、客单、复购"); };
const parse = (v) => { try {
    return JSON.parse(v);
}
catch {
    throw Error("经营方案需要有效结构化内容");
} };
function normalizePrivateRoadmap(value) {
    const v = parse(value);
    object(v, ["version", "stage", "reason", "focus", "steps"]);
    if (v.version !== "private-roadmap/1")
        throw Error("阶段方案版本无效");
    for (const k of ["stage", "reason", "focus"])
        text(v[k]);
    if (!Array.isArray(v.steps) || v.steps.length < 1 || v.steps.length > 8)
        throw Error("阶段路径需要1至8步");
    for (const [i, s] of v.steps.entries()) {
        object(s, ["order", "title", "start", "end", "goals", "deliverable", "advanceWhen", "ifNotMet"]);
        if (s.order !== i + 1)
            throw Error("阶段顺序须从1连续递增");
        for (const k of ["title", "deliverable", "advanceWhen", "ifNotMet"])
            text(s[k]);
        day(s.start);
        day(s.end);
        if (s.end < s.start || i && s.start <= v.steps[i - 1].end)
            throw Error("阶段时间须按先后顺序且不重叠");
        if (!Array.isArray(s.goals) || !s.goals.length || s.goals.length > 4)
            throw Error("阶段需要明确目标");
        s.goals.forEach(goal);
    }
    return v;
}
function normalizePrivateActivity(value) {
    const v = parse(value);
    object(v, ["version", "stageOrder", "objective", "title", "startAt", "endAt", "product", "audience", "mechanism", "steps", "youzan", "copy", "targets", "economics", "review", "releaseConditions", "source"]);
    if (v.version !== "private-activity/1")
        throw Error("活动方案版本无效");
    if (!Number.isInteger(v.stageOrder) || v.stageOrder < 1 || v.stageOrder > 8)
        throw Error("请选择1至8的关联阶段");
    goal(v.objective);
    for (const k of ["title", "mechanism", "economics", "releaseConditions", "source"])
        text(v[k]);
    time(v.startAt);
    time(v.endAt);
    if (Date.parse(v.startAt) >= Date.parse(v.endAt))
        throw Error("活动结束须晚于开始");
    object(v.product, ["name", "spec", "itemId", "skuId", "priceFen", "priceBasis", "activityStock", "stockBasis", "perBuyer", "shipping", "stacking"]);
    for (const k of ["name", "spec", "itemId", "skuId", "priceBasis", "stockBasis", "shipping", "stacking"])
        text(v.product[k]);
    for (const k of ["priceFen", "activityStock", "perBuyer"])
        count(v.product[k]);
    if (v.product.perBuyer === 0 || v.product.activityStock === 0 || v.product.perBuyer !== null && v.product.activityStock !== null && v.product.perBuyer > v.product.activityStock)
        throw Error("活动库存与每人限购须大于0且限购不超过总量");
    object(v.audience, ["include", "exclude", "matchedCount", "basis"]);
    for (const k of ["include", "exclude", "basis"])
        text(v.audience[k]);
    count(v.audience.matchedCount);
    if (!Array.isArray(v.steps) || !v.steps.length || v.steps.length > 30)
        throw Error("活动需要1至30项具体行动");
    for (const s of v.steps) {
        strings(s, ["at", "owner", "action", "deliverable"]);
        time(s.at);
    }
    strings(v.youzan, ["feature", "availability", "configuration", "verification", "fallback"]);
    strings(v.copy, ["entry", "service"]);
    if (!Array.isArray(v.targets) || !v.targets.length || v.targets.length > 4)
        throw Error("活动需要1至4项经营目标");
    const keys = new Set();
    const units = { traffic: "人", conversion: "%", aov: "元/付款买家", repeat: "%" };
    for (const t of v.targets) {
        object(t, ["metricKey", "value", "unit", "formula", "basis"]);
        goal(t.metricKey);
        if (keys.has(t.metricKey))
            throw Error("活动指标不可重复");
        keys.add(t.metricKey);
        if (typeof t.value !== "number" || !Number.isFinite(t.value) || t.value <= 0)
            throw Error("活动需有明确正数建议目标，不能用0表示未评估或未知；执行实际另存");
        for (const k of ["unit", "formula", "basis"])
            text(t[k]);
        if (t.unit !== units[t.metricKey])
            throw Error("经营目标单位须为流量人、转化%、客单元/付款买家、复购%；不能用完成清单的二值替代经营指标");
        if (["conversion", "repeat"].includes(t.metricKey) && t.value > 100)
            throw Error("比例不能超过100%");
        if (t.metricKey === "traffic" && !Number.isSafeInteger(t.value))
            throw Error("访客目标须为整数人数");
    }
    if (!keys.has(v.objective))
        throw Error("活动目标需包含主要指标");
    strings(v.review, ["at", "keep", "adjust", "stop"]);
    time(v.review.at);
    if (Date.parse(v.review.at) < Date.parse(v.endAt))
        throw Error("复盘须在活动结束后");
    return v;
}
function readPrivatePlan(value) { try {
    return value ? JSON.parse(value) : null;
}
catch {
    return null;
} }
//# sourceMappingURL=private-plan.js.map