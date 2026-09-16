import { reactive } from 'vue'

export type Block =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'plan'; title: string; steps: { label: string; state: StepState }[] }
  | {
      id: string
      kind: 'tool'
      tool: string
      source: 'builtin' | 'plugin'
      plugin?: string
      reason: string
      input: string
      output?: string
      status: 'running' | 'succeeded' | 'failed' | 'needs-review'
      durationMs?: number
      progress?: number
    }
  | { id: string; kind: 'terminal'; title: string; lines: string[] }
  | {
      id: string
      kind: 'diff'
      path: string
      hunks: { type: 'add' | 'del' | 'ctx'; text: string }[]
    }
  | { id: string; kind: 'confirm'; reason: string; action: string; impact: string }
  | {
      id: string
      kind: 'notice'
      level: 'info' | 'ok' | 'warn' | 'error'
      title: string
      text: string
    }
  | { id: string; kind: 'code'; lang: string; code: string }
  | {
      id: string
      kind: 'summary'
      title: string
      stats: { label: string; value: string }[]
      next: string[]
    }

export type StepState = 'done' | 'active' | 'todo'

export type TaskStatus = 'Draft' | 'Running' | 'Succeeded' | 'Failed' | 'WaitingForConfirmation'

export type Task = {
  id: string
  title: string
  workspace: string
  status: TaskStatus
  startedAt: string
  duration: string
  model: string
  mode: string
  blocks: Block[]
}

export const workspaces = [
  { id: 'ws-001', name: '市档案馆 2024 接收批次', path: '~/Documents/archive-2024' },
  { id: 'ws-002', name: '企业档案整理项目', path: '~/Documents/enterprise-archive' },
  { id: 'ws-003', name: '照片档案数字化', path: '~/Documents/photo-digitize' }
]

export type DirectoryRow = {
  id: string
  name: string
  meta: string
  icon: 'folder' | 'users' | 'sparkle' | 'library'
}

export const directory: Record<'workspace' | 'talent' | 'library', DirectoryRow[]> = {
  workspace: workspaces.map((item) => ({
    id: item.id,
    name: item.name,
    meta: item.path,
    icon: 'folder' as const
  })),
  talent: [
    { id: 'ex-01', name: '档案著录专家', meta: '著录 · 分类 · 鉴定', icon: 'users' },
    { id: 'ex-02', name: '密级审核专家', meta: '涉密 · 开放审核', icon: 'users' },
    { id: 'ex-03', name: '档案编研专家', meta: '专题汇编 · 大事记', icon: 'users' },
    { id: 'sk-01', name: 'OCR 与版面还原', meta: '技能', icon: 'sparkle' },
    { id: 'sk-02', name: '元数据抽取与校验', meta: '技能', icon: 'sparkle' },
    { id: 'sk-03', name: '四性检测', meta: '技能', icon: 'sparkle' }
  ],
  library: [
    { id: 'lib-01', name: '档案著录规则', meta: 'DA/T 18', icon: 'library' },
    { id: 'lib-02', name: '机关档案管理规定', meta: '国家档案局令第 13 号', icon: 'library' },
    { id: 'lib-03', name: '本单位案卷目录', meta: '12 846 卷', icon: 'library' },
    { id: 'lib-04', name: '历年接收批次清册', meta: '96 册', icon: 'library' }
  ]
}

export const tasks = reactive<Task[]>([
  {
    id: 'task-2418',
    title: '对 incoming/ 目录 128 个扫描件执行 OCR 并抽取案卷元数据',
    workspace: workspaces[0].name,
    status: 'WaitingForConfirmation',
    startedAt: '14:02',
    duration: '12m 41s',
    model: 'claude-sonnet-4.5',
    mode: 'Agent 执行',
    blocks: [
      {
        id: 'b1',
        kind: 'user',
        text: '对 incoming/ 目录下的 128 个扫描件执行 OCR，输出到 output/ocr/，并从每份文件里抽取题名、日期、责任者和档号，最后给我一份校验报告。'
      },
      {
        id: 'b2',
        kind: 'text',
        text: '我先确认工作空间范围和文件清单，再按「识别 → 抽取 → 校验 → 报告」四步执行。原始文件不会被覆盖，OCR 结果写入 output/ocr/。'
      },
      {
        id: 'b3',
        kind: 'plan',
        title: '执行计划',
        steps: [
          { label: '扫描 incoming/ 目录并统计文件类型', state: 'done' },
          { label: '调用 archive.ocr 批量识别 128 个文件（当前 96/128）', state: 'active' },
          { label: '调用 archive.extractMetadata 抽取案卷元数据', state: 'todo' },
          { label: '调用 archive.validate 校验完整性与格式', state: 'todo' },
          { label: '调用 archive.generateReport 生成校验报告', state: 'todo' }
        ]
      },
      {
        id: 'b4',
        kind: 'tool',
        tool: 'archive.ocr',
        source: 'plugin',
        plugin: 'ocr@0.4.2',
        reason: '为扫描型 PDF 生成可检索文本层',
        input: 'glob=incoming/**/*.pdf, language=[chi_sim, eng], deskew=true, output=output/ocr/',
        output: '96 succeeded / 96 processed, 3 warnings',
        status: 'running',
        durationMs: 612430,
        progress: 0.75
      },
      {
        id: 'b5',
        kind: 'terminal',
        title: 'ocr-sidecar · pid 41207',
        lines: [
          '[14:03:11] sidecar ready (ocrmypdf 16.4.1, tesseract 5.3.4)',
          '[14:03:18] 0001_机关文书_2019.pdf → output/ocr/0001_机关文书_2019.pdf (2.4s)',
          '[14:03:21] 0002_机关文书_2019.pdf → output/ocr/0002_机关文书_2019.pdf (2.7s)',
          '[14:14:02] 0095_会议记录_2021.pdf → output/ocr/0095_会议记录_2021.pdf (3.1s)',
          '[14:14:05] warning: 0096_会议记录_2021.pdf 第 12 页未检出文字层，已保留原始页',
          '[14:14:05] progress 96/128 (75%)'
        ]
      },
      {
        id: 'b6',
        kind: 'notice',
        level: 'warn',
        title: '3 个文件存在低置信页面',
        text: '0096、0103、0117 存在未识别或低置信页面，将在校验阶段标记为待人工复核，不影响其余文件继续处理。'
      },
      {
        id: 'b7',
        kind: 'diff',
        path: 'output/metadata/0001_机关文书_2019.json',
        hunks: [
          { type: 'ctx', text: '  {' },
          { type: 'del', text: '-   "title": null,' },
          { type: 'add', text: '+   "title": "关于加强机关文书归档管理的通知",' },
          { type: 'del', text: '-   "date": null,' },
          { type: 'add', text: '+   "date": "2019-04-08",' },
          { type: 'add', text: '+   "creator": "市档案馆办公室",' },
          { type: 'ctx', text: '    "confidence": 0.94' },
          { type: 'ctx', text: '  }' }
        ]
      },
      {
        id: 'b8',
        kind: 'confirm',
        reason: '批量写入检测到 5 个已存在的输出文件，需要确认覆盖策略',
        action: 'archive.ocr → 覆盖 output/ocr/ 下 5 个同名文件',
        impact:
          '覆盖 5 个文件（约 18.6 MB），原始文件不受影响；保留策略可改为写入 output/ocr/retry/'
      },
      {
        id: 'b9',
        kind: 'code',
        lang: 'json',
        code: '{\n  "version": "1",\n  "requestId": "req_8831",\n  "taskId": "task-2418",\n  "inputPath": "incoming/0097_会议记录_2021.pdf",\n  "outputPath": "output/ocr/retry/0097_会议记录_2021.pdf",\n  "options": { "language": ["chi_sim", "eng"], "deskew": true }\n}'
      },
      {
        id: 'b10',
        kind: 'summary',
        title: '当前阶段小结',
        stats: [
          { label: '已处理', value: '96 / 128' },
          { label: '成功', value: '93' },
          { label: '待复核', value: '3' },
          { label: '失败', value: '0' }
        ],
        next: ['确认覆盖策略后继续剩余 32 个文件', '进入元数据抽取阶段（archive.extractMetadata）']
      }
    ]
  },
  {
    id: 'task-2417',
    title: '抽取 0001–0040 案卷的档号与责任者并校验格式',
    workspace: workspaces[0].name,
    status: 'Succeeded',
    startedAt: '11:36',
    duration: '6m 08s',
    model: 'claude-sonnet-4.5',
    mode: 'Agent 执行',
    blocks: [
      {
        id: 'c1',
        kind: 'user',
        text: '抽取 0001–0040 的档号和责任者，按《档号编制规则》校验格式，输出 CSV。'
      },
      {
        id: 'c2',
        kind: 'tool',
        tool: 'archive.extractMetadata',
        source: 'plugin',
        plugin: 'archive-governance@0.9.1',
        reason: '按 {题名, 日期, 责任者, 档号} 字段抽取',
        input: 'range=0001-0040, fields=[title, date, creator, docNumber]',
        output: '40 records, 2 fields missing, 0 parse errors',
        status: 'succeeded',
        durationMs: 184320
      },
      {
        id: 'c3',
        kind: 'summary',
        title: '任务完成',
        stats: [
          { label: '处理文件', value: '40' },
          { label: '字段完整', value: '38' },
          { label: '待补全', value: '2' },
          { label: '产物', value: 'metadata_0001-0040.csv' }
        ],
        next: ['补全 0007、0022 的责任者字段', '将结果同步到业务系统（需授权 external-write）']
      }
    ]
  },
  {
    id: 'task-2415',
    title: '检查 output/report/ 下质检报告模板渲染异常',
    workspace: workspaces[1].name,
    status: 'Failed',
    startedAt: '09:12',
    duration: '1m 44s',
    model: 'claude-haiku-4',
    mode: 'Agent 执行',
    blocks: [
      { id: 'd1', kind: 'user', text: '质检报告模板渲染出来的表格缺列，看看是什么问题。' },
      {
        id: 'd2',
        kind: 'notice',
        level: 'error',
        title: 'archive.generateReport 执行失败',
        text: '模板 report/quality.html.j2 引用了字段 `checker`，但校验结果中不存在该字段；已跳过写入，未产生残留文件。'
      },
      {
        id: 'd3',
        kind: 'tool',
        tool: 'archive.validate',
        source: 'plugin',
        plugin: 'archive-governance@0.9.1',
        reason: '定位字段缺失来源',
        input: 'ruleset=quality-v3, target=output/report/sample.json',
        output: 'error: unknown field "checker"',
        status: 'failed',
        durationMs: 2210
      }
    ]
  }
])

export const workspaceFiles = [
  { name: 'incoming', kind: 'folder', meta: '128 个文件' },
  { name: 'output/ocr', kind: 'folder', meta: '96 个文件' },
  { name: 'output/metadata', kind: 'folder', meta: '40 个文件' },
  { name: 'rules', kind: 'folder', meta: '档案著录规则' },
  { name: 'README-接收说明.md', kind: 'file', meta: '2.1 KB' }
]

export const historyTasks = [
  { id: 'task-2412', title: '照片档案批量重命名与去重', time: '昨天' },
  { id: 'task-2409', title: '导入 2023 年接收批次清单', time: '周一' },
  { id: 'task-2401', title: '生成季度治理质量报告', time: '上周' }
]

export type SettingItem =
  | { id: string; type: 'switch'; label: string; value: boolean }
  | { id: string; type: 'select'; label: string; value: string; options: string[] }
  | { id: string; type: 'text'; label: string; value: string }
  | { id: string; type: 'keybinding'; label: string; value: string }
  | { id: string; type: 'action'; label: string; button: string; danger?: boolean }

export type SettingsSection = {
  id: string
  label: string
  items: SettingItem[]
}

export const settingsSections: SettingsSection[] = [
  {
    id: 'general',
    label: '常规',
    items: [
      {
        id: 'general.language',
        type: 'select',
        label: '界面语言',
        value: '简体中文',
        options: ['简体中文', 'English']
      },
      {
        id: 'general.workspace',
        type: 'select',
        label: '默认工作空间',
        value: '市档案馆 2024 接收批次',
        options: ['市档案馆 2024 接收批次', '企业档案整理项目', '照片档案数字化']
      },
      {
        id: 'general.confirm',
        type: 'select',
        label: '高风险操作确认',
        value: '始终确认',
        options: ['始终确认', '仅覆盖与删除确认', '按插件默认']
      },
      {
        id: 'general.restore',
        type: 'switch',
        label: '启动时恢复未完成任务',
        value: true
      }
    ]
  },
  {
    id: 'appearance',
    label: '外观',
    items: [
      {
        id: 'appearance.theme',
        type: 'select',
        label: '主题',
        value: '跟随系统',
        options: ['跟随系统', '浅色', '深色']
      },
      {
        id: 'appearance.fontSize',
        type: 'select',
        label: '字号',
        value: '小 (13px)',
        options: ['小 (13px)', '中 (14px)', '大 (15px)']
      },
      {
        id: 'appearance.density',
        type: 'select',
        label: '信息密度',
        value: '紧凑',
        options: ['紧凑', '标准', '宽松']
      },
      { id: 'appearance.aside', type: 'switch', label: '显示右侧状态信息区', value: true },
      { id: 'appearance.markdown', type: 'switch', label: 'Markdown 表格按等宽渲染', value: true }
    ]
  },
  {
    id: 'models',
    label: '模型',
    items: [
      {
        id: 'models.provider',
        type: 'select',
        label: '模型提供方',
        value: 'Anthropic',
        options: ['Anthropic', 'OpenAI', 'DeepSeek']
      },
      {
        id: 'models.model',
        type: 'select',
        label: '默认模型',
        value: 'claude-sonnet-4.5',
        options: ['claude-sonnet-4.5', 'claude-haiku-4', 'gpt-5.1', 'deepseek-v3.2']
      },
      {
        id: 'models.temperature',
        type: 'text',
        label: '温度',
        value: '0.2'
      },
      {
        id: 'models.context',
        type: 'text',
        label: '上下文长度上限',
        value: '180000'
      },
      {
        id: 'models.credential',
        type: 'action',
        label: 'Anthropic API Key',
        button: '重新授权'
      }
    ]
  },
  {
    id: 'agent',
    label: 'Agent',
    items: [
      {
        id: 'agent.instructions',
        type: 'text',
        label: '基础指令引用',
        value: 'agents/default-archivist.md'
      },
      {
        id: 'agent.mode',
        type: 'select',
        label: '默认模式',
        value: 'Agent 执行',
        options: ['对话', 'Agent 执行']
      },
      { id: 'agent.maxSteps', type: 'text', label: '最大步骤数', value: '40' },
      {
        id: 'agent.autoApprove',
        type: 'select',
        label: '自动批准策略',
        value: '只读工具自动批准',
        options: ['不自动批准', '只读工具自动批准', '按上次选择记住 15 分钟']
      }
    ]
  },
  {
    id: 'terminal',
    label: '终端',
    items: [
      { id: 'terminal.shell', type: 'text', label: 'Shell', value: '/bin/zsh' },
      { id: 'terminal.cwd', type: 'text', label: '工作目录', value: '工作空间根目录' },
      { id: 'terminal.timeout', type: 'text', label: '命令超时（秒）', value: '120' },
      {
        id: 'terminal.confirm',
        type: 'switch',
        label: '执行前确认命令',
        value: true
      }
    ]
  },
  {
    id: 'git',
    label: 'Git',
    items: [
      { id: 'git.enabled', type: 'switch', label: '在工作空间中展示 Git 状态', value: true },
      {
        id: 'git.diff',
        type: 'select',
        label: 'Diff 展示方式',
        value: '行内 Diff',
        options: ['行内 Diff', '并排 Diff']
      },
      { id: 'git.commit', type: 'switch', label: '提交前需要确认', value: true }
    ]
  },
  {
    id: 'integrations',
    label: '集成',
    items: [
      { id: 'integrations.proxy', type: 'text', label: 'HTTP 代理', value: '' },
      {
        id: 'integrations.external',
        type: 'action',
        label: '档案业务系统连接器',
        button: '配置连接'
      },
      {
        id: 'integrations.plugins',
        type: 'action',
        label: '插件市场与本地插件',
        button: '管理插件'
      }
    ]
  },
  {
    id: 'advanced',
    label: '高级',
    items: [
      {
        id: 'advanced.logDir',
        type: 'text',
        label: '日志目录',
        value: '~/Library/Application Support/KaifangWork/logs'
      },
      {
        id: 'advanced.debug',
        type: 'switch',
        label: '调试模式',
        value: false
      },
      {
        id: 'advanced.experimental',
        type: 'switch',
        label: '实验性功能',
        value: false
      },
      {
        id: 'advanced.clear',
        type: 'action',
        label: '清理缓存',
        button: '立即清理',
        danger: true
      }
    ]
  }
]
