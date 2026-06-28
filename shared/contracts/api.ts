export type ApiVersion = 'v1'

export type HealthCheckResponse = {
  ok: true
  service: 'sparklingo-functions'
  version: ApiVersion
  region: string
  timestamp: string
}

export type ExternalProviderKind = 'ai' | 'speech'

export type ProviderResult<TPayload> = {
  ok: boolean
  provider: string
  payload?: TPayload
  error?: {
    code: string
    message: string
  }
}
