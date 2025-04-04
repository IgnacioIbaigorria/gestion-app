import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import i18n from '../translations';

export default function DrawerScreen() {
  const MenuItem = ({ icon, title, onPress }: { icon: string, title: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color={Colors.text} />
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <MenuItem 
        icon="language" 
        title={i18n.t('settings.language')}
        onPress={() => {
          router.push('/settings/language');
          router.back();
        }}
      />
      {/* Add more menu items here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
});