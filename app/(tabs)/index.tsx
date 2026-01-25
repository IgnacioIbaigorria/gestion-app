import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { cashService } from '../../services/cashService';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Colors from '@/constants/Colors';

export default function DashboardScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const { theme, isDarkTheme } = useTheme();
  const [businessName, setBusinessName] = useState<string>('Punto Eco');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newBusinessName, setNewBusinessName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    fetchLowStockCount();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setBusinessName(settings.businessName);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const products = await productService.getAllProducts();
      setTotalProducts(products.length);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todaySalesAmount = await salesService.calculateTotalSales(today, endOfDay);
      setTodaySales(todaySalesAmount);

      const transactions = await cashService.getTransactionsByDateRange(today, endOfDay);
      setTodayTransactions(transactions.length);

      const balance = await cashService.calculateBalance();
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLowStockCount = async () => {
    try {
      const products = await productService.getAllProducts();
      const lowStockProducts = products.filter(product => {
        if (product.quantity === undefined || product.quantity === null) return false;
        const threshold = product.low_stock_threshold !== undefined ? product.low_stock_threshold : 3;
        return product.quantity < threshold;
      });
      setLowStockCount(lowStockProducts.length);
    } catch (error) {
      console.error('Error fetching low stock count:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleEditBusinessName = () => {
    setNewBusinessName(businessName);
    setIsEditingName(true);
  };

  const handleSaveBusinessName = async () => {
    if (!newBusinessName.trim()) {
      Alert.alert('Error', 'El nombre del negocio es requerido');
      return;
    }

    try {
      await settingsService.updateSettings({ businessName: newBusinessName.trim() });
      setBusinessName(newBusinessName.trim());
      setIsEditingName(false);
      Alert.alert('Exito', 'El nombre del negocio se actualizó correctamente');
    } catch (error) {
      console.error('Error updating business name:', error);
      Alert.alert('Error', 'Error al actualizar el nombre del negocio');
    }
  };

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>Bienvenido</ThemedText>
            <TouchableOpacity onPress={handleEditBusinessName} style={styles.businessNameRow}>
              <ThemedText type="title" style={styles.businessName}>
                {businessName}
              </ThemedText>
              <Ionicons name="pencil-outline" size={20} color={theme.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>

        <Card variant="elevated" style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="white" />
            </View>
            <TouchableOpacity onPress={() => router.push('/caja')} style={styles.viewMoreButton}>
              <ThemedText style={styles.viewMoreText}>Caja</ThemedText>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.balanceLabel}>Saldo actual</ThemedText>
          <ThemedText style={styles.balanceAmount}>${currentBalance.toLocaleString('es-ES')}</ThemedText>
        </Card>

        <View style={styles.statsGrid}>
          <View style={styles.statsColumn}>
            <StatCard
              title="Productos"
              value={totalProducts}
              icon="cube-outline"
              color={theme.primary}
              onPress={() => router.push('/productos')}
            />
            <StatCard
              title="Ventas hoy"
              value={`$${todaySales.toLocaleString('es-ES')}`}
              icon="cart-outline"
              color={theme.success}
              onPress={() => router.push('/ventas')}
            />
          </View>
          <View style={styles.statsColumn}>
            <StatCard
              title="Stock bajo"
              value={lowStockCount}
              icon="alert-circle-outline"
              color={theme.warning}
              onPress={() => router.push({
                pathname: '/productos',
                params: { filter: 'lowStock', source: 'dashboard' }
              })}
            />
            <StatCard
              title="Estadísticas"
              value="Ver"
              icon="stats-chart-outline"
              color={theme.info}
              onPress={() => router.push('/estadisticas')}
            />
          </View>
        </View>

        <ThemedText type="heading" style={styles.sectionTitle}>Acciones rápidas</ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/ventas/nueva')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="cart" size={24} color={theme.primary} />
            </View>
            <ThemedText style={styles.actionText}>Nueva venta</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/productos/nuevo')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="add-circle" size={24} color={theme.success} />
            </View>
            <ThemedText style={styles.actionText}>Nuevo producto</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/caja')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.warning + '20' }]}>
              <Ionicons name="cash" size={24} color={theme.warning} />
            </View>
            <ThemedText style={styles.actionText}>{'Caja'}</ThemedText>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={isEditingName}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsEditingName(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <ThemedText type="heading" style={styles.modalTitle}>
                Editar nombre del negocio
              </ThemedText>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={newBusinessName}
                onChangeText={setNewBusinessName}
                placeholder="Nombre del negocio"
                placeholderTextColor={theme.textLight}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: theme.border }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsEditingName(false);
                  }}
                >
                  <ThemedText>{'Cancelar'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleSaveBusinessName();
                  }}
                >
                  <ThemedText style={{ color: 'white' }}>{'Guardar'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  greeting: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    marginBottom: 0,
  },
  balanceCard: {
    backgroundColor: '#4F46E5', // Always use primary brand color for main card
    padding: 24,
    marginBottom: 24,
    borderRadius: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewMoreText: {
    color: 'white',
    marginRight: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    paddingVertical: 4,
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionsContainer: {
    marginBottom: 24,
    padding: 4,
  },
  actionButton: {
    width: 110,
    height: 110,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
