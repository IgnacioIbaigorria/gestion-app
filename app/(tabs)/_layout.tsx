import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { View, StyleSheet } from 'react-native';
import i18n from '../../translations';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { locale } = useLanguage(); // Add this line
  const { theme } = useTheme();  
  const HeaderIcon = ({ name, tintColor }: { name: any; tintColor?: string }) => (
    <View style={styles.headerIconContainer}>
      <Ionicons name={name} size={24} color={tintColor} />
    </View>
  );

  // Force re-render when locale changes
  useEffect(() => {
    // This will trigger a re-render when language changes
  }, [locale]);

  const CustomDrawerContent = (props: any) => {
    return (
      <DrawerContentScrollView 
        {...props}
        style={{ backgroundColor: theme.background }}
      >
        {/* Original drawer items */}
        <DrawerItemList {...props} />
        
        {/* Theme toggle at the bottom */}
        <View style={[styles.themeToggleContainer, {borderColor: theme.border}, {borderTopWidth: 1}]}>
          <ThemeToggle style={styles.themeToggle} />
        </View>
      </DrawerContentScrollView>
    );
  };


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Drawer
       drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.primary,
          },
          headerTintColor: theme.surface,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
          drawerStyle: {
            backgroundColor: theme.background,
          },
          drawerActiveTintColor: theme.primary,
          drawerInactiveTintColor: theme.text,
          headerRight: ({ tintColor }) => (
            <View style={styles.headerIconContainer} />
          ),
        }}
        backBehavior="history"
      >
        {/* Home Screen */}
        <Drawer.Screen
          name="index"
          options={{
            title: i18n.t('common.home'),
            drawerLabel: i18n.t('common.home'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="home-outline" tintColor={tintColor} />
            ),
          drawerIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Products Screens */}
        <Drawer.Screen
          name="productos/index"
          options={{
            title: i18n.t('common.products'),
            drawerLabel: i18n.t('common.products'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="cube-outline" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="cube-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Sales Screens */}
        <Drawer.Screen
          name="ventas/index"
          options={{
            title: i18n.t('common.sales'),
            drawerLabel: i18n.t('common.sales'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="cart-outline" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="cart-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Cash Register Screens */}
        <Drawer.Screen
          name="caja/index"
          options={{
            title: i18n.t('common.cash'),
            drawerLabel: i18n.t('common.cash'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="cash-outline" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="cash-outline" size={24} color={color} />
            ),
          }}
        />
                <Drawer.Screen
          name="productos/tags/index"
          options={{
            title: i18n.t('tags.title'),
            drawerLabel: i18n.t('tags.title'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="pricetags-outline" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="pricetags-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="productos/categorias/index"
          options={{
            title: i18n.t('common.categories'),
            drawerLabel: i18n.t('common.categories'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="folder-outline" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="folder-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="estadisticas/index"
          options={{
            title: i18n.t('common.stats'),
            drawerLabel: i18n.t('common.stats'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="stats-chart" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="stats-chart" size={24} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="presupuestos/index"
          options={{
            title: i18n.t('quotes.title'),
            drawerLabel: i18n.t('quotes.title'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="document-text-outline" tintColor={tintColor} />
            ),   
            drawerIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={24} color={color} />
            ),
          }}
        />
        {/* Settings Screen */}
        <Drawer.Screen
          name="settings/index"
          options={{
            title: i18n.t('settings.language'),
            drawerLabel: i18n.t('settings.language'),
            headerRight: ({ tintColor }) => (
              <HeaderIcon name="language" tintColor={tintColor} />
            ),
            drawerIcon: ({ color }) => (
              <Ionicons name="language" size={24} color={color} />
            ),
          }}
        />

        {/* Other screens that shouldn't appear in drawer */}
        <Drawer.Screen
          name="productos/nuevo"
          options={{
            title: i18n.t('products.newEditProduct'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="productos/[id]"
          options={{
            title: i18n.t('products.detail.title'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="ventas/nueva"
          options={{
            title: i18n.t('sales.new'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="ventas/[id]"
          options={{
            title: i18n.t('sales.detail.title'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="caja/reporte"
          options={{
            title: i18n.t('cash.reports'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="presupuestos/nuevo"
          options={{
            title: i18n.t('quotes.new'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="presupuestos/[id]"
          options={{
            title: i18n.t('quotes.detail.title'),
            drawerItemStyle: { display: 'none' },
          }}
          />
        <Drawer.Screen
          name="productos/categoria-actualizar"
          options={{
            title: i18n.t('products.categoryUpdate'),
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </SafeAreaView>
    );
  }


const styles = StyleSheet.create({
  headerIconContainer: {
    marginRight: 16,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleContainer: {
    padding: 16,
    marginTop: 20,
  },
  themeToggle: {
    width: '100%',
  },
});