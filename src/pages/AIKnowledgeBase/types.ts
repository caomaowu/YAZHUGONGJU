
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface AIProviderConfig {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  isCustom?: boolean
  useProxy?: boolean
}

export interface AISettings {
  currentProviderId: string
  providers: Record<string, AIProviderConfig>
}

export const DEFAULT_PROVIDERS: Record<string, AIProviderConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    temperature: 0.7,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
  },
}

export const DEFAULT_SETTINGS: AISettings = {
  currentProviderId: 'deepseek',
  providers: DEFAULT_PROVIDERS,
}
