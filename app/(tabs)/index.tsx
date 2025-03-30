import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { cashService } from '../../services/cashService';
import Colors from '../../constants/Colors';
import { Timestamp } from 'firebase/firestore';

export default function DashboardScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener datos de productos
      const products = await productService.getAllProducts();
      setTotalProducts(products.length);
      setLowStockProducts(products.filter(p => (p.quantity || 0) < 5).length);
      
      // Obtener ventas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(today);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
      
      const todaySalesAmount = await salesService.calculateTotalSales(startOfDay, endOfDayTimestamp);
      setTodaySales(todaySalesAmount);
      
      // Obtener transacciones de hoy
      const transactions = await cashService.getTransactionsByDateRange(startOfDay, endOfDayTimestamp);
      setTodayTransactions(transactions.length);
      
      // Obtener saldo actual
      const balance = await cashService.getCurrentBalance();
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Punto Eco</Text>
        <Text style={styles.headerSubtitle}>Panel de Control</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Actual</Text>
        <Text style={styles.balanceAmount}>${currentBalance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={() => router.push('/caja')}
        >
          <Text style={styles.viewMoreButtonText}>Ver Caja</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/productos')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="cube" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{totalProducts}</Text>
          <Text style={styles.statLabel}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/productos?filter=lowStock')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: Colors.warning + '20' }]}>
            <Ionicons name="alert-circle" size={24} color={Colors.warning} />
          </View>
          <Text style={styles.statValue}>{lowStockProducts}</Text>
          <Text style={styles.statLabel}>Stock Bajo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/ventas')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name="cart" size={24} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>${todaySales.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Ventas hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/caja')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: Colors.info + '20' }]}>
            <Ionicons name="swap-vertical" size={24} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>{todayTransactions}</Text>
          <Text style={styles.statLabel}>Transacciones</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/productos/nuevo')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="add-circle" size={24} color={Colors.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Nuevo Producto</Text>
            <Text style={styles.actionDescription}>Agregar un nuevo producto al inventario</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/ventas/nueva')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.success }]}>
            <Ionicons name="cart" size={24} color={Colors.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Nueva Venta</Text>
            <Text style={styles.actionDescription}>Registrar una nueva venta</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/caja')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.info }]}>
            <Ionicons name="cash" size={24} color={Colors.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Registrar Transacción</Text>
            <Text style={styles.actionDescription}>Agregar un movimiento de caja</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.surface,
    opacity: 0.8,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  viewMoreButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  actionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
