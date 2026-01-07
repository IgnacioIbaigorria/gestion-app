import React from 'react';
import { StyleSheet, View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { Card } from './Card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
    onPress?: () => void;
    trend?: string;
    trendType?: 'up' | 'down' | 'neutral';
    style?: StyleProp<ViewStyle>;
};

export function StatCard({ title, value, icon, color, onPress, trend, trendType = 'neutral', style }: StatCardProps) {
    const primaryColor = color || useThemeColor({}, 'primary');
    const backgroundColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');
    const textLight = useThemeColor({}, 'textLight');

    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container onPress={onPress} style={style}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                        <Ionicons name={icon} size={24} color={color} />
                    </View>
                    {trend && (
                        <View style={[styles.trendContainer, {
                            backgroundColor: trendType === 'up' ? Colors.light.success + '20' :
                                trendType === 'down' ? Colors.light.error + '20' : Colors.light.surfaceHighlight
                        }]}>
                            <Ionicons
                                name={trendType === 'up' ? 'arrow-up' : trendType === 'down' ? 'arrow-down' : 'remove'}
                                size={12}
                                color={trendType === 'up' ? Colors.light.success : trendType === 'down' ? Colors.light.error : textLight}
                            />
                            <ThemedText style={[styles.trendText, {
                                color: trendType === 'up' ? Colors.light.success : trendType === 'down' ? Colors.light.error : textLight
                            }]}>
                                {trend}
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    <ThemedText type="heading" style={[styles.value, { color: textColor }]}>
                        {value}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: textLight }}>
                        {title}
                    </ThemedText>
                </View>
            </Card>
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        justifyContent: 'flex-end',
    },
    value: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 4,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
});
