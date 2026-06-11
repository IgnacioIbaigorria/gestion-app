const colors = {
  primary: '#4F46E5',        // Indigo 600 - Modern, vibrant primary
  secondary: '#4338CA',      // Indigo 700
  primaryLight: '#818CF8',   // Indigo 400
  primaryDark: '#312E81',    // Indigo 900
  accent: '#06B6D4',         // Cyan 500
  background: '#F8FAFC',     // Slate 50
  surface: '#FFFFFF',        // White
  surfaceHighlight: '#F1F5F9', // Slate 100
  text: '#0F172A',           // Slate 900
  textSecondary: '#475569',  // Slate 600
  white: '#FFFFFF',
  textLight: '#94A3B8',      // Slate 400
  error: '#EF4444',          // Red 500
  success: '#10B981',        // Emerald 500
  warning: '#F59E0B',        // Amber 500
  info: '#3B82F6',           // Blue 500
  border: '#E2E8F0',         // Slate 200
  card: '#FFFFFF',
};

const lightTheme = {
  primary: '#4F46E5',
  secondary: '#4338CA',
  primaryLight: '#818CF8',
  primaryDark: '#312E81',
  accent: '#06B6D4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  white: '#FFFFFF',
  textLight: '#94A3B8',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  border: '#E2E8F0',
  card: '#FFFFFF',
  highlight: '#818CF8',
  shadow: '#64748B', // Slate 500
};

const darkTheme = {
  primary: '#6366F1',        // Indigo 500 - Slightly lighter for dark mode
  secondary: '#4F46E5',      // Indigo 600
  primaryLight: '#312E81',   // Indigo 900
  primaryDark: '#1E1B4B',    // Indigo 950
  accent: '#22D3EE',         // Cyan 400
  background: '#0F172A',     // Slate 900
  surface: '#1E293B',        // Slate 800
  surfaceHighlight: '#334155', // Slate 700
  text: '#F8FAFC',           // Slate 50
  textSecondary: '#CBD5E1',  // Slate 300
  white: '#FFFFFF',
  textLight: '#94A3B8',      // Slate 400
  error: '#F87171',          // Red 400
  success: '#34D399',        // Emerald 400
  warning: '#FBBF24',        // Amber 400
  info: '#60A5FA',           // Blue 400
  border: '#334155',         // Slate 700
  card: '#1E293B',           // Slate 800
  highlight: '#6366F1',
  shadow: '#000000',
};

const Colors = {
  light: lightTheme,
  dark: darkTheme,
};

export { colors, lightTheme, darkTheme, Colors };
export default lightTheme;
