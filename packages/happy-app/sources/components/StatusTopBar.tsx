import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import type { StatuslineData } from '@/hooks/useStatuslineData';

interface StatusTopBarProps {
    data: StatuslineData;
    onPressModel?: () => void;
    onPressBranch?: () => void;
    onPressCwd?: () => void;
}

export const StatusTopBar = React.memo(function StatusTopBar({
    data,
    onPressModel,
    onPressBranch,
    onPressCwd,
}: StatusTopBarProps) {
    const { theme } = useUnistyles();
    const { modelCode, branch, isDirty, cwd } = data;

    // Show last 2 path segments with ~ home substitution
    const shortCwd = cwd
        ? cwd.replace(/^\/home\/[^/]+/, '~').split('/').slice(-2).join('/')
        : null;

    const branchLabel = branch
        ? isDirty ? `${branch}*` : branch
        : null;

    if (!modelCode && !branchLabel && !shortCwd) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceHighest, borderBottomColor: theme.colors.divider }]}>
            {modelCode && (
                <Pressable onPress={onPressModel} hitSlop={8}>
                    <Text style={[styles.chip, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {modelCode}
                    </Text>
                </Pressable>
            )}
            {branchLabel && (
                <>
                    <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>·</Text>
                    <Pressable onPress={onPressBranch} hitSlop={8}>
                        <Text
                            style={[
                                styles.chip,
                                { color: isDirty ? theme.colors.warningCritical : theme.colors.textSecondary },
                            ]}
                            numberOfLines={1}
                        >
                            {branchLabel}
                        </Text>
                    </Pressable>
                </>
            )}
            {shortCwd && (
                <>
                    <Text style={[styles.dot, { color: theme.colors.textSecondary }]}>·</Text>
                    <Pressable onPress={onPressCwd} hitSlop={8} style={styles.cwdPressable}>
                        <Text style={[styles.chip, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {shortCwd}
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 4,
    },
    chip: {
        fontSize: 11,
        ...Typography.mono(),
        ...Typography.default(),
    },
    dot: {
        fontSize: 11,
        ...Typography.default(),
    },
    cwdPressable: {
        flex: 1,
        minWidth: 0,
    },
});
