"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePrivateBusiness = normalizePrivateBusiness;
const private_plan_1 = require("./plan-engine.cjs");
const obj = (v, keys) => { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)))
    throw Error('生意模式字段无效'); };
const txt = (v) => { if (typeof v !== 'string' || !v.trim() || v.length > 8000)
    throw Error('生意模式请写明具体内容、依据和判断'); };
const strs = (v, keys) => { obj(v, keys); keys.forEach(k => txt(v[k])); };
const list = (v, max) => { if (!Array.isArray(v) || !v.length || v.length > max)
    throw Error('生意模式条目数量无效'); };
const ids = (rows) => { const s = new Set(); for (const r of rows) {
    if (typeof r.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(r.id) || s.has(r.id))
        throw Error('生意模式标识须唯一');
    s.add(r.id);
} return s; };
const refs = (v, s) => { list(v, 20); if (v.some((x) => typeof x !== 'string' || !s.has(x)) || new Set(v).size !== v.length)
    throw Error('经营路线引用无效'); };
function normalizePrivateBusiness(value) {
    let v;
    try {
        v = JSON.parse(value);
    }
    catch {
        throw Error('生意模式需要结构化内容');
    }
    obj(v, ['version', 'asOf', 'summary', 'stage', 'stageReason', 'customers', 'lines', 'products', 'channels', 'privateRole', 'tracks', 'sources', 'limitations']);
    if (v.version !== 'brand-business-model/1')
        throw Error('生意模式版本无效');
    for (const k of ['asOf', 'summary', 'stage', 'stageReason', 'limitations'])
        txt(v[k]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.asOf) || !Number.isFinite(Date.parse(v.asOf)) || new Date(v.asOf).toISOString().slice(0, 10) !== v.asOf)
        throw Error('生意模式基准日期无效');
    list(v.customers, 20);
    const customers = ids(v.customers);
    for (const c of v.customers)
        strs(c, ['id', 'name', 'need', 'buyingPath', 'evidence']);
    list(v.lines, 20);
    const lines = ids(v.lines);
    for (const l of v.lines) {
        obj(l, ['id', 'name', 'customerIds', 'offer', 'revenue', 'repeat', 'priority', 'reason', 'evidence']);
        refs(l.customerIds, customers);
        for (const k of ['id', 'name', 'offer', 'revenue', 'repeat', 'priority', 'reason', 'evidence'])
            txt(l[k]);
    }
    list(v.products, 40);
    for (const p of v.products) {
        strs(p, ['lineId', 'name', 'role', 'price', 'economics', 'decision', 'evidence']);
        if (!lines.has(p.lineId))
            throw Error('商品须承接已定义生意线');
    }
    list(v.channels, 20);
    for (const c of v.channels)
        strs(c, ['name', 'role', 'handoff', 'boundary', 'evidence']);
    strs(v.privateRole, ['mission', 'traffic', 'conversion', 'aov', 'repeat']);
    list(v.tracks, 20);
    ids(v.tracks);
    for (const t of v.tracks) {
        obj(t, ['id', 'name', 'lineIds', 'goals', 'why', 'first', 'then', 'measure', 'owner', 'period']);
        refs(t.lineIds, lines);
        for (const k of ['id', 'name', 'why', 'first', 'then', 'measure', 'owner', 'period'])
            txt(t[k]);
        list(t.goals, 4);
        if (t.goals.some((g) => !private_plan_1.PRIVATE_GOALS.includes(g)) || new Set(t.goals).size !== t.goals.length)
            throw Error('经营路线目标限流量、转化、客单、复购');
    }
    list(v.sources, 30);
    for (const s of v.sources)
        strs(s, ['title', 'reference', 'asOf', 'scope']);
    return v;
}
//# sourceMappingURL=private-business.js.map