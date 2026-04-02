/**
 * Aggregates all data fields needed by StatusTopBar and StatusBottomBar
 * from existing session state. No new protocol required — reads from
 * session.latestUsage, session.metadata, and the separate gitStatus store.
 *
 * Named useStatuslineData (not useSessionStatus) to avoid conflict with
 * sessionUtils.ts's existing useSessionStatus hook.
 *
 * Phase 2 migration: swap data sources to typed event bus events without
 * changing the returned interface.
 */
import { useMemo } from 'react';
import { useSession, useSessionGitStatus } from '@/sync/storage';
import { estimateCost, formatCost } from '@/constants/modelRates';

export interface StatuslineData {
    // Top bar
    modelCode: string | null;
    flavor: string | null;
    cwd: string | null;
    branch: string | null;
    isDirty: boolean;
    // Bottom bar
    activeTool: string | null;
    inputTokens: number;
    outputTokens: number;
    costDisplay: string | null;
    sessionStart: number | null;   // timestamp for useElapsedTime
    pendingApprovals: number;
    isThinking: boolean;
}

export function useStatuslineData(sessionId: string): StatuslineData {
    const session = useSession(sessionId);
    const gitStatus = useSessionGitStatus(sessionId);

    return useMemo(() => {
        const metadata = session?.metadata ?? null;
        const usage = session?.latestUsage ?? null;
        const requests = session?.agentState?.requests ?? {};
        const pendingApprovals = Object.keys(requests).length;

        const modelCode = metadata?.currentModelCode ?? null;
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;

        const rawCost = modelCode
            ? estimateCost(modelCode, inputTokens, outputTokens)
            : null;
        const costDisplay = rawCost != null ? formatCost(rawCost) : null;

        // Phase 1: active tool is inferred from thinking state.
        // Phase 2 will replace this with a tool.executing event.
        const activeTool = session?.thinking ? 'thinking' : null;

        return {
            modelCode,
            flavor: metadata?.flavor ?? null,
            cwd: metadata?.path ?? null,
            branch: gitStatus?.branch ?? null,
            isDirty: gitStatus?.isDirty ?? false,
            activeTool,
            inputTokens,
            outputTokens,
            costDisplay,
            sessionStart: session?.createdAt ?? null,
            pendingApprovals,
            isThinking: session?.thinking ?? false,
        };
    }, [session, gitStatus]);
}

export function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
}
