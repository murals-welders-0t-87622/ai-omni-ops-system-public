const fields = new Set(['prompt', 'duration', 'ratio', 'resolution', 'image', 'file', 'audio']);
function buildSeedanceNodes(template, video, upload) {
  if (!Array.isArray(template) || !template.length || !video.prompt || !upload?.dataBase64) throw Error('视频模板、创意或真实产品图不完整');
  const found = new Set(); let images = 0, prompts = 0;
  const nodes = template.map(n => {
    if (!fields.has(n.fieldName)) throw Error('视频实时模板出现未适配字段，请先更新适配器');
    const out = { ...n }; delete out.upload; delete out.localFilePath;
    if (n.fieldType === 'IMAGE') { out.fieldValue = 'None'; if (images++ === 0) out.upload = upload; }
    else if (['VIDEO', 'AUDIO'].includes(n.fieldType)) out.fieldValue = 'None';
    else if (n.fieldName === 'prompt') { out.fieldValue = /禁止|字幕/.test(n.fieldValue) && String(n.fieldValue).length < 80 ? '保留当前创意明确要求的文字与安全提示；不得新增水印、未经证实的功效、疾病治疗承诺或认证。' : video.prompt; prompts++; }
    else if (['duration', 'ratio', 'resolution'].includes(n.fieldName)) {
      const desired = String(video[n.fieldName]); let decoded = JSON.parse(n.fieldData); if (typeof decoded === 'string') decoded = JSON.parse(decoded);
      const options = Array.isArray(decoded?.[0]) ? decoded[0].map(String) : [];
      if (!options.includes(desired)) throw Error('当前应用不支持已确认的' + n.fieldName);
      out.fieldValue = options.includes(String(n.fieldValue)) ? desired : /^\d+$/.test(String(n.fieldValue)) ? String(options.indexOf(desired)) : desired;
      found.add(n.fieldName);
    } else throw Error('未知视频媒体字段，请先更新适配器');
    return out;
  });
  if (!images || prompts < 1 || found.size !== 3 || !nodes.some(n => n.fieldValue === video.prompt)) throw Error('实时模板缺少必要图片/创意/参数，拒绝沿用旧模板内容');
  return nodes;
}
module.exports = { buildSeedanceNodes };
