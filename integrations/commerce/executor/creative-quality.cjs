// Check newly generated marketing copy; internal evidence remains separate.
function assertCreativeCopy(fragment) {
  for (const p of fragment.sellingPoints || []) if (/(资料|组成信息|使用边界|身份与规格).*(清楚|明确|可查|清晰)/.test(p.title)) throw Error('这条是资料核验信息，不是顾客购买利益，请重写卖点');
  const copy = [fragment.listing?.title, fragment.listing?.description, ...(fragment.listing?.faq || []).map(f=>f.answer), ...(fragment.mainImages || fragment.pages || []).map(p=>p.copy)].filter(Boolean).join('\n');
  if (/待补当前|历史参考|注册有效性核验|归属待核|当前售价待|product\.|资料中的\d+元/.test(copy)) throw Error('内部核对备注混入消费者文案，请移至evidence或identityLock并重写文案');
}
module.exports={assertCreativeCopy};
