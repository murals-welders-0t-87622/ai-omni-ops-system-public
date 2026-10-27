/* 已迁移到仓库根 scripts/smoke-step.ts；apps/server/__tests__/smoke-step.ts 仅占位（避免旧代码路径残留报错 tsconfig include 范围）。
   权威入口：scripts/smoke-step.ts（6 步 TR，tsx 直接执行，不进入 Nest 构建 include 范围）。
   永久生效决策（见会话 10 决策章节）：
   - D13：Git 封装脚本必须显式用 python/python3 解释器执行
   - D14：md-writer-core PROJECT_ROOT_DEFAULT 与 config-center-git.py 路径计算必须 100% 同构
   - 入口脚本：使用 CJS + 相对路径，不用路径别名
*/
export {};
