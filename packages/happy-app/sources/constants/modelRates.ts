// packages/happy-app/sources/constants/modelRates.ts
// Token cost rate table — update here when model pricing changes (no app release needed).

export interface ModelRate {
  inputPer1k: number   // USD per 1k input tokens
  outputPer1k: number  // USD per 1k output tokens
}

export const MODEL_RATES: Record<string, ModelRate> = {
  // Anthropic
  'claude-opus-4-6':          { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'claude-sonnet-4-6':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-haiku-4-5':         { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'claude-sonnet-4-5':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-3-7-sonnet':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-3-5-sonnet':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-3-5-haiku':         { inputPer1k: 0.0008,  outputPer1k: 0.004 },
  'claude-3-opus':            { inputPer1k: 0.015,   outputPer1k: 0.075 },
  // OpenAI
  'gpt-4o':                   { inputPer1k: 0.0025,  outputPer1k: 0.01 },
  'gpt-4o-mini':              { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'o1':                       { inputPer1k: 0.015,   outputPer1k: 0.06 },
  'o1-mini':                  { inputPer1k: 0.003,   outputPer1k: 0.012 },
  'o3-mini':                  { inputPer1k: 0.0011,  outputPer1k: 0.0044 },
  'gpt-4-turbo':              { inputPer1k: 0.01,    outputPer1k: 0.03 },
  // Google Gemini
  'gemini-2.5-pro':           { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-2.0-flash':         { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  'gemini-1.5-pro':           { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-1.5-flash':         { inputPer1k: 0.000075,outputPer1k: 0.0003 },
  // Zhipu GLM
  'glm-4':                    { inputPer1k: 0.0014,  outputPer1k: 0.0014 },
  'glm-4-flash':              { inputPer1k: 0.00007, outputPer1k: 0.00007 },
  'glm-4-air':                { inputPer1k: 0.00014, outputPer1k: 0.00014 },
  'glm-4v':                   { inputPer1k: 0.0014,  outputPer1k: 0.0014 },
}

/**
 * Estimate cost for a model run.
 * Returns null if the model is unknown (no rate available).
 * Normalizes model codes by stripping date suffixes like -20241022.
 */
export function estimateCost(
  modelCode: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const normalized = modelCode.replace(/-\d{8}$/, '')
  const rate = MODEL_RATES[modelCode] ?? MODEL_RATES[normalized]
  if (!rate) return null
  return (inputTokens / 1000) * rate.inputPer1k
       + (outputTokens / 1000) * rate.outputPer1k
}

/**
 * Format a USD cost value for compact display.
 * Examples: $0.00001 → "$0.010m", $0.005 → "$0.0050", $0.15 → "$0.150"
 */
export function formatCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  if (usd < 0.01)  return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}
