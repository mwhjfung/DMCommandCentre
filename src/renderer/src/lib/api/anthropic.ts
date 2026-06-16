import { getSetting } from '@/lib/db/content'

/**
 * The only place that calls the Anthropic API. Runs from the renderer with the
 * key fetched from the main-process secret store at call time, and the
 * browser-access header so the request is allowed cross-origin.
 */

interface CallOptions {
  system?: string
  prompt: string
  maxTokens?: number
  /** Overrides the model from settings. */
  model?: string
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  error?: { message?: string }
}

export async function hasAnthropicKey(): Promise<boolean> {
  return Boolean(await window.dmc.secrets.get('anthropicApiKey'))
}

export async function callClaude({ system, prompt, maxTokens, model }: CallOptions): Promise<string> {
  const key = await window.dmc.secrets.get('anthropicApiKey')
  if (!key) throw new Error('No Anthropic API key set — add one in Settings → AI.')

  const resolvedModel = model ?? (await getSetting<string>('llmModel')) ?? 'claude-sonnet-4-6'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: resolvedModel,
      max_tokens: maxTokens ?? 8000,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const json = (await res.json().catch(() => ({}))) as AnthropicResponse
  if (!res.ok) {
    throw new Error(json.error?.message || `Claude API error (${res.status})`)
  }
  return (json.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('')
}
