import { MockAIProvider } from '../providers/mockAiProvider'
import { OpenRouterAIProvider } from '../providers/openRouterAiProvider'
import type { AIGatewayProviderName } from './types'

const providers = {
  mock: new MockAIProvider(),
  openrouter: new OpenRouterAIProvider(),
}

export const getAIProvider = (providerName: AIGatewayProviderName = 'mock') => providers[providerName]
