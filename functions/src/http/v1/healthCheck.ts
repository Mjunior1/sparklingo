import { onRequest } from 'firebase-functions/v2/https'

import { functionRegion } from '../../config/runtime'

type HealthCheckResponse = {
  ok: true
  service: 'sparklingo-functions'
  version: 'v1'
  region: string
  timestamp: string
}

export const healthCheck = onRequest((request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({
      ok: false,
      error: 'method_not_allowed',
    })
    return
  }

  const payload: HealthCheckResponse = {
    ok: true,
    service: 'sparklingo-functions',
    version: 'v1',
    region: functionRegion,
    timestamp: new Date().toISOString(),
  }

  response.status(200).json(payload)
})
