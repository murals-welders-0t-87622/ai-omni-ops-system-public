const fs=require('node:fs'),path=require('node:path');
// Representation repair only: never invent metrics, actions or the selected user goal.
function prepareGeneratedResult(result,source){
 const oldActions=new Map(source.actions.map(a=>[a.key,a]));for(const a of result.actions){const old=oldActions.get(a.key);if(old)a.status=old.status;}for(const a of source.actions)if(!result.actions.some(n=>n.key===a.key))result.actions.push(a);
 const repairs=[],metrics=[result.scorecard.goal,...result.scorecard.drivers];for(const m of metrics){const old=[source.scorecard.goal,...source.scorecard.drivers].find(x=>x.id===m.id);if(old){if(['stage','metricKey','unit','definition'].some(k=>m[k]!==old[k]))repairs.push('identity:'+m.id);for(const k of ['stage','metricKey','unit','definition'])m[k]=old[k];if(old.derived)m.derived=old.derived;else delete m.derived;}}
 for(const t of result.scorecard.tactics)for(const id of t.driverIds){const m=metrics.find(m=>m.id===id);if(m&&!m.actionKeys.includes(t.actionKey)){m.actionKeys.push(t.actionKey);repairs.push('reciprocal:'+t.actionKey+':'+id);}}
 for(const s of result.operatingMap.scenarios)if(s.key!==result.operatingMap.selectedScenario&&/^\d{1,18}\.\d{9,}$/.test(s.averageOrderValue)){const [w,f]=s.averageOrderValue.split('.');let n=BigInt(w+f.slice(0,8));if(f[8]>='5')n++;const a=n.toString().padStart(9,'0');s.averageOrderValue=a.slice(0,-8)+'.'+a.slice(-8);repairs.push('precision8:'+s.key);}
 return repairs;
}
function recoverableDraft(w,job,folder){
 const rows=(w.tasks||[]).filter(t=>t.id!==job.id&&t.state==='FAILED'&&t.jobKind==='operations_replan'&&t.projectId===job.projectId&&t.projectRevision===job.revision&&/^[a-z0-9_-]+$/i.test(t.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 for(const old of rows.slice(0,3)){const dir=path.join(path.dirname(folder),old.id);try{const req=JSON.parse(fs.readFileSync(path.join(dir,'request.json'),'utf8')).context;if(req.sourcePlan.id!==job.projectId||req.sourcePlan.revision!==job.revision||req.feedback!==job.instructions||['gmv','orders','averageOrderValue'].some(k=>Number(req.requestedTargets[k])!==Number(job.targetScenario[k])))continue;const file=['result-1.json','result-0.json'].find(f=>fs.existsSync(path.join(dir,f)));if(file)return{fromTask:old.id,sourceFile:file,result:JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))};}catch{}}
 return null;
}
const {assertPlanningResultTargets}=require('../../../packages/shared/dist/commerce-planning');
const assertRequestedTargets=(result,target)=>assertPlanningResultTargets(result.operatingMap,result.scorecard,target);
module.exports={prepareGeneratedResult,recoverableDraft,assertRequestedTargets};
