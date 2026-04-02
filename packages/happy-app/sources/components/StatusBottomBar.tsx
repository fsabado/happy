import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { useElapsedTime } from '@/hooks/useElapsedTime';
import { formatTokens } from '@/hooks/useStatuslineData';
import type { StatuslineData } from '@/hooks/useStatuslineData';

interface StatusBottomBarProps {
    data: StatuslineData;
    onPressApprovals?: () => void;
    onPressTokens?: () => void;
}

export const StatusBottomBar = React.memo(function StatusBottomBar({
    data,
    onPressApprovals,
    onPressTokens,
}: StatusBottomBarProps) {
    const { theme } = useUnistyles();
    const {
        activeTool,
        inputTokens,
        outputTokens,
        costDisplay,
        sessionStart,
        pendingApprovals,
    } = data;

    const elapsed = useElapsedTime(sessionStart);
    const totalTokens = inputTokens + outputTokens;

    const formatDuration = (secs: number): string => {
        if (secs < 60) return `${secs}s`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m${secs % 60}s`;
        return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceHighest, borderTopColor: theme.colors.divider }]}>
            {/* Left: active tool */}
            <View style={styles.left}>
                {activeTool ? (
                    <Text style={[styles.tool, { color: theme.colors.textLink }]} numberOfLines={1}>
                        ↳ {activeTool}
                    </Text>
                ) : (
                    <Text style={[styles.chip, { color: theme.colors.textSecondary }]}>idle</Text>
                )}
            </View>

            {/* Right: tokens · cost · duration · approvals */}
            <View style={styles.right}>
                <Pressable onPress={onPressTokens} hitSlop={8}>
                    <Text style={[styles.chip, { color: theme.colors.textSecondary }]}>
                        {formatTokens(totalTokens)} tok
                    </Text>
                </Pressable>

                {costDisplay && (
                    <>
                        <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>·</Text>
                        <Text style={[styles.chip, { color: theme.colors.textSecondary }]}>
                            {costDisplay}
                        </Text>
                    </>
                )}

                <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>·</Text>
                <Text style={[styles.chip, { color: theme.colors.textSecondary }]}>
                    {formatDuration(elapsed)}
                </Text>

                {pendingApprovals > 0 && (
                    <>
                        <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>·</Text>
                        <Pressable onPress={onPressApprovals} hitSlop={8}>
                            <Text style={[styles.chip, styles.approvals, { color: theme.colors.warningCritical }]}>
                                △ {pendingApprovals}
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
        minWidth: 0,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    chip: {
        fontSize: 11,
        ...Typography.mono(),
    },
    tool: {
        fontSize: 11,
        ...Typography.mono(),
    },
    dot: {
        fontSize: 11,
        ...Typography.default(),
    },
    approvals: {
        fontWeight: '600',
    },
});
