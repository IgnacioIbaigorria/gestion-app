import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import i18n from '../translations';
import Colors from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LanguageSelector() {
  const changeLanguage = async (locale: string) => {
    i18n.locale = locale;
    await AsyncStorage.setItem('userLanguage', locale);
    // Force a re-render of the app
    // You might need to implement a context provider for this
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.languageButton, i18n.locale === 'es' && styles.activeLanguage]}
        onPress={() => changeLanguage('es')}
      >
        <Text style={styles.languageText}>Español</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.languageButton, i18n.locale === 'en' && styles.activeLanguage]}
        onPress={() => changeLanguage('en')}
      >
        <Text style={styles.languageText}>English</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  languageButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  activeLanguage: {
    backgroundColor: Colors.primary,
  },
  languageText: {
    color: Colors.text,
    fontWeight: '500',
  },
});