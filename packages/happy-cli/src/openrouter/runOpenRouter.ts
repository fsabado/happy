/**
 * OpenRouter Session Runner
 *
 * Runs Claude Code pointed at OpenRouter's Anthropic-compatible API endpoint.
 * OpenRouter routes to many models (Claude, GPT-4o, Gemini, GLM, etc.) via a
 * single endpoint, giving full Claude Code capabilities with any supported model.
 *
 * Auth: API key from local storage (happy connect openrouter) or OPENROUTER_API_KEY env var.
 * API: https://openrouter.ai/api (Anthropic-compatible)
 * Docs: https://openrouter.ai/docs/guides/coding-agents/claude-code-integration
 */

import { runClaude } from '@/claude/runClaude';
import { getLocalVendorToken } from '@/utils/localVendorTokens';
import type { Credentials } from '@/persistence';
import { OPENROUTER_DEFAULT_MODEL } from './openrouterTypes';

const OPENROUTER_ANTHROPIC_BASE_URL = 'https://openrouter.ai/api';

export interface RunOpenRouterOptions {
  credentials: Credentials;
  startedBy?: 'daemon' | 'terminal';
  model?: string;
  verbose?: boolean;
}

export async function runOpenRouter(opts: RunOpenRouterOptions): Promise<void> {
  const apiKey = getLocalVendorToken('openrouter')?.apiKey
    ?? process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OpenRouter API key not found. Either:\n'
      + '  - Run "happy connect openrouter" to store your OpenRouter API key\n'
      + '  - Set the OPENROUTER_API_KEY environment variable',
    );
  }

  const model = opts.model ?? OPENROUTER_DEFAULT_MODEL;

  await runClaude(opts.credentials, {
    startedBy: opts.startedBy,
    flavor: 'openrouter',
    claudeEnvVars: {
      ANTHROPIC_BASE_URL: OPENROUTER_ANTHROPIC_BASE_URL,
      ANTHROPIC_MODEL: model,
      ANTHROPIC_AUTH_TOKEN: apiKey,
      // Explicitly empty to prevent Claude Code falling back to Anthropic
      ANTHROPIC_API_KEY: '',
    },
  });
}
