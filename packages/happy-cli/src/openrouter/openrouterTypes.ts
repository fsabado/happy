/**
 * OpenRouter constants and types
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const OPENROUTER_DEFAULT_MODEL = 'stepfun/step-3.5-flash:free';

/**
 * Extra headers recommended by OpenRouter for app identification.
 * See: https://openrouter.ai/docs#requests
 */
export const OPENROUTER_EXTRA_HEADERS: Record<string, string> = {
  'HTTP-Referer': 'https://happy.engineering',
  'X-Title': 'Happy',
};
