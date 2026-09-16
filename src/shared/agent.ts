export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type AgentProvider = 'anthropic' | 'openai'

export type ModelProtocol = 'openai-completions' | 'openai-responses'

export type AgentModelInfo = {
  provider: string
  id: string
  name: string
  reasoning: boolean
  contextWindow?: number
}

export type AgentPromptInfo = {
  name: string
  description: string
  path: string
}

export type AgentSkillInfo = {
  name: string
  description: string
  path: string
}

export type AgentToolInfo = {
  name: string
  description: string
  source: string
  path: string
}

export type AgentResources = {
  prompts: AgentPromptInfo[]
  skills: AgentSkillInfo[]
  contextFiles: string[]
  builtinTools: AgentToolInfo[]
  tools: AgentToolInfo[]
}

export type ModelConfig = {
  provider: string
  modelId: string
  thinkingLevel: ThinkingLevel
  apiKeyConfigured: boolean
}

export type SaveModelConfigInput = {
  provider: string
  modelId: string
  thinkingLevel?: ThinkingLevel
  apiKey?: string
}

export type CustomModelConfig = {
  id: string
  providerId: string
  providerName: string
  endpoint: string
  modelId: string
  protocol: ModelProtocol
  supportsTools: boolean
  supportsImages: boolean
  inputContextLength: number
  outputContextLength: number
  apiKeyConfigured: boolean
}

export type SaveCustomModelInput = Omit<
  CustomModelConfig,
  'id' | 'providerId' | 'apiKeyConfigured' | 'inputContextLength' | 'outputContextLength'
> & {
  id?: string
  apiKey?: string
  inputContextLength?: number
  outputContextLength?: number
}

export type AgentStartInput = {
  taskId: string
  workspacePath?: string
  provider: string
  modelId: string
  thinkingLevel?: ThinkingLevel
}

export type AgentEvent =
  | { kind: 'run-start'; taskId: string }
  | { kind: 'text'; taskId: string; delta: string }
  | { kind: 'thinking'; taskId: string; delta: string }
  | {
      kind: 'tool-start'
      taskId: string
      toolCallId: string
      toolName: string
      input: string
      source?: string
    }
  | {
      kind: 'tool-end'
      taskId: string
      toolCallId: string
      toolName: string
      output: string
      isError: boolean
    }
  | { kind: 'run-end'; taskId: string }
  | { kind: 'error'; taskId: string; message: string }

export const defaultModelConfig: ModelConfig = {
  provider: 'anthropic',
  modelId: '',
  thinkingLevel: 'medium',
  apiKeyConfigured: false
}
