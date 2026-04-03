/**
 * GLM Session Runner
 *
 * Runs Claude Code pointed at Zhipu AI's Anthropic-compatible API endpoint.
 * This gives full Claude Code capabilities (file editing, bash, MCP, etc.)
 * running on GLM models, with remote mode working automatically.
 *
 * Auth: API key from local storage (happy connect glm) or ZHIPU_API_KEY env var.
 * API: https://api.z.ai/api/anthropic (Anthropic-compatible)
 */

import { runClaude } from '@/claude/runClaude';
import { getLocalVendorToken } from '@/utils/localVendorTokens';
import type { Credentials } from '@/persistence';
import { GLM_DEFAULT_MODEL } from './glmTypes';

const GLM_ANTHROPIC_BASE_URL = 'https://api.z.ai/api/anthropic';

export interface RunGlmOptions {
  credentials: Credentials;
  startedBy?: 'daemon' | 'terminal';
  model?: string;
  verbose?: boolean;
}

export async function runGlm(opts: RunGlmOptions): Promise<void> {
  const apiKey = getLocalVendorToken('zhipu')?.apiKey
    ?? process.env.ZHIPU_API_KEY
    ?? process.env.GLM_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GLM API key not found. Either:\n'
      + '  - Run "happy connect glm" to store your Zhipu AI API key\n'
      + '  - Set the ZHIPU_API_KEY environment variable',
    );
  }

  const model = opts.model ?? GLM_DEFAULT_MODEL;

  await runClaude(opts.credentials, {
    startedBy: opts.startedBy,
    flavor: 'glm',
    claudeEnvVars: {
      ANTHROPIC_BASE_URL: GLM_ANTHROPIC_BASE_URL,
      ANTHROPIC_MODEL: model,
      ANTHROPIC_AUTH_TOKEN: apiKey,
    },
  });
}
