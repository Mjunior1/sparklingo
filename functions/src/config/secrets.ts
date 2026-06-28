import { defineSecret } from 'firebase-functions/params'

export const openRouterApiKey = defineSecret('OPENROUTER_API_KEY')
export const azureSpeechKey = defineSecret('AZURE_SPEECH_KEY')
export const azureSpeechRegion = defineSecret('AZURE_SPEECH_REGION')

export const externalProviderSecrets = [
  openRouterApiKey,
  azureSpeechKey,
  azureSpeechRegion,
]
