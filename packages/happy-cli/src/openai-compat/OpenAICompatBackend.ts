/**
 * OpenAI-Compatible Backend
 *
 * A reusable AgentBackend implementation for any provider exposing
 * an OpenAI-compatible /chat/completions streaming endpoint.
 * Used by GLM (Zhipu AI) and OpenRouter integrations.
 *
 * Uses native fetch (Node 18+) with SSE parsing — zero additional dependencies.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { AgentBackend, AgentMessage, AgentMessageHandler, SessionId, StartSessionResult } from '@/agent/core/AgentBackend';
import { logger } from '@/ui/logger';

/** Configuration for an OpenAI-compatible provider */
export interface OpenAICompatConfig {
  /** Base URL for the API, e.g. 'https://open.bigmodel.cn/api/paas/v4' */
  baseURL: string;
  /** API key for Bearer authentication */
  apiKey: string;
  /** Model identifier to use for completions */
  model: string;
  /** Additional HTTP headers to include in every request */
  extraHeaders?: Record<string, string>;
  /** Optional system prompt prepended to every conversation */
  systemPrompt?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * AgentBackend implementation for OpenAI-compatible APIs.
 *
 * Supports streaming chat completions and converts SSE chunks to the
 * standard AgentMessage format consumed by the Happy session pipeline.
 *
 * Thread safety: sendPrompt is not re-entrant — callers should await each
 * call before sending the next prompt (the message loop guarantees this).
 */
export class OpenAICompatBackend implements AgentBackend {
  private readonly emitter = new EventEmitter();
  private readonly history: ChatMessage[] = [];
  private abortController: AbortController = new AbortController();
  private responseCompleteResolve: (() => void) | null = null;
  private responseCompleteReject: ((err: Error) => void) | null = null;

  constructor(private readonly config: OpenAICompatConfig) {
    if (config.systemPrompt) {
      this.history.push({ role: 'system', content: config.systemPrompt });
    }
  }

  async startSession(_initialPrompt?: string): Promise<StartSessionResult> {
    const sessionId = randomUUID();
    this.emit({ type: 'status', status: 'idle' });
    return { sessionId };
  }

  async sendPrompt(_sessionId: SessionId, prompt: string): Promise<void> {
    this.history.push({ role: 'user', content: prompt });
    this.abortController = new AbortController();

    // Set up response-complete promise before emitting running status
    const completionPromise = new Promise<void>((resolve, reject) => {
      this.responseCompleteResolve = resolve;
      this.responseCompleteReject = reject;
    });

    this.emit({ type: 'status', status: 'running' });

    const url = `${this.config.baseURL}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...this.config.extraHeaders,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.history,
          stream: true,
        }),
        signal: this.abortController.signal,
      });
    } catch (error) {
      const isAbort = (error as Error).name === 'AbortError';
      if (isAbort) {
        this.emit({ type: 'status', status: 'idle' });
        this.responseCompleteResolve?.();
        this.responseCompleteResolve = null;
        this.responseCompleteReject = null;
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'status', status: 'error', detail: `Request failed: ${msg}` });
      this.responseCompleteReject?.(new Error(msg));
      this.responseCompleteResolve = null;
      this.responseCompleteReject = null;
      throw error;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      const detail = `API error ${response.status}: ${text}`;
      this.emit({ type: 'status', status: 'error', detail });
      this.responseCompleteReject?.(new Error(detail));
      this.responseCompleteResolve = null;
      this.responseCompleteReject = null;
      throw new Error(detail);
    }

    const assistantContent = await this.consumeStream(response);
    if (assistantContent) {
      this.history.push({ role: 'assistant', content: assistantContent });
    }

    this.emit({ type: 'status', status: 'idle' });
    this.responseCompleteResolve?.();
    this.responseCompleteResolve = null;
    this.responseCompleteReject = null;

    await completionPromise;
  }

  async cancel(_sessionId: SessionId): Promise<void> {
    this.abortController.abort();
  }

  onMessage(handler: AgentMessageHandler): void {
    this.emitter.on('message', handler);
  }

  offMessage(handler: AgentMessageHandler): void {
    this.emitter.off('message', handler);
  }

  async respondToPermission(_requestId: string, _approved: boolean): Promise<void> {
    // No permission model for direct chat completions
  }

  async waitForResponseComplete(timeoutMs = 120_000): Promise<void> {
    if (!this.responseCompleteResolve) return;
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for response to complete')),
        timeoutMs,
      );
      const origResolve = this.responseCompleteResolve!;
      const origReject = this.responseCompleteReject!;
      this.responseCompleteResolve = () => {
        clearTimeout(timer);
        origResolve();
        resolve();
      };
      this.responseCompleteReject = (err: Error) => {
        clearTimeout(timer);
        origReject(err);
        reject(err);
      };
    });
  }

  async dispose(): Promise<void> {
    this.abortController.abort();
    this.responseCompleteReject?.(new Error('Backend disposed'));
    this.responseCompleteResolve = null;
    this.responseCompleteReject = null;
    this.emitter.removeAllListeners();
  }

  private emit(msg: AgentMessage): void {
    this.emitter.emit('message', msg);
  }

  /**
   * Consumes an SSE stream from the chat completions response,
   * emitting model-output messages for each content delta.
   * Returns the full assembled assistant response text.
   */
  private async consumeStream(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              this.emit({ type: 'model-output', textDelta: delta, fullText });
            }
          } catch {
            logger.debug(`[openai-compat] Failed to parse SSE chunk: ${data}`);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logger.debug(`[openai-compat] Stream error: ${error}`);
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }
}
