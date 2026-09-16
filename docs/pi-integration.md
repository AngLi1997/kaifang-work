# Pi Agent 集成与持续更新

## 版本策略

Pi 以 git subtree 的形式放在 `vendor/pi`，当前版本和上游 commit 记录在 `pi-upstream.lock.json`。应用自身的适配层不直接修改 `vendor/pi`，这样上游更新时冲突范围主要集中在 subtree 边界，宿主代码仍保持独立。

当前固定版本：Pi `v0.85.1`。上游仓库：[earendil-works/pi](https://github.com/earendil-works/pi)。

## 构建链路

根项目继续使用 pnpm；Pi 上游是 npm workspace，因此 vendor 内部由 npm 安装和构建：

```bash
pnpm run pi:build
```

脚本会完成以下工作：

1. 首次使用时在 `vendor/pi` 执行 `npm ci --ignore-scripts`。
2. 构建 Pi 的 offline bundle。
3. 将 PiAgent SDK bundle、Chord 外部依赖以及 Pi 运行时主题、导出模板等资源整理到 `resources/pi`。
4. `resources/pi` 由 `.gitignore` 忽略，生产打包通过 `electron-builder.yml` 的 `extraResources` 复制到应用资源目录。

`pnpm dev` 和 `pnpm build` 都会自动触发 `pi:build`。因此新环境只需要先执行根项目的 `pnpm install`，不需要把 Pi 的 node_modules 纳入根项目依赖。

## 持续同步上游

首次设置上游 remote（已有时跳过），再拉取 tag，以 subtree 方式合并目标版本：

```bash
git remote add pi-upstream https://github.com/earendil-works/pi.git
git fetch pi-upstream --tags
git subtree pull --prefix=vendor/pi pi-upstream vX.Y.Z --squash
```

合并后将 `pi-upstream.lock.json` 的 `ref` 和 `commit` 更新为目标 release 的实际 commit，然后执行：

```bash
pnpm run pi:build
pnpm lint
pnpm typecheck
pnpm build
```

若上游调整了 SDK、模型字段或资源目录，只修改 `src/main/pi-sdk.ts`、`src/main/agent-service.ts` 和构建脚本等适配层；不要把宿主业务逻辑写入 `vendor/pi`。

## 当前运行架构

```text
Renderer
  → preload: 最小化 agent IPC
  → Main: AgentService / ModelConfigStore
  → PiAgent SDK: createAgentSession
  → Pi Agent Loop: Skill、AGENTS.md、文件检索、内置工具、扩展工具、上下文与会话持久化
```

当前主进程保留 Pi 默认 system prompt 和资源加载流程，自动按 Pi 的顺序加载 AGENTS.md、Skills 与扩展，并启用 Pi 提供的 read、bash、edit、write、grep、find、ls 内置工具。宿主只通过 append system prompt 增加工作台角色约束，不替换 Pi 的基础提示词。未来接入档案治理工具时，工具能力应由宿主进行权限、路径和副作用校验后再注册。

自定义模型若未声明支持工具，适配层会传入空工具 allowlist，避免向不支持 tool call 的协议发送工具定义。工作台的 `@` 文件引用只传递相对路径，实际内容由 Pi 的 `read` 工具按当前工作空间读取。

## 模型配置

设置页“模型”内置提供方仅有 Anthropic 和 OpenAI，不预置模型名称。模型清单来自 PiAgent SDK；也可以手动新增自定义供应商和模型，填写接口地址、API Key、上下文长度及 Completions 或 Responses 接口形式。

模型配置保存到 Electron `userData/config/model.json`。API Key 使用 Electron `safeStorage` 加密后保存，渲染层只能看到“已配置”状态，不能读取明文。当前支持的环境变量映射和模型请求均在主进程完成。

真正发起模型对话前，需要在设置页填写对应提供方的 API Key；未配置时会以任务事件显示可恢复的错误。

## 当前范围

- 已支持：模型提供方/模型选择、思考级别配置、API Key 保存、基础文本对话、可恢复的多轮对话、任务和工作空间状态持久化、增量文本展示、错误展示、取消请求。
- 暂未纳入：SQLite 会话持久化、插件工具运行时、档案治理规则、完整权限确认流和 OAuth 登录。
