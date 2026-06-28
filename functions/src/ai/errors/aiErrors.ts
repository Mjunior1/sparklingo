export class AIGatewayError extends Error {
  constructor(
    message: string,
    readonly code = 'ai_gateway_error',
  ) {
    super(message)
    this.name = 'AIGatewayError'
  }
}
