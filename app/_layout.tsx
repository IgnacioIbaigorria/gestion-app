import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import Colors from '@/constants/Colors';
import { LanguageProvider } from '../context/LanguageContext';
import { TouchableOpacity, SafeAreaView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/translations';
import { useLanguage } from '../context/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
// Remove the initializeApp import since we don't need it anymore
// import { initializeApp } from '../services/appInitializer';
// Remove the Constants import as well if not used elsewhere
// import Constants from 'expo-constants';

// Remove the environment variable logging
// console.log('ENV VARS:', {...});

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
  // We don't need to track database initialization anymore
  // const [dbInitialized, setDbInitialized] = useState(false);
  // const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function initialize() {
      try {
        if (loaded) {
          // Remove the environment variable logging
          // console.log('ENV VARS in effect:', {...});
          
          // Remove database initialization
          // const result = await initializeApp();
          // setDbInitialized(result);
          
          // Just hide the splash screen once fonts are loaded
          await SplashScreen.hideAsync();
        }
      } catch (err) {
        console.error('Error initializing app:', err);
        // We don't need to track database errors anymore
        // setDbError(err instanceof Error ? err.message : 'Unknown error');
        await SplashScreen.hideAsync(); // Hide splash screen even on error
      }
    }
    
    initialize();
  }, [loaded]);

  // Only check if fonts are loaded, not database
  if (!loaded) {
    return null;
  }

  // Remove the database error check
  // if (dbError) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
  //       <Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>
  //         Error connecting to database. Please check your connection and restart the app.
  //       </Text>
  //       <Text style={{ fontSize: 14, color: 'gray' }}>{dbError}</Text>
  //     </View>
  //   );
  // }

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

