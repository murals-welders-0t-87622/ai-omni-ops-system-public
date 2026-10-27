export type TreeNodeKind = "dir" | "file";
export interface TreeNodeBase {
  path: string;
  name: string;
  kind: TreeNodeKind;
}
export interface TreeFileNode extends TreeNodeBase {
  kind: "file";
  meta?: Record<string, string>;
}
export interface TreeDirNode extends TreeNodeBase {
  kind: "dir";
  children: TreeNode[];
}
export type TreeNode = TreeFileNode | TreeDirNode;

export function dir(path: string, name: string, children: TreeNode[]): TreeDirNode {
  return { kind: "dir", path, name, children };
}

export function file(path: string, name: string, meta?: TreeFileNode["meta"]): TreeFileNode {
  return { kind: "file", path, name, meta: meta ?? {} };
}

export function treeStats(roots: TreeDirNode[]): { dirs: number; files: number; depth: number } {
  let dirs = 0, files = 0, depth = 0;
  const walk = (n: TreeNode, d: number) => {
    if (d > depth) depth = d;
    if (n.kind === "dir") { dirs++; for (const c of (n as TreeDirNode).children) walk(c, d + 1); }
    else files++;
  };
  roots.forEach((r) => walk(r, 1));
  return { dirs, files, depth };
}

/* 仅 9 宫格骨架 ① 专家 ② 技能 ④ Prompt 是 4 级树；其他是 2 级表单骨架
*  真实版本由 md-writer 读 expert-source/ 目录物理文件生成，这里是演示骨架。
*/
export function buildResourceTree(_scope?: "experts" | "skills" | "apis" | "prompt-library" | "task-governance" | "assets" | "brand" | "storage" | "advanced"): TreeDirNode[] {
  const scope = _scope ?? "experts";
  switch (scope) {
    case "experts":
      return [
        dir("团：内容创作团", "① 团 · 内容创作团", [
          dir("团：内容创作团/专家", "② 专家名册", [
            dir("团：内容创作团/专家/抖音组长", "③ 抖音板块组长 · douyin-team-lead", [
              file(
                "agents/douyin-fullflow-ops-team-lead.md",
                "④ agents/douyin-fullflow-ops-team-lead.md",
                { title: "抖音板块组长（团队管理）", role: "抖音端 5 阶段总协调 · 交付第一责任人", use: "①跨专家派单 ②里程碑验收 ③异常升级", constraint: "必须把 SLA 承诺写进 tasks 看板", owner: "douyin-fullflow-ops-team-lead", contract: "claim→派单→验收→close", exceptions: "SLA 违约 2h 内必须通知用户" }
              ),
            ]),
            dir("团：内容创作团/专家/文案", "③ 文案 · douyin-copy-expert", [
              file(
                "agents/douyin-copy-expert.md",
                "④ agents/douyin-copy-expert.md",
                { title: "抖音文案专家", role: "脚本 / 标题 / 口播 3 类产出", use: "选题→标题 3 条→口播 90 字", constraint: "每条标题禁用 4 类禁词库", owner: "douyin-copy-expert", contract: "输入选题卡 · 输出脚本 v1.0", exceptions: "3 次不过 → 启动 request_change" }
              ),
            ]),
          ]),
        ]),
        dir("团：增长运营团", "① 团 · 增长运营团", [
          dir("团：增长运营团/专家", "② 专家名册", [
            dir("团：增长运营团/专家/投流", "③ 投流 · paid-media-expert", [
              file("agents/paid-media-expert.md", "④ agents/paid-media-expert.md",
                { title: "投流专家", role: "千川/磁力 4 类出价 + ROI 监控", use: "复盘后第二日 10 点前给调价建议", constraint: "日预算 > 5k 必须先 approval", owner: "paid-media-expert" }),
            ]),
          ]),
        ]),
        dir("团：视频制作团", "① 团 · 视频制作团", [
          dir("团：视频制作团/专家", "② 专家名册", [
            dir("团：视频制作团/专家/视频专家", "③ 视频 · douyin-video-expert", [
              file("agents/douyin-video-expert.md", "④ agents/douyin-video-expert.md",
                { title: "抖音视频专家（兼容提醒保留）", role: "分镜 → 剪辑", use: "拿到脚本后 24h 出 v1", constraint: "唯一生图通道 gpt-image-2.0", owner: "douyin-video-expert" }),
            ]),
          ]),
        ]),
        dir("团：流程治理团", "① 团 · 流程治理团", [
          dir("团：流程治理团/专家", "② 专家名册", [
            dir("团：流程治理团/专家/治理", "③ 治理 · workflow-ops-governor", [
              file("agents/workflow-ops-governor.md", "④ agents/workflow-ops-governor.md",
                { title: "流程治理团长", role: "9 动作 claim→close 裁判", use: "所有 transition 必须经过 precondition checker", constraint: "OQ5：采集0阻塞/选题0弱提醒/复盘弱提醒", owner: "workflow-ops-governor" }),
            ]),
          ]),
        ]),
        dir("团：中台支撑团", "① 团 · 中台支撑团", [
          dir("团：中台支撑团/专家", "② 专家名册", [
            dir("团：中台支撑团/专家/架构", "③ 架构 · ai-ops-architect", [
              file("agents/ai-ops-architect.md", "④ agents/ai-ops-architect.md",
                { title: "AI 全域运营架构师", role: "Ontology 7×3 映射 + Outbox 8 P 管道", use: "阶段切换前走 POST on-state-changed", constraint: "Outbox 必须幂等（event_id UNIQUE）", owner: "ai-ops-architect" }),
            ]),
          ]),
        ]),
      ];

    case "skills":
      return [
        dir("Skill：生图通道", "① 类 · 生图通道", [
          dir("Skill：生图通道/唯一通道", "② 唯一通道（gpt-image-2.0）", [
            dir("Skill：生图通道/唯一通道/image-design-skill", "③ image-design-skill（唯一启用）", [
              file("skills/image-design-skill/SKILL.md", "④ skills/image-design-skill/SKILL.md",
                { title: "唯一图像生成 Skill · gpt-image-2.0", role: "MCP 多元平台调用 create_design_work", use: "注入品牌档案 injectBrandProfile=false 仅走通道参数", constraint: "严禁启用 ImageGen/PIL/seedream/即梦/dall-e/... 共 8 类", owner: "video-production-playbook 7.0" }),
            ]),
          ]),
        ]),
        dir("Skill：内容生产", "① 类 · 内容生产", [
          dir("Skill：内容生产/视频Skill", "② 视频 Skill 组", [
            dir("Skill：内容生产/视频Skill/video-production", "③ video-production-skill", [
              file("skills/video-production-skill/SKILL.md", "④ skills/video-production-skill/SKILL.md",
                { title: "视频生产 Skill", role: "脚本 → 抽帧 → 分镜 → 剪辑", use: "24h v1 / 48h v2", constraint: "禁词库 4 类必须全扫", owner: "douyin-video-expert" }),
            ]),
          ]),
        ]),
        dir("Skill：增长", "① 类 · 增长", [
          dir("Skill：增长/投流", "② 投流 Skill 组", [
            dir("Skill：增长/投流/paid-media", "③ paid-media-strategy-skill", [
              file("skills/paid-media-strategy-skill/SKILL.md", "④ skills/paid-media-strategy-skill/SKILL.md",
                { title: "投流策略 Skill", role: "出价 4 模型 + 创意 6 版", use: "复盘日 10:00 前调参建议", constraint: "日预算>5k 先批准", owner: "paid-media-expert" }),
            ]),
          ]),
        ]),
      ];

    case "prompt-library":
      return [
        dir("库：选题/拆解", "① 库 · 选题与爆款拆解", [
          dir("库：选题/拆解/抖音", "② 抖音", [
            dir("库：选题/拆解/抖音/爆款拆解", "③ 爆款拆解 Prompt 集", [
              file("references/prompts/douyin-hotspot-breakdown.md", "④ references/prompts/douyin-hotspot-breakdown.md",
                { title: "抖音爆款拆解 Prompt（8 维度）", role: "给定作品 URL → 8 维度结构化", use: "选题阶段每日自动跑 Top20", constraint: "必须保留原作者信息", owner: "content-huoke-team-lead" }),
            ]),
          ]),
        ]),
        dir("库：脚本/口播", "① 库 · 脚本与口播", [
          dir("库：脚本/口播/横版", "② 横版 90s 口播", [
            dir("库：脚本/口播/横版/汽车", "③ 汽车行业", [
              file("references/prompts/script-auto-90s.md", "④ references/prompts/script-auto-90s.md",
                { title: "汽车横版 90s 口播脚本模板", role: "起承转合 4 段式", use: "给定产品卡 → 3 条脚本", constraint: "敏感词：价格/优惠 必须二审核", owner: "douyin-copy-expert" }),
            ]),
          ]),
        ]),
      ];

    default:
      // 其他板块：2 级列表（非 4 级树）
      const items: Record<string, [string, string][]> = {
        apis: [
          ["MCP 连接器：211 签名", "211 条签名只读；可选字段区可加 nullable"],
          ["Provider 治理：API key/权限", "Key 只读；旋转走齿轮 Tab"],
          ["速率限制 / 降级", "QPS / fallback 顺序配置"],
        ],
        "task-governance": [
          ["里程碑：17 AC", "Phase 0~9 全部里程碑（只读）"],
          ["版本 Tags：workflow-core", "v3.4.x 发布 + 回滚锚点"],
          ["对账：双写 14 天", "6 字段对账每小时 1 次"],
        ],
        assets: [
          ["公用中心 · 统一素材库（只读）", "写入走作品归档流程"],
          ["品牌素材标签 · 7 BusinessAsset", "7 类资产 × 标签/版本"],
        ],
        brand: [
          ["品牌基础信息", "名称/Logo/主色/Tone/Voice"],
          ["7 类资产映射（Brand Ontology）", "7 BusinessAsset → Fact7 子类"],
        ],
        storage: [
          ["存储配额 / 路由", "OSS / 本地 / DB 三类"],
          ["冷备周期 / 健康监测", "每周备份 + 月恢复演练"],
        ],
        advanced: [
          ["齿轮 Tab 1 · 模块注册中心", "14 技能/15 模块注册（保留 SAAS 壳）"],
          ["齿轮 Tab 2 · Provider 治理", "Key/路由/旋转策略"],
          ["齿轮 Tab 3 · SAAS 兼容", "team/invite/billing/security 4 入口不 404"],
        ],
      };
      const top: [string, string][] = items[scope] ?? [["① 本板块主项", "② 子项"], ["① 另一主项", "② 子项"]];
      return [
        dir(scope, `本板块菜单 (${scope})`, top.map(([lvl1, lvl2]) =>
          dir(`${scope}/${lvl1}`, `① ${lvl1}`, [
            file(`${scope}/${lvl1}/${lvl2}.md`, `② ${lvl2}.md`, { title: lvl2, role: lvl1 }),
          ])
        )),
      ];
  }
}
