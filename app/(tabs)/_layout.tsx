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
import { router } from 'expo-router';

export default function TabLayout() {
  const { locale } = useLanguage(); // Add this line
  const { theme } = useTheme();
  const HeaderIcon = ({ name, tintColor }: { name: any; tintColor?: string }) => (
    <View style={styles.headerIconContainer}>
      <Ionicons name={name} size={28} color={tintColor} />
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

        <DrawerItemList {...props} />

        <View style={[styles.themeToggleContainer, { borderColor: theme.border }, { borderTopWidth: 1 }]}>
          <ThemeToggle style={styles.themeToggle} />
        </View>
      </DrawerContentScrollView>
    );
  };


  return (
    <View style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation, route }) => ({
          headerStyle: {
            backgroundColor: theme.primary,
          },
          headerShown: true,
          drawerPosition: 'right',
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
          drawerStyle: {
            backgroundColor: theme.background,
          },
          drawerActiveTintColor: theme.primary,
          drawerHideStatusBarOnOpen: true,
          drawerInactiveTintColor: theme.text,
          headerLeft: () =>
            route.name === 'index'
              ? null
              : (
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={theme.white}
                  style={{ marginLeft: 16 }}
                  onPress={() => router.back()}
                />
              ),
        })}
        backBehavior="history"
      >
        {/* Home Screen */}
        <Drawer.Screen
          name="index"
          options={{
            title: i18n.t('common.home'),
            drawerLabel: i18n.t('common.home'),
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
            drawerIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={24} color={color} />
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
            title: 'Detalle de venta',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="caja/reporte"
          options={{
            title: 'Reportes',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="presupuestos/nuevo"
          options={{
            title: 'Nuevo presupuesto',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="presupuestos/[id]"
          options={{
            title: 'Detalle de presupuesto',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </View>
  );
}


const styles = StyleSheet.create({
  headerIconContainer: {
    marginRight: 16,
  },
  themeToggleContainer: {
    padding: 16,
    marginTop: 20,
  },
  themeToggle: {
    width: '100%',
  },
});