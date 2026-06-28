import { AIGatewayError } from '../errors/aiErrors'
import { logAIGatewayError, logAIGatewaySuccess } from '../telemetry/aiLogger'
import { getAIProvider } from './providerRegistry'
import type { AIGatewayRequest, AIGatewayResponse } from './types'

export const generateAIText = async (request: AIGatewayRequest): Promise<AIGatewayResponse> => {
  const startedAt = Date.now()

  try {
    if (!request.input.systemPrompt.trim() || !request.input.userPrompt.trim()) {
      throw new AIGatewayError('AI Gateway requires systemPrompt and userPrompt.', 'invalid_ai_request')
    }

    const provider = getAIProvider(request.provider || 'mock')
    const providerResponse = await provider.generate(request)
    const response = {
      ...providerResponse,
      latencyMs: Date.now() - startedAt,
    }

    logAIGatewaySuccess(request, response)
    return response
  } catch (error) {
    logAIGatewayError(request, error)
    throw error
  }
}
