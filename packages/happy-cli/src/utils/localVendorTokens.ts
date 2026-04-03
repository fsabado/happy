/**
 * Local vendor token storage for providers not supported by the Happy cloud
 * (e.g. GLM / Zhipu AI, OpenRouter).
 *
 * Stores API keys as JSON in ${happyHomeDir}/vendor-tokens.json.
 * This file is per-variant (stable vs dev) via the HAPPY_HOME_DIR env var.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { configuration } from '@/configuration';

type LocalVendorTokens = Record<string, { apiKey: string }>;

function tokensFilePath(): string {
  return join(configuration.happyHomeDir, 'vendor-tokens.json');
}

function readAll(): LocalVendorTokens {
  const path = tokensFilePath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as LocalVendorTokens;
  } catch {
    return {};
  }
}

/** Save an API key for a vendor to local storage. */
export function saveLocalVendorToken(vendor: string, apiKey: string): void {
  if (!existsSync(configuration.happyHomeDir)) {
    mkdirSync(configuration.happyHomeDir, { recursive: true });
  }
  const tokens = readAll();
  tokens[vendor] = { apiKey };
  writeFileSync(tokensFilePath(), JSON.stringify(tokens, null, 2), 'utf-8');
}

/** Retrieve an API key for a vendor from local storage. Returns null if not found. */
export function getLocalVendorToken(vendor: string): { apiKey: string } | null {
  return readAll()[vendor] ?? null;
}
