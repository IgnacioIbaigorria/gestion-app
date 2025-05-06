import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { salesService } from '../../../services/salesService';
import SaleItem from '../../../components/SaleItem';
import { Sale } from '../../../models/types';
import i18n from '../../../translations';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal } from 'react-native';
import { productService } from '@/services/productService';
import { cashService } from '@/services/cashService';
import { useTheme } from '@/contexts/ThemeContext';

export default function SalesScreen() {
  const { theme } = useTheme();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'day' | 'week' | 'custom'>('day');
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  useEffect(() => {
    loadSales();
  }, [filterType, startDate, endDate]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const salesData = await salesService.getAllSales();
      const filteredSales = filterSales(salesData);
      setSales(filteredSales);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('sales.errorSale'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = (salesData: Sale[]) => {
    return salesData.filter(sale => {
      // Ensure sale.date is a Date object
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      
      // Compare the timestamps for accurate date comparison
      return saleDate.getTime() >= startDate.getTime() && 
             saleDate.getTime() <= endDate.getTime();
    });
  };

  const handleDeleteSale = (sale: Sale) => {
    Alert.alert(
      i18n.t('common.confirm'),
      i18n.t('sales.confirmDelete'),
      [
        {
          text: i18n.t('common.cancel'),
          style: 'cancel'
        },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // First, restore product quantities
              if (sale.items && sale.items.length > 0) {
                for (const item of sale.items) {
                  const product = await productService.getProductById(item.productId);
                  if (product) {
                    const newQuantity = (product.quantity || 0) + item.quantity;
                    await productService.updateProduct(item.productId, { quantity: newQuantity });
                  }
                }
              }
              
              // Delete the associated cash transaction
              if (sale.id) {
                await cashService.deleteTransactionByReference(sale.id);
              }
              
              // Delete the sale
              await salesService.deleteSale(sale.id!);
              
              // Refresh the list
              loadSales();
              
              Alert.alert(i18n.t('common.success'), i18n.t('sales.deleteSuccess'));
            } catch (error) {
              console.error('Error deleting sale:', error);
              Alert.alert(i18n.t('common.error'), i18n.t('sales.deleteError'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  

  const handleFilterChange = (type: 'day' | 'week' | 'custom') => {
    setFilterType(type);
    switch (type) {
      case 'day':
        setStartDate(startOfDay(new Date()));
        setEndDate(endOfDay(new Date()));
        break;
      case 'week':
        setStartDate(startOfWeek(new Date(), { locale: es }));
        setEndDate(endOfWeek(new Date(), { locale: es }));
        break;
      case 'custom':
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setShowCustomDateModal(true);
        break;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        if (selectedDate <= tempEndDate) {
          setTempStartDate(startOfDay(selectedDate));
        } else {
          Alert.alert(i18n.t('common.error'), i18n.t('sales.filter.startDateError'));
        }
      } else {
        if (selectedDate >= tempStartDate) {
          setTempEndDate(endOfDay(selectedDate));
        } else {
          Alert.alert(i18n.t('common.error'), i18n.t('sales.filter.endDateError'));
        }
      }
    }
  };

  const handleCustomDateConfirm = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowCustomDateModal(false);
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'day':
        return format(startDate, 'dd/MM/yyyy');
      case 'week':
        return `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM/yyyy')}`;
      case 'custom':
        return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('sales.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.filterContainer, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            filterType === 'day' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => handleFilterChange('day')}
        >
          <Text style={[
            styles.filterText, 
            { color: theme.text },
            filterType === 'day' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('common.today')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            filterType === 'week' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => handleFilterChange('week')}
        >
          <Text style={[
            styles.filterText, 
            { color: theme.text },
            filterType === 'week' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('common.week')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            filterType === 'custom' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => handleFilterChange('custom')}
        >
          <Text style={[
            styles.filterText, 
            { color: theme.text },
            filterType === 'custom' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('common.custom')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.dateRangeText, { color: theme.textLight }]}>{getFilterLabel()}</Text>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => <SaleItem sale={item} onDelete={() => handleDeleteSale(item)} />}
        refreshing={loading}
        onRefresh={loadSales}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textLight }]}>
            {i18n.t('sales.empty')}
          </Text>
        }
      />
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/ventas/nueva')}
      >
        <Ionicons name="add" size={30} color={theme.surface} />
      </TouchableOpacity>
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{i18n.t('sales.filter.selectPeriod')}</Text>
            
            <TouchableOpacity
              style={[styles.dateButton, { 
                backgroundColor: theme.background,
                borderColor: theme.border
              }]}
              onPress={() => {
                setDatePickerMode('start');
                setShowDatePicker(true);
              }}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {i18n.t('sales.filter.startDate')}: {format(tempStartDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateButton, { 
                backgroundColor: theme.background,
                borderColor: theme.border
              }]}
              onPress={() => {
                setDatePickerMode('end');
                setShowDatePicker(true);
              }}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {i18n.t('sales.filter.endDate')}: {format(tempEndDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { 
                  backgroundColor: theme.error,
                  borderColor: theme.border
                }]}
                onPress={() => setShowCustomDateModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.surface }]}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { 
                  backgroundColor: theme.primary,
                  borderColor: theme.border
                }]}
                onPress={handleCustomDateConfirm}
              >
                <Text style={[styles.modalButtonText, { color: theme.surface }]}>{i18n.t('common.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? tempStartDate : tempEndDate}
          mode="date"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterButtonActive: {
    // backgroundColor applied dynamically
  },
  filterText: {
    fontSize: 14,
    // color applied dynamically
  },
  filterTextActive: {
    fontWeight: 'bold',
    // color applied dynamically
  },
  dateRangeText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    // color applied dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color applied dynamically
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    // color applied dynamically
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    // backgroundColor applied dynamically
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    // backgroundColor applied dynamically
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    // color applied dynamically
  },
  dateButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    // backgroundColor and borderColor applied dynamically
  },
  dateButtonText: {
    fontSize: 16,
    // color applied dynamically
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    // borderColor applied dynamically
  },
  cancelButton: {
    // backgroundColor applied dynamically
  },
  confirmButton: {
    // backgroundColor applied dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    // color applied dynamically
  },
});