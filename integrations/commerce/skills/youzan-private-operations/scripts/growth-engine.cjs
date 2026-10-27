"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROWTH_TAGS = exports.PRIVATE_GROWTH_VERSION = void 0;
exports.normalizeGrowthData = normalizeGrowthData;
exports.analyzeGrowthData = analyzeGrowthData;
/* Deterministic private-domain analysis. The input provenance and completeness remain source claims. */
exports.PRIVATE_GROWTH_VERSION = "private-growth/1.0.0";
const day = 86400000;
const fields = (x, keys) => { if (!x || typeof x !== "object" || Array.isArray(x) || Object.keys(x).some(k => !keys.includes(k)))
    throw Error("增长数据包含不支持的字段"); };
const str = (x, max = 2000) => { if (typeof x !== "string" || !x.trim() || x.length > max)
    throw Error("增长数据文字字段无效"); return x.trim(); };
const iso = (x) => { const s = str(x, 40); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s.slice(0, 10)).toISOString().slice(0, 10) !== s.slice(0, 10))
    throw Error("增长数据时间须真实有效且带时区"); return new Date(s).toISOString(); };
const money = (x) => { if (typeof x !== "string" || !/^\d{1,16}$/.test(x))
    throw Error("金额须为非负整数分的字符串"); return BigInt(x).toString(); };
const bool = (x) => { if (typeof x !== "boolean")
    throw Error("请明确数据完整性，未知不能填写完整"); return x; };
const customer = (x) => { if (typeof x !== "string" || !/^([a-f0-9]{32}|[a-f0-9]{64})$/.test(x))
    throw Error("客户键须为同品牌稳定散列值，不能传姓名电话或原始个人标识"); return x; };
function normalizeGrowthData(input) {
    fields(input, ["version", "shopId", "capturedAt", "historyStart", "asOf", "ordersComplete", "membersComplete", "historyFromFirstTrade", "coverage", "source", "orders", "members"]);
    if (input.version !== "private-growth-data/1")
        throw Error("增长数据版本不支持");
    const shopId = str(input.shopId, 30);
    if (!/^\d+$/.test(shopId))
        throw Error("店铺须为原始kdt_id");
    const capturedAt = iso(input.capturedAt), historyStart = iso(input.historyStart), asOf = iso(input.asOf);
    if (historyStart >= asOf || capturedAt < asOf)
        throw Error("增长数据窗口无效，asOf为不含端点");
    fields(input.source, ["toolName", "workSessionId", "workRequestId", "evidence"]);
    if (!["agent_call", "youzan_query"].includes(input.source.toolName))
        throw Error("需要真实有赞来源说明");
    const source = { toolName: input.source.toolName, workSessionId: str(input.source.workSessionId, 64), workRequestId: str(input.source.workRequestId, 48), evidence: str(input.source.evidence, 12000) };
    if (!Array.isArray(input.orders) || input.orders.length > 2000 || !Array.isArray(input.members) || input.members.length > 5000)
        throw Error("本次数据上限2000订单/5000客户，请缩小完整窗口，不得截断冒充全量");
    const seen = new Set();
    const orders = input.orders.map((o) => {
        fields(o, ["id", "customerKey", "createdAt", "paidAt", "paymentState", "paidFen", "refundFen", "channel", "items"]);
        const id = str(o.id, 120);
        if (seen.has(id))
            throw Error("存在重复订单，请先去重并核对冲突");
        seen.add(id);
        const createdAt = iso(o.createdAt), paidAt = o.paidAt == null ? null : iso(o.paidAt);
        if (createdAt >= asOf || paidAt && paidAt >= asOf || paidAt && paidAt < createdAt)
            throw Error("订单时间不在数据截止前或付款先于创建");
        if (!["paid", "unpaid", "unknown"].includes(o.paymentState))
            throw Error("付款状态无效");
        if (o.paymentState === "paid" && !paidAt)
            throw Error("已付订单须有真实付款时间");
        if (o.paymentState === "unpaid" && paidAt)
            throw Error("付款时间与未付状态冲突");
        const paidFen = money(o.paidFen), refundFen = o.refundFen == null ? null : money(o.refundFen);
        if (refundFen !== null && BigInt(refundFen) > BigInt(paidFen))
            throw Error("退款大于该订单实付");
        if (o.paymentState === "unpaid" && BigInt(paidFen) !== 0n)
            throw Error("未付订单不能写实付金额");
        if (!Array.isArray(o.items) || o.items.length > 100)
            throw Error("订单商品明细无效");
        const items = o.items.map((i) => { fields(i, ["itemId", "skuId", "quantity", "paidFen"]); if (!Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 100000)
            throw Error("商品数量无效"); return { itemId: str(i.itemId, 120), skuId: str(i.skuId, 120), quantity: i.quantity, paidFen: i.paidFen == null ? null : money(i.paidFen) }; });
        if (items.length && items.every((i) => i.paidFen !== null) && items.reduce((s, i) => s + BigInt(i.paidFen), 0n) > BigInt(paidFen))
            throw Error("商品分摊实付合计大于订单实付");
        return { id, customerKey: customer(o.customerKey), createdAt, paidAt, paymentState: o.paymentState, paidFen, refundFen, channel: o.channel ? str(o.channel, 120) : "unknown", items };
    });
    const membersSeen = new Set();
    const members = input.members.map((m) => { fields(m, ["customerKey", "joinedAt", "isMember"]); const key = customer(m.customerKey); if (membersSeen.has(key))
        throw Error("客户重复，请先去重"); membersSeen.add(key); const joinedAt = m.joinedAt == null ? null : iso(m.joinedAt); if (joinedAt && joinedAt >= asOf)
        throw Error("入会时间晚于截止"); return { customerKey: key, joinedAt, isMember: bool(m.isMember) }; });
    return { version: input.version, shopId, capturedAt, historyStart, asOf, ordersComplete: bool(input.ordersComplete), membersComplete: bool(input.membersComplete), historyFromFirstTrade: bool(input.historyFromFirstTrade), coverage: str(input.coverage, 12000), source, orders, members };
}
const sum = (a, get) => a.reduce((s, x) => s + get(x), 0n).toString();
const ratio = (n, d) => ({ numerator: n, denominator: d, value: d ? Math.round(n / d * 10000) / 10000 : null });
exports.GROWTH_TAGS = [
    { key: "observed_one", name: "观察期内1笔净购买", rule: "完整订单窗口内恰好1笔已付且退款后金额大于0的订单", next: "首购承接／二购服务；历史不足不称终身首购" },
    { key: "observed_repeat", name: "观察期内多次净购买", rule: "完整订单窗口内至少2笔净购买订单", next: "分析已购品类、复购间隔和会员价值" },
    { key: "recent_30", name: "近30天有净购买", rule: "最近净购买付款时间距数据截止不超过30天", next: "交付使用服务和当前需要匹配" },
    { key: "gap_31_60", name: "距上次净购买31—60天", rule: "观察窗口覆盖60天且最近净购买间隔大于30、不大于60天", next: "结合商品实际间隔判断是否需要回访，不能直接认定流失" },
    { key: "gap_60plus", name: "观察期内超60天未再购", rule: "观察窗口覆盖60天且最近净购买距截止超过60天", next: "按品类、周期与服务情况判断召回候选" },
    { key: "member_no_observed", name: "会员在观察期无净购买", rule: "会员清单与订单窗口均完整且该会员无净购买", next: "区分新注册、历史已购与当下无需求，不叫零消费沉睡" },
    { key: "refund_observed", name: "观察期有退款记录", rule: "已付订单累计退款字段大于0", next: "先核退款原因与售后是否结束，不推断仍有投诉" }
];
function analyzeGrowthData(raw) {
    const d = normalizeGrowthData(raw), end = Date.parse(d.asOf), start = Date.parse(d.historyStart), days = (end - start) / day;
    const paid = d.orders.filter(o => o.paymentState === "paid" && o.paidAt && Date.parse(o.paidAt) >= start && BigInt(o.paidFen) > 0n).sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.id.localeCompare(b.id));
    const refundsKnown = paid.every(o => o.refundFen !== null), usable = d.ordersComplete && refundsKnown;
    const net = (o) => BigInt(o.paidFen) - BigInt(o.refundFen || "0");
    const retained = paid.filter(o => o.refundFen !== null && net(o) > 0n), groups = new Map();
    for (const o of retained) {
        const a = groups.get(o.customerKey) || [];
        a.push(o);
        groups.set(o.customerKey, a);
    }
    const memberMap = new Map(d.members.map(m => [m.customerKey, m])), keys = new Set([...memberMap.keys(), ...paid.map(o => o.customerKey)]);
    const customers = [...keys].map(key => {
        const orders = groups.get(key) || [], last = orders.at(-1), recency = last ? (end - Date.parse(last.paidAt)) / day : null, tags = [];
        if (usable) {
            if (orders.length === 1)
                tags.push("observed_one");
            if (orders.length >= 2)
                tags.push("observed_repeat");
            if (recency !== null && recency <= 30)
                tags.push("recent_30");
            if (days >= 60 && recency !== null && recency > 30 && recency <= 60)
                tags.push("gap_31_60");
            if (days >= 60 && recency !== null && recency > 60)
                tags.push("gap_60plus");
            if (d.membersComplete && memberMap.get(key)?.isMember && !orders.length)
                tags.push("member_no_observed");
        }
        if (paid.some(o => o.customerKey === key && o.refundFen !== null && BigInt(o.refundFen) > 0n))
            tags.push("refund_observed");
        return { customerKey: key, alias: "客户 · " + key.slice(-6), member: memberMap.get(key)?.isMember ?? null, orders: usable ? orders.length : null, recencyDays: usable && recency !== null ? Math.floor(recency) : null, netFen: usable ? sum(orders, net) : null, firstObservedAt: usable ? orders[0]?.paidAt || null : null, lastObservedAt: usable ? last?.paidAt || null : null, itemIds: usable ? [...new Set(orders.flatMap(o => o.items.map(i => i.itemId)))] : [], tags };
    });
    const periods = [{ key: "current14", start: end - 14 * day, end }, { key: "previous14", start: end - 28 * day, end: end - 14 * day }].map(p => { const a = paid.filter(o => Date.parse(o.paidAt) >= p.start && Date.parse(o.paidAt) < p.end), r = a.filter(o => o.refundFen !== null && net(o) > 0n); return { key: p.key, start: new Date(p.start).toISOString(), end: new Date(p.end).toISOString(), covered: d.ordersComplete && start <= p.start, paidOrders: a.length, buyers: new Set(a.map(x => x.customerKey)).size, paidFen: sum(a, o => BigInt(o.paidFen)), retainedOrders: refundsKnown ? r.length : null, netFen: refundsKnown ? sum(a, net) : null, netDefinition: "此付款批次截至采集时的累计退款后金额，不是退款日现金流或利润" }; });
    const cohorts = [30, 60].map(window => { const eligible = usable ? [...groups.values()].filter(a => Date.parse(a[0].paidAt) + window * day <= end) : []; const repeated = eligible.filter(a => a.slice(1).some(o => Date.parse(o.paidAt) < Date.parse(a[0].paidAt) + window * day)); return { windowDays: window, available: usable, historyBasis: d.historyFromFirstTrade ? "已声明首笔交易历史完整的净首购队列" : "观察期首次净购买队列，不能称真实首购", ...ratio(repeated.length, eligible.length), immature: usable ? groups.size - eligible.length : null }; });
    const channels = [...new Set(paid.map(o => o.channel))].map(channel => { const a = paid.filter(o => o.channel === channel); return { channel, orders: a.length, buyers: new Set(a.map(o => o.customerKey)).size, paidFen: sum(a, o => BigInt(o.paidFen)), netFen: refundsKnown ? sum(a, net) : null }; });
    const itemKeys = [...new Set(paid.flatMap(o => o.items.map(i => i.itemId)))];
    const products = itemKeys.map(itemId => { const a = paid.filter(o => o.items.some(i => i.itemId === itemId)), lines = a.flatMap(o => o.items.filter(i => i.itemId === itemId)); return { itemId, orders: a.length, buyers: new Set(a.map(o => o.customerKey)).size, units: lines.reduce((s, i) => s + i.quantity, 0), allocatedPaidFen: lines.every(i => i.paidFen !== null) ? sum(lines, i => BigInt(i.paidFen)) : null, definition: "销售数量未按退货数量净额化；缺商品分摊不将整单金额重复分配" }; });
    const tagSummary = exports.GROWTH_TAGS.map(t => ({ ...t, count: (t.key === "refund_observed" ? refundsKnown : (t.key === "member_no_observed" ? usable && d.membersComplete : usable && (!t.key.startsWith("gap_") || days >= 60))) ? customers.filter(c => c.tags.includes(t.key)).length : null, computedAt: d.asOf }));
    return { version: exports.PRIVATE_GROWTH_VERSION, shopId: d.shopId, asOf: d.asOf, capturedAt: d.capturedAt, historyStart: d.historyStart, coverage: { days, ordersCompleteReported: d.ordersComplete, membersCompleteReported: d.membersComplete, historyFromFirstTradeReported: d.historyFromFirstTrade, refundsKnown, records: d.orders.length, members: d.members.length, evidenceLevel: "computed_from_provided_rows", inputEvidenceLevel: "executor_reported", description: d.coverage, source: d.source },
        metrics: { paidOrders: paid.length, paidBuyers: new Set(paid.map(o => o.customerKey)).size, paidFen: sum(paid, o => BigInt(o.paidFen)), refundFen: refundsKnown ? sum(paid, o => BigInt(o.refundFen)) : null, netFen: refundsKnown ? sum(paid, net) : null, retainedBuyers: usable ? groups.size : null, observedRepeat: usable ? ratio([...groups.values()].filter(a => a.length >= 2).length, groups.size) : null, unknownPayment: d.orders.filter(o => o.paymentState === "unknown").length },
        periods, cohorts, tagSummary, customers, channels, products, limitations: [...(!d.ordersComplete ? ["订单非完整窗口，生命周期/复购/覆盖人数不作全店推断"] : []), ...(!refundsKnown ? ["部分订单退款未知，净额及购买标签不完整"] : []), ...(!d.historyFromFirstTrade ? ["历史首笔不完整，观察期首见不等于新客首购"] : []), "输入来源和分页完整性仍依赖上游证明；独立复算不等独立财务审计", "未提供浏览、加购、券、触达或活动关联时，不计算对应漏斗或因果增量"] };
}
//# sourceMappingURL=private-growth.js.map