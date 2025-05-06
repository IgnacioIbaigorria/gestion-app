import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { cashService } from '../../services/cashService';
import { settingsService } from '../../services/settingsService';
import i18n from '../../translations';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
// Remove the SupabaseTest component if it was only for initialization testing
// import SupabaseTest from '../../components/SupabaseTest';

export default function DashboardScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const { locale } = useLanguage();
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const { theme } = useTheme();
  const [businessName, setBusinessName] = useState<string>('Punto Eco');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newBusinessName, setNewBusinessName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    fetchLowStockCount();
    loadSettings();
  }, [locale]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();
      setBusinessName(settings.businessName);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  
  // Then in your loadDashboardData function, update the date handling:
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener datos de productos
      const products = await productService.getAllProducts();
      setTotalProducts(products.length);
      
      // Obtener ventas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      // Use ISO strings for Supabase date filtering
      const todaySalesAmount = await salesService.calculateTotalSales(today, endOfDay);
      setTodaySales(todaySalesAmount);
      
      // Obtener transacciones de hoy
      const transactions = await cashService.getTransactionsByDateRange(today, endOfDay);
      setTodayTransactions(transactions.length);
      
      // Obtener saldo actual
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
      
      // Make sure this filter logic matches what's in your products screen
      const lowStockProducts = products.filter(product => {
        // Only consider products that have a quantity and lowStockThreshold set
        if (product.quantity === undefined || product.quantity === null) return false;
        
        // Use the product's specific threshold or a reasonable default (like 3)
        const threshold = product.low_stock_threshold !== undefined ? 
                          product.low_stock_threshold : 3;
        
        // Only count as low stock if quantity is LESS than threshold (not equal)
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
      Alert.alert(i18n.t('common.error'), i18n.t('dashboard.businessNameRequired'));
      return;
    }

    try {
      await settingsService.updateSettings({ businessName: newBusinessName.trim() });
      setBusinessName(newBusinessName.trim());
      setIsEditingName(false);
      Alert.alert(i18n.t('common.success'), i18n.t('dashboard.businessNameUpdated'));
    } catch (error) {
      console.error('Error updating business name:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('common.errorOccurred'));
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('dashboard.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.businessNameContainer}>
          <Text style={[styles.headerTitle, { color: theme.surface }]}>
            {businessName}
          </Text>
          <TouchableOpacity onPress={handleEditBusinessName} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color={theme.surface} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: theme.surface }]}>{i18n.t('dashboard.subtitle')}</Text>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.balanceLabel, { color: theme.textLight }]}>{i18n.t('dashboard.currentBalance')}</Text>
        <Text style={[styles.balanceAmount, { color: theme.text }]}>${currentBalance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={() => router.push('/caja')}
        >
          <Text style={[styles.viewMoreButtonText, { color: theme.primary }]}>{i18n.t('dashboard.viewCash')}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/productos')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="cube" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.statValue, { color: theme.text }]}>{totalProducts}</Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('dashboard.products')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.surface }]}
          onPress={() => router.push({
            pathname: '/productos',
            params: { filter: 'lowStock', source: 'dashboard' }
          })}
        >
          <View style={[styles.statIconContainer, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="alert-circle" size={24} color={theme.warning} />
          </View>
          <Text style={[styles.statValue, { color: theme.text }]}>{lowStockCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('dashboard.lowStock')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/ventas')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="cart" size={24} color={theme.success} />
          </View>
          <Text style={[styles.statValue, { color: theme.text }]}>${todaySales.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('dashboard.todaySales')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statisticsCard, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/estadisticas')}
        >
          <Ionicons name="stats-chart" size={32} color={theme.primary} />
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('common.stats')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('dashboard.quickActions')}</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/productos/nuevo')}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="add-circle" size={24} color={theme.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>{i18n.t('dashboard.newProduct')}</Text>
            <Text style={[styles.actionDescription, { color: theme.textLight }]}>{i18n.t('dashboard.newProductDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/ventas/nueva')}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.success }]}>
            <Ionicons name="cart" size={24} color={theme.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>{i18n.t('dashboard.newSale')}</Text>
            <Text style={[styles.actionDescription, { color: theme.textLight }]}>{i18n.t('dashboard.newSaleDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surface }]}
          onPress={() => router.push('/caja')}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.info }]}>
            <Ionicons name="cash" size={24} color={theme.surface} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>{i18n.t('dashboard.registerTransaction')}</Text>
            <Text style={[styles.actionDescription, { color: theme.textLight }]}>{i18n.t('dashboard.registerTransactionDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textLight} />
        </TouchableOpacity>
      </View>
      <Modal
        visible={isEditingName}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {i18n.t('dashboard.editBusinessName')}
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border
              }]}
              value={newBusinessName}
              onChangeText={setNewBusinessName}
              placeholder={i18n.t('dashboard.businessNamePlaceholder')}
              placeholderTextColor={theme.textLight}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { borderColor: theme.border }]} 
                onPress={() => setIsEditingName(false)}
              >
                <Text style={{ color: theme.text }}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]} 
                onPress={handleSaveBusinessName}
              >
                <Text style={{ color: theme.surface }}>{i18n.t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor removed
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color removed
  },
  header: {
    // backgroundColor removed
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // color removed
  },
  headerSubtitle: {
    fontSize: 16,
    // color removed
    opacity: 0.8,
  },
  balanceCard: {
    // backgroundColor removed
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
    // color removed
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    // color removed
    marginBottom: 16,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  viewMoreButtonText: {
    // color removed
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
    // backgroundColor removed
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
  statisticsCard: {
    // backgroundColor removed
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
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    // backgroundColor handled dynamically
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    // color removed
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    // color removed
  },
  actionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color removed
    marginBottom: 12,
  },
  actionButton: {
    // backgroundColor removed
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
    // backgroundColor handled dynamically
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
    // color removed
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    // color removed
  },
  businessNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
