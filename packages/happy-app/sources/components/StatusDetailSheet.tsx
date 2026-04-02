import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { formatTokens } from '@/hooks/useStatuslineData';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import type { StatuslineData } from '@/hooks/useStatuslineData';

export type StatusDetailField = 'model' | 'branch' | 'cwd' | 'tokens' | 'approvals';

interface StatusDetailSheetProps {
    field: StatusDetailField;
    data: StatuslineData;
    onClose?: () => void;
}

/** Rendered via Modal.show({ component: StatusDetailSheet, props: { field, data } }) */
export function StatusDetailSheet({ field, data }: StatusDetailSheetProps) {
    const { theme } = useUnistyles();
    const elapsed = useElapsedTime(data.sessionStart);

    const formatDuration = (secs: number): string => {
        if (secs < 60) return `${secs}s`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m${secs % 60}s`;
        return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {field === 'tokens' && (
                <>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Token Usage</Text>
                    <Row label="Input" value={formatTokens(data.inputTokens)} theme={theme} />
                    <Row label="Output" value={formatTokens(data.outputTokens)} theme={theme} />
                    <Row label="Total" value={formatTokens(data.inputTokens + data.outputTokens)} theme={theme} />
                    {data.costDisplay && (
                        <Row label="Est. cost" value={data.costDisplay} theme={theme} />
                    )}
                </>
            )}
            {field === 'branch' && (
                <>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Git Status</Text>
                    <Row label="Branch" value={data.branch ?? 'unknown'} theme={theme} />
                    <Row label="Has changes" value={data.isDirty ? 'Yes' : 'No'} theme={theme} />
                </>
            )}
            {field === 'cwd' && (
                <>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Working Directory</Text>
                    <Text style={[styles.mono, { color: theme.colors.textSecondary }]}>
                        {data.cwd ?? 'unknown'}
                    </Text>
                </>
            )}
            {field === 'model' && (
                <>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Model</Text>
                    <Row label="Model" value={data.modelCode ?? 'unknown'} theme={theme} />
                    <Row label="Agent" value={data.flavor ?? 'unknown'} theme={theme} />
                    <Row label="Uptime" value={formatDuration(elapsed)} theme={theme} />
                </>
            )}
            {field === 'approvals' && (
                <>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Pending Approvals</Text>
                    <Row label="Waiting" value={`${data.pendingApprovals}`} theme={theme} />
                </>
            )}
        </View>
    );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
    return (
        <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 20,
        minWidth: 260,
        gap: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        ...Typography.default('semiBold'),
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    label: {
        fontSize: 13,
        ...Typography.default(),
    },
    value: {
        fontSize: 13,
        ...Typography.mono(),
    },
    mono: {
        fontSize: 12,
        ...Typography.mono(),
        flexShrink: 1,
    },
});
