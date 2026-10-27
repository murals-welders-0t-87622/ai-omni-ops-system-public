function mergeRevision(job, body, fragment) {
  const out = structuredClone(body);
  if (job.revisionScope === 'selling_points') { out.sellingPointReport = fragment.sellingPointReport; out.sellingPoints = fragment.sellingPoints; }
  else if (job.revisionScope === 'listing') out.listing = fragment.listing;
  else if (job.revisionScope === 'video') out.video = { ...out.video, ...fragment.video };
  else {
    const key = job.jobKind === 'main_copy' ? 'mainImages' : 'pages';
    for (const i of job.targetIndexes) {
      if (!out[key]?.[i] || !fragment.pages?.[i]) throw Error('修改输出缺少所选页面，保留原稿');
      out[key][i] = { ...out[key][i], ...fragment.pages[i] };
    }
  }
  return out;
}
module.exports = { mergeRevision };
