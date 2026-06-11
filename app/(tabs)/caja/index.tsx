import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { cashService } from '../../../services/cashService';
import { CashTransaction } from '../../../models/types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { salesService } from '@/services/salesService';

export default function CashRegisterScreen() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'expense'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, isCustomDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      let transactionsData;
      if (isCustomDate) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);

        transactionsData = await cashService.getTransactionsByDateRange(
          start,
          end
        );
      } else {
        // Otherwise get today's transactions
        transactionsData = await cashService.getTodayTransactions();
      }

      setTransactions(transactionsData);

      const balance = await cashService.getCurrentBalance();
      setCurrentBalance(balance);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el saldo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSales = async () => {
    try {
      setLoading(true);
      await loadData();

    } catch (error) {
      console.error('Error syncing sales:', error);
      Alert.alert('Error', 'No se pudo sincronizar las ventas');
    } finally {
      setLoading(false);
    }
  };


  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
        setStartDate(selectedDate);
      } else {
        if (selectedDate < startDate) {
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
      setIsCustomDate(true);
    }
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha invalida';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Ionicons name="cart" size={24} color={theme.success} />;
      case 'expense':
        return <Ionicons name="wallet" size={24} color={theme.error} />;
      case 'deposit':
        return <Ionicons name="arrow-down" size={24} color={theme.primary} />;
      case 'withdrawal':
        return <Ionicons name="arrow-up" size={24} color={theme.warning} />;
      default:
        return <Ionicons name="help-circle" size={24} color={theme.textLight} />;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'expense':
        return 'Gasto';
      case 'withdrawal':
        return 'Retiro';
      case 'sale':
        return 'Venta';
      case 'deposit':
        return 'Depósito';
      default:
        return 'Tipo: ' + type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor que 0');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'La descripción no puede estar vacía');
      return;
    }

    try {
      setSubmitting(true);

      const transaction: Omit<CashTransaction, 'id'> = {
        date: new Date(),
        type: transactionType,
        amount: parseFloat(amount),
        description: description.trim()
      };

      await cashService.recordTransaction(transaction);

      setAmount('');
      setDescription('');
      setModalVisible(false);

      loadData();

      Alert.alert('Éxito', 'Transacción registrada correctamente');
    } catch (error) {
      Alert.alert('Error', 'Error al registrar la transacción');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Add this function to your CashRegisterScreen component
  const handleDeleteTransaction = (transaction: CashTransaction) => {
    // Only allow deletion of expenses, deposits, and withdrawals (not sales)
    if (transaction.type === 'sale') {
      Alert.alert(
        'Error',
        'No se puede eliminar una venta',
        [{ text: 'Aceptar' }]
      );
      return;
    }

    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que deseas eliminar esta transacción?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cashService.deleteTransaction(transaction.id!);
              loadData();
              Alert.alert('Éxito', 'Transacción eliminada correctamente');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Error al eliminar la transacción');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleTransactionPress = (transaction: CashTransaction) => {
    if (transaction.type === 'sale' && transaction.reference) {
      router.push(`/ventas/${transaction.reference}`);
    }
  };

  const renderTransactionItem = ({ item }: { item: CashTransaction }) => {
    const isSale = item.type === 'sale';

    return (
      <TouchableOpacity
        style={[styles.transactionItem, { borderBottomColor: theme.background }]}
        onPress={() => handleTransactionPress(item)}
        disabled={!isSale}
        activeOpacity={isSale ? 0.7 : 1}
      >
        <View style={[styles.transactionIcon, { backgroundColor: theme.background }]}>
          {getTransactionIcon(item.type)}
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, { color: theme.text }]}>{item.description}</Text>
          <Text style={[styles.transactionDate, { color: theme.textLight }]}>{formatDate(item.date)}</Text>
          <Text style={[styles.transactionType, { color: theme.textLight }]}>
            {getTransactionTypeText(item.type)}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            (item.type === 'expense' || item.type === 'withdrawal')
              ? [styles.negativeAmount, { color: theme.error }]
              : [styles.positiveAmount, { color: theme.success }]
          ]}
        >
          {(item.type === 'expense' || item.type === 'withdrawal') ? '-' : '+'}
          ${item.amount.toLocaleString('es-ES')}
        </Text>

        {item.type !== 'sale' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTransaction(item)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        )}

        {/* Add chevron for sales to indicate navigability */}
        {isSale && (
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={16} color={theme.textLight} />
          </View>
        )}
      </TouchableOpacity>
    );
  };


  const renderDateFilter = () => {
    return (
      <View style={styles.dateFilterContainer}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              !isCustomDate && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => {
              setIsCustomDate(false);
              const today = new Date();
              setStartDate(today);
              setEndDate(today);
            }}
          >
            <Text style={[
              styles.filterTabText,
              { color: !isCustomDate ? theme.surface : theme.text }
            ]}>Hoy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              isCustomDate && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setIsCustomDate(true)}
          >
            <Text style={[
              styles.filterTabText,
              { color: isCustomDate ? theme.surface : theme.text }
            ]}>Rango</Text>
          </TouchableOpacity>
        </View>

        {isCustomDate && (
          <View style={styles.rangeContainer}>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: theme.primary, backgroundColor: theme.surface }]}
              onPress={() => openDatePicker('start')}
            >
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {format(startDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={16} color={theme.textLight} />

            <TouchableOpacity
              style={[styles.dateButton, { borderColor: theme.primary, backgroundColor: theme.surface }]}
              onPress={() => openDatePicker('end')}
            >
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {format(endDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{'Cargando'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.balanceLabel, { color: theme.textLight }]}>Saldo actual</Text>
        <Text style={[styles.balanceAmount, { color: theme.text }]}>${currentBalance.toLocaleString('es-ES')}</Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/caja/reporte')}
        >
          <Text style={[styles.reportButtonText, { color: theme.primary }]}>Reportes</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.transactionsContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.transactionsHeader}>
          <Text style={[styles.transactionsTitle, { color: theme.text }]}>
            {isCustomDate
              ? 'Transacciones del rango'
              : 'Transacciones de hoy'
            }
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleSyncSales}
            >
              <Ionicons name="sync" size={20} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={loadData}
            >
              <Ionicons name="refresh" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {renderDateFilter()}

        {showDatePicker && (
          <DateTimePicker
            value={datePickerMode === 'start' ? startDate : endDate}
            mode="date"
            onChange={handleDateSelect}
          />
        )}

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id!}
          renderItem={renderTransactionItem}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              {isCustomDate
                ? 'No hay transacciones registradas para este rango'
                : 'No hay transacciones registradas hoy'
              }
            </Text>
          }
        />
      </View>

      {/* Botón flotante para agregar gasto */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.error }]}
        onPress={() => {
          setTransactionType('expense');
          setModalVisible(true);
        }}
      >
        <Ionicons name="wallet" size={28} color={theme.surface} />
      </TouchableOpacity>


      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {transactionType === 'deposit' ? 'Nuevo deposito' :
                  transactionType === 'withdrawal' ? 'Nuevo retiro' : 'Nuevo gasto'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>{'Monto'}</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.background,
                  borderColor: theme.primaryLight,
                  color: theme.text
                }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>{'Descripcion'}</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.background,
                  borderColor: theme.primaryLight,
                  color: theme.text
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder={'Descripcion'}
                placeholderTextColor={theme.textLight}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                submitting && styles.disabledButton
              ]}
              onPress={handleAddTransaction}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.surface} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.surface }]}>{'Guardar'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  reportButtonText: {
    fontWeight: '500',
  },
  transactionsContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  transactionDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    // color applied dynamically
  },
  negativeAmount: {
    // color applied dynamically
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonText: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateFilterContainer: {
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
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
});
