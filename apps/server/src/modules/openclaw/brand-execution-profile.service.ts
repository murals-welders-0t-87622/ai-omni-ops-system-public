import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService, type RequestAuthContext } from "../auth/auth.service";
import { BrandsService } from "../brands/brands.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { UserSkillsService } from "../user-skills/user-skills.service";

export type BrandExecutionConfig = { providerId: string; model: string; notes: string; skillIds: string[]; knowledgeBaseIds: string[] };
export const emptyExecutionConfig = (): BrandExecutionConfig => ({ providerId:"", model:"", notes:"", skillIds:[], knowledgeBaseIds:[] });
export function stableProfileJson(value: unknown): string {
  const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  return JSON.stringify(canonical(value));
}
export function normalizeExecutionConfig(value: unknown): BrandExecutionConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("执行配置格式不合法");
  const v = value as Record<string,unknown>, allowed = Object.keys(emptyExecutionConfig());
  if (Object.keys(v).some(k=>!allowed.includes(k))) throw new BadRequestException("执行配置不接收密钥、路径或未定义字段");
  const text = (k:string, max:number) => { if (v[k] !== undefined && typeof v[k] !== "string") throw new BadRequestException("配置字段类型不合法");const s=String(v[k]||"").trim();if(s.length>max)throw new BadRequestException("配置字段超长");return s; };
  const ids = (k:string) => { const a=v[k]??[];if(!Array.isArray(a)||a.length>20||a.some(x=>typeof x!=="string"||!x.trim()||x.length>160))throw new BadRequestException("配置引用不合法");return [...new Set(a as string[])].sort(); };
  return {providerId:text("providerId",160),model:text("model",160),notes:text("notes",4000),skillIds:ids("skillIds"),knowledgeBaseIds:ids("knowledgeBaseIds")};
}

@Injectable()
export class BrandExecutionProfileService {
  constructor(private readonly prisma:PrismaService,private readonly auth:AuthService,private readonly platforms:ThirdPartyPlatformsService,private readonly skills:UserSkillsService,private readonly brands:BrandsService) {}
  private async access(brandId:string,actor:RequestAuthContext) {
    if (!actor?.userId || actor.brandId !== brandId) throw new UnauthorizedException("执行配置必须属于当前授权品牌");
    await this.auth.assertBrandAdminAccess(brandId,actor);
    if (!(await this.prisma.canUseDatabase())) throw new UnauthorizedException("执行配置数据库暂不可用");
  }
  private async options(brandId:string,actor:RequestAuthContext) {
    const [platforms,skills,knowledge]=await Promise.all([this.platforms.listBrandModelSettings(brandId),this.skills.listUserSkills(actor),this.brands.listBusinessKnowledgeBases(brandId)]);
    return {platforms:platforms.filter(p=>p.status==="ACTIVE"&&p.modelIds.length),skills:skills.map(s=>({id:s.id,name:s.effectiveSkill.name,isCustomized:s.isCustomized})),knowledgeBases:knowledge.map(k=>({id:k.id,name:k.name})),fullSkills:skills};
  }
  private async checked(config:BrandExecutionConfig,brandId:string,actor:RequestAuthContext,publishing=false) {
    const choices=await this.options(brandId,actor),provider=choices.platforms.find(p=>p.id===config.providerId);
    if (config.providerId && !provider) throw new BadRequestException("模型服务不存在或未启用");
    if (config.model && (!provider || !provider.modelIds.includes(config.model))) throw new BadRequestException("模型不属于所选服务的可用目录");
    if (publishing && (!provider||!config.model)) throw new BadRequestException("发布前请选择模型服务和模型");
    if(config.skillIds.some(id=>!choices.skills.some(s=>s.id===id)))throw new BadRequestException("所选技能不存在或不可访问");
    if(config.knowledgeBaseIds.some(id=>!choices.knowledgeBases.some(k=>k.id===id)))throw new BadRequestException("知识库不属于当前品牌或已移除");
    return choices;
  }
  private expected(value:unknown) { if(!Number.isSafeInteger(value)||Number(value)<0)throw new BadRequestException("请先读取最新配置再保存");return Number(value); }
  private snapshotScope(snapshot:any,brandId:string) {
    if(snapshot?.brandId!==brandId||snapshot?.credentialPolicy!=="brand_owned_credentials"||snapshot?.credentialRef?.brandId!==brandId||snapshot?.credentialRef?.platformId!==snapshot?.config?.providerId
      ||!Array.isArray(snapshot?.knowledgeBaseRefs)||snapshot.knowledgeBaseRefs.some((r:any)=>r.brandId!==brandId)
      ||!Array.isArray(snapshot?.skills)||snapshot.skills.some((s:any)=>s.brandId!==brandId))throw new UnauthorizedException("配置快照归属不一致，不能执行或回退");
  }
  async workspace(brandId:string,actor:RequestAuthContext) {
    await this.access(brandId,actor);
    const [record,choices]=await Promise.all([this.prisma.brandExecutionProfile.findUnique({where:{brandId},include:{versions:{orderBy:{version:"desc"}}}}),this.options(brandId,actor)]);
    const active=record?.versions.find(v=>v.id===record.activeVersionId)||null;
    return {brandId,revision:record?.revision||0,draft:record?.draftJson||emptyExecutionConfig(),activeVersion:active,versions:record?.versions.map(v=>({id:v.id,version:v.version,contentHash:v.contentHash,createdAt:v.createdAt,restoredFromId:v.restoredFromId}))||[],choices:{platforms:choices.platforms,skills:choices.skills,knowledgeBases:choices.knowledgeBases},policy:"brand_owned_credentials",runtimeVerified:false};
  }
  async save(brandId:string,actor:RequestAuthContext,input:{expectedRevision?:number;config?:unknown}) {
    await this.access(brandId,actor);const expected=this.expected(input?.expectedRevision),config=normalizeExecutionConfig(input?.config);await this.checked(config,brandId,actor);
    await this.prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"brand-profile:"+brandId}))`;
      const current=await tx.brandExecutionProfile.findUnique({where:{brandId}});
      if ((current?.revision||0)!==expected) throw new ConflictException("配置已更新，请刷新后重试");
      if(current)await tx.brandExecutionProfile.update({where:{id:current.id},data:{draftJson:config,revision:{increment:1},updatedByUserId:actor.userId}});
      else await tx.brandExecutionProfile.create({data:{id:"bep_"+randomUUID(),brandId,draftJson:config,revision:1,updatedByUserId:actor.userId}});
    });return this.workspace(brandId,actor);
  }
  async publish(brandId:string,actor:RequestAuthContext,input:{expectedRevision?:number;restoreVersionId?:string}) {
    await this.access(brandId,actor);const expected=this.expected(input?.expectedRevision);
    // Holding this brand's lock serializes saves/publishes; public templates are never modified.
    await this.prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"brand-profile:"+brandId}))`;
      const current=await tx.brandExecutionProfile.findUnique({where:{brandId},include:{versions:{orderBy:{version:"desc"},take:1}}});
      if(!current)throw new BadRequestException("请先保存配置草稿");
      if(current.revision!==expected)throw new ConflictException("配置已更新，请刷新后重试");
      let snapshot:any,restoredFromId:string|undefined;
      if(input.restoreVersionId){
        const prior=await tx.brandExecutionProfileVersion.findFirst({where:{id:input.restoreVersionId,brandId,profileId:current.id}});
        if(!prior)throw new NotFoundException("配置版本不存在或不属于当前品牌");
        snapshot=prior.configJson;this.snapshotScope(snapshot,brandId);restoredFromId=prior.id;
        await this.checked(normalizeExecutionConfig(snapshot.config),brandId,actor,true);
      }else{
        const config=normalizeExecutionConfig(current.draftJson),choices=await this.checked(config,brandId,actor,true);
        snapshot={schemaVersion:"brand-execution-profile-1.0.0",brandId,credentialPolicy:"brand_owned_credentials",config,
          credentialRef:{brandId,platformId:config.providerId},
          skills:choices.fullSkills.filter(s=>config.skillIds.includes(s.id)).map(s=>({brandId,id:s.id,effectiveSkill:s.effectiveSkill,prompts:s.prompts.map(p=>({id:p.id,effectivePrompt:p.effectivePrompt}))})),
          knowledgeBaseRefs:config.knowledgeBaseIds.map(id=>({brandId,id})),
          boundary:{automaticExecutionEnabled:false,spendingAuthorized:false,publishingAuthorized:false}};
      }
      const serialized=stableProfileJson(snapshot);if(Buffer.byteLength(serialized)>1_000_000)throw new BadRequestException("所选能力配置过大，请减少技能数量");
      const version=await tx.brandExecutionProfileVersion.create({data:{id:"bepv_"+randomUUID(),profileId:current.id,brandId,version:(current.versions[0]?.version||0)+1,configJson:snapshot,contentHash:createHash("sha256").update(serialized).digest("hex"),restoredFromId,createdByUserId:actor.userId}});
      await tx.brandExecutionProfile.update({where:{id:current.id},data:{activeVersionId:version.id,draftJson:snapshot.config,revision:{increment:1},updatedByUserId:actor.userId}});
    },{timeout:20000});return this.workspace(brandId,actor);
  }
  async effective(actor:RequestAuthContext) {
    const brandId=actor.brandId;if(!brandId)throw new UnauthorizedException("请先选择品牌");await this.access(brandId,actor);
    const profile=await this.prisma.brandExecutionProfile.findUnique({where:{brandId}});
    if(!profile?.activeVersionId)return {brandId,state:"unpublished",activeVersion:null,runtimeVerified:false};
    const version=await this.prisma.brandExecutionProfileVersion.findFirst({where:{id:profile.activeVersionId,brandId,profileId:profile.id}});
    if(!version)throw new NotFoundException("生效配置版本不可用");
    const snapshot=version.configJson as any;this.snapshotScope(snapshot,brandId);const config=normalizeExecutionConfig(snapshot.config),choices=await this.checked(config,brandId,actor,true);
    const provider=choices.platforms.find(p=>p.id===config.providerId)!;
    return {brandId,state:provider.credentialError?"credential_error":provider.hasApiKey?"configured_unverified":"needs_credentials",activeVersion:version,credentialStatus:provider.credentialError?"unavailable":provider.hasApiKey?"configured":"missing",runtimeVerified:false,automaticExecutionEnabled:false};
  }
}
