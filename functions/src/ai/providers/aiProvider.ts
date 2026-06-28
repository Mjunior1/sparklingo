import type { AIGatewayRequest, AIGatewayResponse } from '../gateway/types'

export interface MissionAIProvider {
  readonly name: AIGatewayResponse['provider']
  generate(request: AIGatewayRequest): Promise<Omit<AIGatewayResponse, 'latencyMs'>>
}
