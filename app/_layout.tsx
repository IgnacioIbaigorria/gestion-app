import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import Colors from '@/constants/Colors';
import { LanguageProvider } from '../context/LanguageContext';
import { TouchableOpacity, SafeAreaView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/translations';
import { useLanguage } from '../context/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { locale } = useLanguage();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.surface,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
          statusBarStyle: 'inverted',
          statusBarHidden: false,
          statusBarAnimation: 'slide',
          statusBarBackgroundColor: Colors.primary,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings/language"
          options={{
            presentation: 'modal',
            headerTitle: i18n.t('settings.language'),
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}

