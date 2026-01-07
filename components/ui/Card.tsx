import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export type CardProps = ViewProps & {
    lightColor?: string;
    darkColor?: string;
    variant?: 'elevated' | 'outlined' | 'flat';
};

export function Card({ style, lightColor, darkColor, variant = 'elevated', ...otherProps }: CardProps) {
    const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'card');
    const borderColor = useThemeColor({ light: Colors.light.border, dark: Colors.dark.border }, 'border');
    const shadowColor = useThemeColor({ light: Colors.light.shadow, dark: Colors.dark.shadow }, 'shadow');

    return (
        <View
            style={[
                styles.card,
                { backgroundColor },
                variant === 'elevated' && {
                    shadowColor,
                    elevation: 4,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
                variant === 'outlined' && {
                    borderWidth: 1,
                    borderColor
                },
                style
            ]}
            {...otherProps}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
});
