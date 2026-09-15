# Repository Guidelines

## 项目结构与模块组织

这是一个基于 Vue 3、TypeScript、Vite 和 `electron-vite` 构建的单窗口 Electron 应用。

- `src/main/`：Electron 主进程、窗口生命周期和操作系统集成。
- `src/preload/`：向渲染进程暴露的隔离桥接层。IPC API 应保持精简且显式。
- `src/renderer/`：Vue 入口和当前单页面壳层（`src/renderer/src/App.vue`）。
- `resources/`：运行时应用资源；`build/`：安装包和平台打包资源。
- `electron.vite.config.ts`：主进程、preload 和渲染进程构建配置；`electron-builder.yml`：打包配置。
- 当前尚未配置测试套件，后续单元测试或集成测试放在 `tests/` 目录。

## 构建、测试与开发命令

所有依赖和脚本操作统一使用 pnpm：

```bash
pnpm install          # 安装依赖及原生应用依赖
pnpm dev              # 启动 Vite 和 Electron 开发环境
pnpm lint             # 执行 ESLint 检查
pnpm typecheck        # 检查主进程、preload 和渲染进程 TypeScript
pnpm build            # 类型检查并创建生产构建产物
pnpm build:unpack     # 构建并打包未压缩的桌面应用
```

平台安装包可使用 `pnpm build:mac`、`pnpm build:win` 和 `pnpm build:linux` 脚本生成。

## 编码风格与命名约定

遵循 Prettier 配置：使用 2 个空格缩进、LF 换行符，不使用分号。提交前执行 `pnpm exec prettier --write <files>` 和 `pnpm lint`。应用代码使用 TypeScript；Vue 单文件组件需要脚本时使用 `<script setup lang="ts">`；组件文件使用 PascalCase，变量和函数使用 camelCase。

## 测试规范

当前未配置测试框架或覆盖率门槛。在引入测试框架前，所有改动都应通过 `pnpm lint`、`pnpm typecheck` 和 `pnpm build`；涉及界面的改动还应使用 `pnpm dev` 做冒烟验证。后续测试应使用清晰的命名，例如 `workspace-ipc.test.ts`，并覆盖 IPC 校验和失败路径。

## Commit 与 Pull Request 规范

仓库目前还没有形成既有提交历史。请遵循 `README.md` 中的前缀约定，例如 `feat:`、`fix:`、`refactor:`、`docs:` 和 `chore:`。每次提交应保持单一目的。Pull Request 需要说明改动内容、列出验证命令、在适用时关联 Issue；涉及渲染界面时附上截图或录屏，并说明新增的权限、IPC、文件系统访问或打包配置变更。

## 安全与架构注意事项

渲染进程不得直接访问 Node.js、文件系统或敏感操作系统 API；只能通过 preload 和受控 IPC 暴露经过审查的能力。未来的档案治理领域逻辑应放在插件工具中，不要写入基础 Agent 或渲染层壳体。
