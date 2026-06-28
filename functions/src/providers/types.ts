export type AITextGenerationRequest = {
  systemPrompt: string
  userPrompt: string
  model?: string
  temperature?: number
}

export type AITextGenerationResponse = {
  text: string
  model: string
  provider: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}

export type PronunciationAssessmentRequest = {
  audioBase64: string
  referenceText: string
  locale: string
}

export type PronunciationAssessmentResponse = {
  score: number
  accuracyScore?: number
  fluencyScore?: number
  completenessScore?: number
  prosodyScore?: number
  provider: string
  raw?: unknown
}

export interface AIProvider {
  readonly name: string
  generateText(request: AITextGenerationRequest): Promise<AITextGenerationResponse>
}

export interface SpeechAssessmentProvider {
  readonly name: string
  assessPronunciation(
    request: PronunciationAssessmentRequest,
  ): Promise<PronunciationAssessmentResponse>
}
