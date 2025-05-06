import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  style?: object;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ style }) => {
  const { toggleTheme, isDarkTheme, theme } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.background },{borderWidth: 1}, {borderColor:theme.border}, style]} 
      onPress={toggleTheme}
    >
      <Ionicons 
        name={isDarkTheme ? 'sunny' : 'moon'} 
        size={24} 
        color={theme.primary} 
      />
      <Text style={[styles.text, { color: theme.text }]}>
        {isDarkTheme ? 'Modo Claro' : 'Modo Oscuro'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    marginLeft: 8,
    fontSize: 16,
  }
});

export default ThemeToggle;