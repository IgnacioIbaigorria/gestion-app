import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import i18n from '../translations';
// Remove Colors import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LanguageSelector() {
  const { theme } = useTheme();
  const { setLocale } = useLanguage();

  const changeLanguage = async (locale: string) => {
    i18n.locale = locale;
    await AsyncStorage.setItem('userLanguage', locale);
    setLocale(locale);
    router.replace('/(tabs)'); // Navigate to home tab and reset navigation
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.languageButton, 
          { 
            backgroundColor: theme.surface,
            borderColor: theme.primaryLight 
          },
          i18n.locale === 'es' && [styles.activeLanguage, { backgroundColor: theme.primary }]
        ]}
        onPress={() => changeLanguage('es')}
      >
        <Text style={[
          styles.languageText,
          { color: theme.text },
          i18n.locale === 'es' && [styles.activeLanguageText, { color: theme.surface }]
        ]}>Español</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.languageButton, 
          { 
            backgroundColor: theme.surface,
            borderColor: theme.primaryLight 
          },
          i18n.locale === 'en' && [styles.activeLanguage, { backgroundColor: theme.primary }]
        ]}
        onPress={() => changeLanguage('en')}
      >
        <Text style={[
          styles.languageText,
          { color: theme.text },
          i18n.locale === 'en' && [styles.activeLanguageText, { color: theme.surface }]
        ]}>English</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.languageButton, 
          { 
            backgroundColor: theme.surface,
            borderColor: theme.primaryLight 
          },
          i18n.locale === 'pt' && [styles.activeLanguage, { backgroundColor: theme.primary }]
        ]}
        onPress={() => changeLanguage('pt')}
      >
        <Text style={[
          styles.languageText,
          { color: theme.text },
          i18n.locale === 'pt' && [styles.activeLanguageText, { color: theme.surface }]
        ]}>Português</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  languageButton: {
    width: '80%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    // backgroundColor and borderColor applied dynamically
  },
  activeLanguage: {
    // backgroundColor applied dynamically
  },
  languageText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    // color applied dynamically
  },
  activeLanguageText: {
    // color applied dynamically
  },
});