import { AIGatewayError } from '../errors/aiErrors'
import type { AIGatewayRequest } from '../gateway/types'
import { openRouterApiKey } from '../../config/secrets'
import type { MissionAIProvider } from './aiProvider'

type OpenRouterChoice = {
  message?: {
    content?: string
  }
}

type OpenRouterResponse = {
  choices?: OpenRouterChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: {
    message?: string
  }
}

const modelAliases: Record<string, string> = {
  'deepseek-chat': 'deepseek/deepseek-chat',
  'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
  'claude-sonnet': 'anthropic/claude-3.5-sonnet',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'gemini-flash': 'google/gemini-flash-1.5',
}

const resolveModel = (model?: string) => {
  const selected = model?.trim() || process.env.OPENROUTER_MODEL || 'gpt-4.1-mini'
  return modelAliases[selected] || selected
}

export class OpenRouterAIProvider implements MissionAIProvider {
  readonly name = 'openrouter' as const

  async generate(request: AIGatewayRequest) {
    const apiKey = openRouterApiKey.value()
    if (!apiKey) {
      throw new AIGatewayError('OPENROUTER_API_KEY is not configured for Firebase Functions.', 'missing_openrouter_secret')
    }

    const model = resolveModel(request.model)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sparklingo.app',
        'X-Title': 'SparkLingo',
      },
      body: JSON.stringify({
        model,
        temperature: 0.55,
        response_format: request.input.jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: request.input.systemPrompt },
          { role: 'user', content: request.input.userPrompt },
        ],
      }),
    })

    const payload = await response.json().catch(() => null) as OpenRouterResponse | null
    if (!response.ok) {
      throw new AIGatewayError(
        payload?.error?.message || `OpenRouter request failed with ${response.status}.`,
        'openrouter_request_failed',
      )
    }

    const text = payload?.choices?.[0]?.message?.content?.trim()
    if (!text) {
      throw new AIGatewayError('OpenRouter returned an empty response.', 'empty_openrouter_response')
    }

    return {
      ok: true as const,
      provider: this.name,
      model,
      text,
      usage: {
        inputTokens: payload?.usage?.prompt_tokens || 0,
        outputTokens: payload?.usage?.completion_tokens || 0,
        totalTokens: payload?.usage?.total_tokens || 0,
      },
    }
  }
}
