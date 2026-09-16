# Repository Guidelines

产品背景、界面规范与路线图见 `README.md`；本文件只写工程约定。

## 项目结构与模块组织

基于 Vue 3、TypeScript、Vite 和 `electron-vite` 构建的单窗口 Electron 应用。

- `src/main/index.ts`：Electron 主进程、窗口生命周期、窗口控制 IPC。
- `src/preload/`：隔离桥接层，`index.ts` 暴露 API，`index.d.ts` 声明类型（新增 IPC 必须同步）。
- `src/renderer/src/App.vue`：壳层，持有视图切换与跨区域状态。
- `src/renderer/src/components/`：全部界面组件，文件名 PascalCase，一件一文件。
- `src/renderer/src/data/mock.ts`：当前唯一数据源与领域类型（Task、Block、TaskStatus、目录与设置定义）。
- `src/renderer/src/assets/`：`main.css` 放设计令牌、布局与全局原子类，`base.css` 放重置与字体。
- `src/renderer/src/theme.ts`：主题状态与 `data-theme` 写入。
- `resources/` 运行时资源；`build/` 打包资源；`electron.vite.config.ts` 构建配置；`electron-builder.yml` 打包配置。
- 尚未配置测试套件，后续测试放在 `tests/` 目录。

无 Router、无状态管理库，也不要为了小需求引入。视图切换由 `App.vue` 的 `view` 枚举承担，数据经 props 下发、emit 回传。

## 构建、测试与开发命令

依赖与脚本统一使用 pnpm：

```bash
pnpm install          # 安装依赖及原生应用依赖
pnpm dev              # 启动 Vite 和 Electron 开发环境
pnpm lint             # 执行 ESLint 检查
pnpm typecheck        # 检查主进程、preload 和渲染进程 TypeScript
pnpm build            # 类型检查并创建生产构建产物
pnpm build:unpack     # 构建并打包未压缩的桌面应用
pnpm format           # Prettier 全量格式化
```

平台安装包使用 `pnpm build:mac`、`pnpm build:win`、`pnpm build:linux`。

## 编码风格与命名约定

Prettier 配置（`.prettierrc.yaml`）：单引号、不加分号、`printWidth: 100`、不保留尾逗号；`.editorconfig` 要求 2 空格缩进与 LF。提交前执行 `pnpm exec prettier --write <files>` 和 `pnpm lint`。

- 应用代码使用 TypeScript；Vue 单文件组件脚本一律 `<script setup lang="ts">`。
- 组件文件 PascalCase，变量与函数 camelCase，CSS 类名用块 + 修饰/元素（`.block__head`、`.menu-item.is-active`）。
- 类型优先从 `data/mock.ts` 或就近文件导出并复用，不重复定义联合类型。

## 渲染层约定

- 状态集中在 `App.vue`，通过 props/emit 单向流动；组件内部只保留局部 UI 状态（展开、输入、临时决策）。
- 优先复用已有组件：列表页用 `DirectoryView`，事件块用 `TaskEventBlock` 新增 `kind` 分支，下拉用 `AppSelect`，不要另写一套。
- 图标唯一入口是 `src/renderer/src/components/AppIcon.vue`：先到 lucide.dev 检索，再在 `icons` 映射表按语义名登记，组件不直接 import `lucide-vue-next`。
- 颜色、间距、圆角、布局尺寸必须来自 `main.css` 的 CSS 令牌（`--bg*`、`--line*`、`--text*`、`--accent*`、`--ok/--warn/--err/--info`、`--radius`、`--sidebar-w`、`--panel-w`），组件里不写裸色值。
- 主题只通过 `theme.ts` 的 `theme` / `setThemeByLabel` / `themeLabel` / `themeOptions` 读写；深浅色用 `light-dark()` 就近声明，不新增 `data-theme` 选择器分支。
- 交互控件默认无边框，hover 用 `--bg-hover`；弹层需支持 `Esc` 关闭与点击外部关闭（参考 `AppSelect`、`UserMenu` 的 pointerdown/keydown 监听）。
- 位于标题栏或任务头部（`-webkit-app-region: drag` 区域）的可点击元素需要 `no-drag`。

## 界面规范

- 界面不写解释性文案：不添加副标题、说明段落、字段提示和快捷键提示；文字只承载用户必须知道的信息，说明性内容放到文档里。
- 状态优先用状态图标表达（`.status` / `.status-dot` 与 `is-run`、`is-ok`、`is-warn`、`is-err`、`is-draft`），不要用带底色的文字标签或徽标。
- 克制使用灰色文字：主文案使用 `--text`；`--text-2`、`--text-3` 当前等同正文色，不要靠调浅灰色层级表达次要信息。
- 层级由间距、字号、低对比背景和少量分隔线建立；只在分组、警示或隔离高风险操作时使用容器。
- 不使用大量并列卡片、过度圆角与阴影、渐变霓虹、巨大标题、底部 Tab 导航、营销式首屏。
- 图标默认 `size` 16、`stroke-width` 1.75，密集区域 12–14，颜色继承 `currentColor`；不引入第二套图标库，不用 emoji 或位图替代。
- 窗口控制按钮（最小化/最大化/关闭）属于平台窗口 chrome，保持自绘细线 SVG，不受图标库约束。
- 状态中文文案集中在组件内的状态映射表，不在模板里散落字符串。

## 数据、IPC 与安全

- 渲染进程不得直接访问 Node.js、文件系统或敏感操作系统 API；只能通过 preload 和受控 IPC 暴露经过审查的能力。
- 新增 IPC 时：主进程做参数与窗口归属校验，preload 暴露最小接口，`src/preload/index.d.ts` 同步类型。
- 当前 IPC 仅窗口控制三项（`window:minimize`、`window:toggle-maximize`、`window:close`）。
- 领域数据现在全部来自 `data/mock.ts`；接入持久化时替换该模块的数据来源，不要把 SQLite、Keychain 或文件访问逻辑写进组件。
- 未来的档案治理领域逻辑放在插件工具中，不要写入基础 Agent 或渲染层壳体。

## 测试规范

当前未配置测试框架或覆盖率门槛。所有改动都应通过 `pnpm lint`、`pnpm typecheck` 和 `pnpm build`；涉及界面的改动还需用 `pnpm dev` 做冒烟验证。引入测试框架后，用例使用清晰的命名（例如 `workspace-ipc.test.ts`），并覆盖 IPC 校验与失败路径。

## Commit 与 Pull Request 规范

提交信息遵循 `feat:`、`fix:`、`refactor:`、`docs:`、`chore:` 前缀，每次提交保持单一目的。Pull Request 需说明改动内容、列出验证命令、在适用时关联 Issue；涉及渲染界面时附截图或录屏，并说明新增的权限、IPC、文件系统访问或打包配置变更。
