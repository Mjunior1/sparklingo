import { setGlobalOptions } from 'firebase-functions/v2'

export const functionRegion = process.env.FUNCTION_REGION?.trim() || 'us-central1'

setGlobalOptions({
  region: functionRegion,
  maxInstances: 10,
})
