import React from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackVisible: true,
        headerShown: true,
      }}
    >
      {/* Home Screen */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerRight: ({ tintColor }) => (
            <Ionicons name="home-outline" size={24} color={tintColor} />
          ),
        }}
      />

      {/* Products Screens */}
      <Stack.Screen
        name="productos/index"
        options={{
          title: 'Productos',
          headerRight: ({ tintColor }) => (
            <Ionicons name="cube-outline" size={24} color={tintColor} />
          ),
        }}
      />
      <Stack.Screen
        name="productos/nuevo"
        options={{
          title: 'Agregar Producto',
        }}
      />
      <Stack.Screen
        name="productos/[id]"
        options={{
          title: 'Detalle de Producto',
        }}
      />
      <Stack.Screen
        name="productos/tags/index"
        options={{
          title: 'Gestionar Etiquetas',
        }}
      />

      {/* Sales Screens */}
      <Stack.Screen
        name="ventas/index"
        options={{
          title: 'Ventas',
          headerRight: ({ tintColor }) => (
            <Ionicons name="cart-outline" size={24} color={tintColor} />
          ),
        }}
      />
      <Stack.Screen
        name="ventas/nueva"
        options={{
          title: 'Registrar Venta',
        }}
      />
      <Stack.Screen
        name="ventas/[id]"
        options={{
          title: 'Detalle de Venta',
        }}
      />

      {/* Cash Register Screens */}
      <Stack.Screen
        name="caja/index"
        options={{
          title: 'Caja',
          headerRight: ({ tintColor }) => (
            <Ionicons name="cash-outline" size={24} color={tintColor} />
          ),
        }}
      />
      <Stack.Screen
        name="caja/reporte"
        options={{
          title: 'Reporte de Caja',
        }}
      />
      <Stack.Screen
        name="estadisticas/index"
        options={{
          title: 'Estadísticas',
          headerRight: ({ tintColor }) => <Ionicons name="stats-chart" size={24} color={tintColor} />,
        }}
      />
    </Stack>
  );
}
