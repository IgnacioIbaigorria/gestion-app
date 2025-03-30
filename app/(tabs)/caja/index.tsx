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
import Colors from '../../../constants/Colors';
import { CashTransaction } from '../../../models/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import i18n from '../../../translations';

export default function CashRegisterScreen() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'expense'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const transactionsData = await cashService.getTodayTransactions();
      setTransactions(transactionsData);
      
      const balance = await cashService.getCurrentBalance();
      setCurrentBalance(balance);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos de caja');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha inválida';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Ionicons name="cart" size={24} color={Colors.success} />;
      case 'expense':
        return <Ionicons name="wallet" size={24} color={Colors.error} />;
      case 'deposit':
        return <Ionicons name="arrow-down" size={24} color={Colors.primary} />;
      case 'withdrawal':
        return <Ionicons name="arrow-up" size={24} color={Colors.warning} />;
      default:
        return <Ionicons name="help-circle" size={24} color={Colors.textLight} />;
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
        date: Timestamp.now(),
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

  const renderTransactionItem = ({ item }: { item: CashTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {getTransactionIcon(item.type)}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        <Text style={styles.transactionType}>
          {getTransactionTypeText(item.type)}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          (item.type === 'expense' || item.type === 'withdrawal')
            ? styles.negativeAmount
            : styles.positiveAmount
        ]}
      >
        {(item.type === 'expense' || item.type === 'withdrawal') ? '-' : '+'}
        ${item.amount.toFixed(2)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando datos de caja...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Actual</Text>
        <Text style={styles.balanceAmount}>${currentBalance.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/caja/reporte')}
        >
          <Text style={styles.reportButtonText}>Ver Reportes</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>Transacciones de Hoy</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id!}
          renderItem={renderTransactionItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No hay transacciones registradas hoy.
            </Text>
          }
        />
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.primary }]}
          onPress={() => {
            setTransactionType('deposit');
            setModalVisible(true);
          }}
        >
          <Ionicons name="arrow-down" size={24} color={Colors.surface} />
          <Text style={styles.actionButtonText}>Depósito</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.warning }]}
          onPress={() => {
            setTransactionType('withdrawal');
            setModalVisible(true);
          }}
        >
          <Ionicons name="arrow-up" size={24} color={Colors.surface} />
          <Text style={styles.actionButtonText}>Retiro</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.error }]}
          onPress={() => {
            setTransactionType('expense');
            setModalVisible(true);
          }}
        >
          <Ionicons name="wallet" size={24} color={Colors.surface} />
          <Text style={styles.actionButtonText}>Gasto</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionType === 'deposit' ? 'Nuevo Depósito' : 
                 transactionType === 'withdrawal' ? 'Nuevo Retiro' : 'Nuevo Gasto'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Monto</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Ingresa una descripción..."
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.disabledButton
              ]}
              onPress={handleAddTransaction}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Guardar</Text>
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
    backgroundColor: Colors.background,
    padding: 16,
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
  balanceCard: {
    backgroundColor: Colors.surface,
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
    color: Colors.textLight,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  reportButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  refreshButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
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
    color: Colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: Colors.success,
  },
  negativeAmount: {
    color: Colors.error,
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
    color: Colors.surface,
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
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  submitButton: {
    backgroundColor: Colors.primary,
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
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});