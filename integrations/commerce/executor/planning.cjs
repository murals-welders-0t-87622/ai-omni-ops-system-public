const {prepareGeneratedResult,recoverableDraft,assertRequestedTargets}=require('./planning-result.cjs');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const shared=path.resolve(__dirname,'../../../packages/shared/dist');
const {COMMERCE_OPERATING_MAP_SCHEMA,normalizeCommerceOperatingMap}=require(path.join(shared,'commerce-operating-map.js'));
const {COMMERCE_SCORECARD_SCHEMA,normalizeCommerceScorecard}=require(path.join(shared,'commerce-scorecard.js'));
const {commerceHistoryScenarios,assertHistoryBasedTargets}=require(path.join(shared,'commerce-history.js'));
const {COMMERCE_METRIC_CATALOG,assertAdvertisingOnlyBudget}=require(path.join(shared,'commerce-planning.js'));
function strictSchema(value){const v=JSON.parse(JSON.stringify(value));function walk(s){if(s.properties){const required=new Set(s.required||[]);for(const k of ['investment','variants','group','sequence','monitoring'])if(s.properties[k])required.add(k);for(const k of Object.keys(s.properties))if(!required.has(k))delete s.properties[k];s.required=Object.keys(s.properties);for(const c of Object.values(s.properties))walk(c);}if(s.items)walk(s.items);}walk(v);return v;}
const stages=['diagnosis','merchandising','traffic','retention','service','review'];
const str={type:'string'},object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const schema=object({report:str,actions:{type:'array',minItems:1,maxItems:50,items:object({key:str,stage:{enum:['diagnosis','merchandising','traffic','retention','service','review']},title:str,body:str,owner:str,dueDate:str,successMetric:str,status:{enum:['proposed','in_progress','review','closed']}})},scorecard:strictSchema(COMMERCE_SCORECARD_SCHEMA),operatingMap:strictSchema(COMMERCE_OPERATING_MAP_SCHEMA)});
for(const metric of [schema.properties.scorecard.properties.goal,schema.properties.scorecard.properties.drivers.items]) metric.properties.stage={enum:stages};
async function runReplan({job,call,guard,codex,token,folder,log}){
 const w=await call('commerce_get_workspace',{area:'operations'}),current=w.plans.find(p=>p.id===job.projectId);
 if(!current||current.revision!==job.revision)throw Error('经营方案已变化，请核当前版本');
 const source=job.sourcePlan,detail=await call('commerce_get_workspace',{area:'detail'}),method=path.resolve(__dirname,'../skills/taobao-tmall-operations');
 const methods=['SKILL.md','references/history-to-action.md','references/gmv-operating-map.md','references/metric-playbooks.md','references/financial-scorecard.md'].map(f=>fs.readFileSync(path.join(method,f),'utf8')).join('\n');
 const context={requestedTargets:job.targetScenario,feedback:job.instructions,sourcePlan:source,shop:w.shops.find(s=>s.id===source.shopId),snapshots:w.snapshots.filter(s=>s.shopId===source.shopId).slice(0,8),products:detail.products.map(p=>Object.fromEntries(['id','productName','price','productPositioning','usageScenario','targetAudience','detailDescription'].map(k=>[k,String(p[k]??'').slice(0,k==='detailDescription'?1800:500)]))),projects:detail.projects.map(p=>({id:p.id,productId:p.productId,title:p.title,revision:p.revision})),historyScenarios:commerceHistoryScenarios(source,w.snapshots),metricCatalog:COMMERCE_METRIC_CATALOG};
 fs.writeFileSync(path.join(folder,'request.json'),JSON.stringify({jobId:job.id,context}));fs.writeFileSync(path.join(folder,'schema.json'),JSON.stringify(schema));
 const base=`你是品牌电商运营官。输出中文结构化JSON，沿用战略→策略→执行，不调用工具或改变外部店铺。用户headline目标必须等于requestedTargets；用户手工目标与historyScenarios不相同则明确标为“用户经营要求”，不能编历史证明。三个历史情景优先逐字采用historyScenarios的GMV、orders、averageOrderValue与basis；资料只有一个历史窗则只给一个历史情景，不能凑三个。目标历史表：实际日期/真实数值→计划日期/目标→公式→为什么可做到→对应动作。额外驱动指标只有同key/definition/unit的历史才可设数值，目标不能超出观测历史区间；无合格历史target=null，并制定具体采集/优化动作。禁止任意填写CTR0.8%、转化1.3%、件单1.1、ROI2等数字。用户输入的整体ROI=全店支付GMV/广告费，requestedTargets.adSpend是GMV÷整体ROI按分四舍五入得到的用户目标，选中档scenarios的investment.cash必须精确等于该值，全部广告策略预算之和须与该值一致；若用户未提供整体ROI则沿用历史预算推演。整体ROI不是广告归因ROI，后者=同口径归因成交/花费，两者不能混用，也都不是净利润。全部预算只算广告，其他主图、视频、客服、仓配、商品、税费、人工不计入本经营模型；非广告initiative的variants.budget必须0。每档广告总额等于对应广告策略之和，用户输入的广告费是经营目标并注明依据和风险，不伪称历史实绩；其他档次来源须为明确历史投入和时间折算，预期归因成交=广告费×有依据的广告归因ROI。缺归因窗不称成熟。历史ROI<1须解释成交额未覆盖广告费，不建议盲目按历史复制投放。
8类策略：traffic自然流量、advertising广告投流（必须单独有）、conversion商品转化、basket客单、retention会员复购、service履约售后、profit成交广告回报、measurement数据复盘。只列本店适用指标/动作，不为凑数量编目标。每条策略从真实问题出发，给具体商品/广告计划ID、后台导航与字段、可复制文案/填写值、连续步骤、岗位、时间、复测报表和判断。不能只写“核门/算双支贡献/分成熟窗”等术语，面向普通运营人员说明怎么做；未知价格不编新价。没有直接写工具，直接在策略交付人工操作清单，保留内容制作入口。旧行动稳定key和真实状态保留，新增动作可proposed。每个指标/action/tactic双向关联。基线ID和计划起止沿用sourcePlan。渠道来源有重叠或未知时，仅全店一个channel根计入总GMV，其他自然/付费分支用support、targetGmv=null，不编36000/4000/8000配额。复购不是总GMV再乘的系数。商品标题不是注册用途证明，但产品卖点必须表达用户利益，不把证据核验写成运营主线。
方法：
${methods}
上下文：
${JSON.stringify(context)}`;
 const saveResult=async result=>{
  const repairs=prepareGeneratedResult(result,source);if(repairs.length)log({jobId:job.id,phase:'plan_format_normalized',repairs});
   if(result.scorecard.baselineSnapshotId!==source.scorecard.baselineSnapshotId||result.scorecard.start!==source.scorecard.start||result.scorecard.end!==source.scorecard.end)throw Error('不可改变基线或计划周期');
   const metrics=[result.scorecard.goal,...result.scorecard.drivers],linkErrors=[];for(const m of metrics)if(!stages.includes(m.stage))linkErrors.push('指标 '+m.id+' 的stage='+m.stage+' 不在六报表环节内');for(const t of result.scorecard.tactics)for(const id of t.driverIds)if(!metrics.some(m=>m.id===id&&m.actionKeys.includes(t.actionKey)))linkErrors.push('tactic '+t.actionKey+' 引用 '+id+' 但该指标actionKeys没有反向关联');for(const a of result.actions)if(!result.scorecard.tactics.some(t=>t.actionKey===a.key))linkErrors.push('行动 '+a.key+' 缺tactic排期资源');if(linkErrors.length)throw Error(linkErrors.join('；'));
   assertRequestedTargets(result,job.targetScenario);
   const card=normalizeCommerceScorecard(result.scorecard,result.actions,stages);assertHistoryBasedTargets({...source,scorecard:card},context.snapshots);assertAdvertisingOnlyBudget(result.operatingMap);normalizeCommerceOperatingMap(result.operatingMap,result.actions,card);
   await guard();await call('commerce_save_operations_plan',{planId:source.id,shopId:source.shopId,snapshotId:source.snapshotId,expectedRevision:job.revision,title:source.title,report:result.report,actions:result.actions,scorecard:result.scorecard,operatingMap:result.operatingMap,planTaskId:job.id,executorId:job.executorId,leaseToken:job.leaseToken,idempotencyKey:job.id+'-save-plan',skillVersion:'taobao-tmall-operations@1.5.0'});
 };
 const recovered=recoverableDraft(w,job,folder);if(recovered){try{await saveResult(recovered.result);fs.writeFileSync(path.join(folder,'recovery.json'),JSON.stringify({fromTask:recovered.fromTask,sourceFile:recovered.sourceFile,originalRetained:true}));log({jobId:job.id,phase:'recovered_previous_codex_draft',fromTask:recovered.fromTask});return;}catch(e){log({jobId:job.id,phase:'previous_draft_not_reusable',reason:String(e.message).slice(0,1000)});}}
 let error='';for(let attempt=0;attempt<2;attempt++){
  await guard();const resultPath=path.join(folder,'result-'+attempt+'.json');const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/TOKEN|API.?KEY|SECRET|PASSWORD|AUTHORIZATION/i.test(k)));
  log({jobId:job.id,phase:'codex_plan_start',attempt});
  await new Promise((resolve,reject)=>{const child=spawn(codex,['exec','--ignore-user-config','--json','--ephemeral','--sandbox','read-only','--skip-git-repo-check','--cd',folder,'--output-schema',path.join(folder,'schema.json'),'--output-last-message',resultPath,'-'],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});const stream=fs.createWriteStream(path.join(folder,'codex-plan-'+attempt+'.jsonl'));for(const channel of [child.stdout,child.stderr])channel.on('data',b=>stream.write(String(b).replaceAll(token,'[REDACTED]')));const timer=setTimeout(()=>{child.kill();reject(Error('经营重排超过20分钟，保留草稿供核对'));},20*60000);child.on('error',e=>{clearTimeout(timer);stream.end();reject(e)});child.on('exit',code=>{clearTimeout(timer);stream.end();code===0?resolve():reject(Error('Codex经营重排退出码'+code))});child.stdin.end(base+(error?'\n上次结构校验失败，请修正后重新生成完整结果：'+error:''));});
  try{const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));await saveResult(result);return;
  }catch(e){error=String(e.message).slice(0,2400);log({jobId:job.id,phase:'plan_validation_failed',attempt,reason:error});if(attempt===1)throw e;}
 }
}
module.exports={runReplan,strictSchema,schema};
