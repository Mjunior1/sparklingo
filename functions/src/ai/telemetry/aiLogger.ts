import * as logger from 'firebase-functions/logger'

import type { AIGatewayRequest, AIGatewayResponse } from '../gateway/types'

export const logAIGatewaySuccess = (request: AIGatewayRequest, response: AIGatewayResponse) => {
  logger.info('ai_gateway_success', {
    feature: request.feature,
    provider: response.provider,
    model: response.model,
    latencyMs: response.latencyMs,
    usage: response.usage,
    userId: request.userId || null,
    missionId: request.missionId || null,
    metadata: request.metadata || {},
  })
}

export const logAIGatewayError = (request: AIGatewayRequest, error: unknown) => {
  logger.error('ai_gateway_error', {
    feature: request.feature,
    provider: request.provider || 'mock',
    userId: request.userId || null,
    missionId: request.missionId || null,
    message: error instanceof Error ? error.message : 'Unknown AI gateway error',
  })
}
