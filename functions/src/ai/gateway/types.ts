export type AIGatewayFeature = 'mission-studio'
export type AIGatewayProviderName = 'mock' | 'openrouter'

export type AIGatewayRequest = {
  feature: AIGatewayFeature
  userId?: string
  missionId?: string
  provider?: AIGatewayProviderName
  model?: string
  input: {
    systemPrompt: string
    userPrompt: string
    jsonMode?: boolean
  }
  metadata?: Record<string, string | number | boolean | null>
}

export type AIGatewayResponse = {
  ok: true
  provider: AIGatewayProviderName
  model: string
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  latencyMs: number
}
