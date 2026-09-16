import type { SettingItem, SettingsSection } from './types'

export type { SettingItem, SettingsSection }

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
