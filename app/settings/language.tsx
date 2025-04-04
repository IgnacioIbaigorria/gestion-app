import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import i18n from '../../translations';
import Colors from '../../constants/Colors';
import LanguageSelector from '../../components/LanguageSelector';

export default function LanguageScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: i18n.t('settings.language'),
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.surface,
        }} 
      />
      <View style={styles.container}>
        <LanguageSelector />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
});