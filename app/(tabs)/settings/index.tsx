import React from 'react';
import { View } from 'react-native';
import LanguageSelector from '../../../components/LanguageSelector';
import Colors from '../../../constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LanguageSelector />
    </View>
  );
}