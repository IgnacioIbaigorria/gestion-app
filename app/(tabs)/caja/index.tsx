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
import i18n from '../../../translations';
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
  // Add date filter states
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [filterDate, isCustomDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let transactionsData;
      if (isCustomDate) {
        // If custom date is selected, get transactions for that specific date
        const startDate = startOfDay(filterDate);
        const endDate = endOfDay(filterDate);
        
        // Use JavaScript Date objects directly instead of Timestamp
        transactionsData = await cashService.getTransactionsByDateRange(
          startDate,
          endDate
        );
      } else {
        // Otherwise get today's transactions
        transactionsData = await cashService.getTodayTransactions();
      }
      
      setTransactions(transactionsData);
      
      const balance = await cashService.getCurrentBalance();
      setCurrentBalance(balance);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('cash.errorLoadData'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSales = async () => {
    try {
      setLoading(true);
      const syncedCount = await salesService.syncSalesWithCashTransactions();
      
      // Reload data after sync
      await loadData();
      
      // Show success message
      Alert.alert(
        i18n.t('common.success'),
        `${syncedCount} ${i18n.t('cash.salesSynced')}`
      );
    } catch (error) {
      console.error('Error syncing sales:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('cash.syncError'));
    } finally {
      setLoading(false);
    }
  };


  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFilterDate(selectedDate);
      setIsCustomDate(true);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return i18n.t('common.unknownDate');
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return i18n.t('common.invalidDate');
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
    return i18n.t(`cash.${type}`);
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('cash.errorValidAmount'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('cash.errorDescription'));
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
      
      Alert.alert(i18n.t('common.success'), i18n.t('cash.successTransaction'));
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('cash.errorTransaction'));
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
      i18n.t('common.error'),
      i18n.t('cash.cannotDeleteSale'),
      [{ text: i18n.t('common.ok') }]
    );
    return;
  }

  Alert.alert(
    i18n.t('common.confirm'),
    i18n.t('cash.confirmDelete'),
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
            await cashService.deleteTransaction(transaction.id!);
            loadData();
            Alert.alert(i18n.t('common.success'), i18n.t('cash.deleteSuccess'));
          } catch (error) {
            console.error('Error deleting transaction:', error);
            Alert.alert(i18n.t('common.error'), i18n.t('cash.deleteError'));
          } finally {
            setLoading(false);
          }
        }
      }
    ]
  );
};

// Modify the renderTransactionItem function to include a delete button
const renderTransactionItem = ({ item }: { item: CashTransaction }) => (
  <View style={[styles.transactionItem, { borderBottomColor: theme.background }]}>
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
      ${item.amount.toFixed(2)}
    </Text>
    
    {/* Add delete button for non-sale transactions */}
    {item.type !== 'sale' && (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTransaction(item)}
      >
        <Ionicons name="trash-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    )}
  </View>
);


  const renderDateFilter = () => {
    return (
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            { borderColor: theme.primary },
            !isCustomDate && [styles.activeDateButton, { backgroundColor: theme.primary }]
          ]}
          onPress={() => {
            setIsCustomDate(false);
            setFilterDate(new Date());
          }}
        >
          <Text
            style={[
              styles.dateFilterText,
              { color: theme.primary },
              !isCustomDate && [styles.activeDateText, { color: theme.surface }]
            ]}
          >
            {i18n.t('common.today')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            { borderColor: theme.primary },
            isCustomDate && [styles.activeDateButton, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons 
            name="calendar-outline" 
            size={16} 
            color={isCustomDate ? theme.surface : theme.primary} 
          />
          <Text
            style={[
              styles.dateFilterText,
              { color: theme.primary },
              isCustomDate && [styles.activeDateText, { color: theme.surface }]
            ]}
          >
            {isCustomDate 
              ? format(filterDate, 'dd/MM/yyyy', { locale: es })
              : i18n.t('common.selectDate')
            }
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('cash.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.balanceLabel, { color: theme.textLight }]}>{i18n.t('cash.currentBalance')}</Text>
        <Text style={[styles.balanceAmount, { color: theme.text }]}>${currentBalance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/caja/reporte')}
        >
          <Text style={[styles.reportButtonText, { color: theme.primary }]}>{i18n.t('cash.reports')}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.transactionsContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.transactionsHeader}>
          <Text style={[styles.transactionsTitle, { color: theme.text }]}>
            {isCustomDate 
              ? i18n.t('cash.dateTransactions') 
              : i18n.t('cash.todayTransactions')
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
            value={filterDate}
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
                ? i18n.t('cash.emptyDateTransactions') 
                : i18n.t('cash.emptyTransactions')
              }
            </Text>
          }
        />
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setTransactionType('deposit');
            setModalVisible(true);
          }}
        >
          <Ionicons name="arrow-down" size={24} color={theme.surface} />
          <Text style={[styles.actionButtonText, { color: theme.surface }]}>{i18n.t('cash.deposit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.warning }]}
          onPress={() => {
            setTransactionType('withdrawal');
            setModalVisible(true);
          }}
        >
          <Ionicons name="arrow-up" size={24} color={theme.surface} />
          <Text style={[styles.actionButtonText, { color: theme.surface }]}>{i18n.t('cash.withdrawal')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.error }]}
          onPress={() => {
            setTransactionType('expense');
            setModalVisible(true);
          }}
        >
          <Ionicons name="wallet" size={24} color={theme.surface} />
          <Text style={[styles.actionButtonText, { color: theme.surface }]}>{i18n.t('cash.expense')}</Text>
        </TouchableOpacity>
      </View>

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
                {transactionType === 'deposit' ? i18n.t('cash.newDeposit') : 
                 transactionType === 'withdrawal' ? i18n.t('cash.newWithdrawal') : i18n.t('cash.newExpense')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>{i18n.t('cash.amount')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.primaryLight,
                  color: theme.text
                }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>{i18n.t('cash.description')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.primaryLight,
                  color: theme.text
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder={i18n.t('cash.descriptionPlaceholder')}
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
                <Text style={[styles.submitButtonText, { color: theme.surface }]}>{i18n.t('cash.save')}</Text>
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
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    flex: 0.48,
  },
  activeDateButton: {
    // backgroundColor applied dynamically
  },
  dateFilterText: {
    fontWeight: '500',
    marginLeft: 4,
  },
  activeDateText: {
    // color applied dynamically
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});