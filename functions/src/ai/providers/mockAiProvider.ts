import type { AIGatewayRequest } from '../gateway/types'
import type { MissionAIProvider } from './aiProvider'

export class MockAIProvider implements MissionAIProvider {
  readonly name = 'mock' as const

  async generate(request: AIGatewayRequest) {
    const approximateInputTokens = Math.ceil(
      `${request.input.systemPrompt}\n${request.input.userPrompt}`.length / 4,
    )
    const mockPayload = buildMissionStudioMockPayload(request)
    const text = JSON.stringify(mockPayload)
    const outputTokens = Math.ceil(text.length / 4)

    return {
      ok: true as const,
      provider: this.name,
      model: request.model || 'mock-mission-studio-v1',
      text,
      usage: {
        inputTokens: approximateInputTokens,
        outputTokens,
        totalTokens: approximateInputTokens + outputTokens,
      },
    }
  }
}

const buildMissionStudioMockPayload = (request: AIGatewayRequest) => ({
  title: 'Mission Studio Mock Draft',
  source: 'ai',
  provider: request.provider || 'mock',
  model: request.model || 'mock-mission-studio-v1',
  notes:
    'MockAIProvider generated this draft through the same gateway contract that future real providers will use.',
})
