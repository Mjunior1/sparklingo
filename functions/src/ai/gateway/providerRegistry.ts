import { MockAIProvider } from '../providers/mockAiProvider'
import type { AIGatewayProviderName } from './types'

const providers = {
  mock: new MockAIProvider(),
}

export const getAIProvider = (providerName: AIGatewayProviderName = 'mock') => providers[providerName]
