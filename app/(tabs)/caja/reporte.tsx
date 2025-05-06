import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { cashService } from '../../../services/cashService';
import { salesService } from '../../../services/salesService';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import i18n from '@/translations';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';

export default function CashReportScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [netIncome, setNetIncome] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [salesCount, setSalesCount] = useState<number>(0);
  // Add custom date range states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');

  useEffect(() => {
    loadReportData();
  }, [period, startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      let startDateObj;
      const endDateObj = endOfDay(period === 'custom' ? endDate : new Date());
      
      switch (period) {
        case 'today':
          startDateObj = startOfDay(new Date());
          break;
        case 'week':
          startDateObj = startOfDay(subDays(new Date(), 7));
          break;
        case 'month':
          startDateObj = startOfDay(subDays(new Date(), 30));
          break;
        case 'custom':
          startDateObj = startOfDay(startDate);
          break;
        default:
          startDateObj = startOfDay(new Date());
      }
    
      // Obtener datos de transacciones
      const transactions = await cashService.getTransactionsByDateRange(
        startDateObj,
        endDateObj
      );
      
      // Obtener datos de ventas
      const sales = await salesService.getSalesByDateRange(
        startDateObj,
        endDateObj,
      );
      
      // Calcular totales
      let salesTotal = 0;
      let expensesTotal = 0;
      let depositsTotal = 0;
      let withdrawalsTotal = 0;
      
      transactions.forEach(transaction => {
        switch (transaction.type) {
          case 'sale':
            salesTotal += transaction.amount;
            break;
          case 'expense':
            expensesTotal += transaction.amount;
            break;
          case 'deposit':
            depositsTotal += transaction.amount;
            break;
          case 'withdrawal':
            withdrawalsTotal += transaction.amount;
            break;
        }
      });
      
      // Calcular ingresos netos (ventas - gastos)
      const income = salesTotal - expensesTotal;
      
      // Obtener saldo actual
      const balance = await cashService.getCurrentBalance();
      
      setTotalSales(salesTotal);
      setTotalExpenses(expensesTotal);
      setTotalDeposits(depositsTotal);
      setTotalWithdrawals(withdrawalsTotal);
      setNetIncome(income);
      setCurrentBalance(balance);
      setSalesCount(sales.length);
      
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos del reporte');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Add date picker handler
  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerType === 'start') {
        // Validar que la fecha de inicio no sea posterior a la fecha de fin
        if (selectedDate > endDate) {
          // Si la fecha seleccionada es posterior a la fecha de fin, ajustar la fecha de fin
          setEndDate(selectedDate);
        }
        setStartDate(selectedDate);
      } else {
        // Validar que la fecha de fin no sea anterior a la fecha de inicio
        if (selectedDate < startDate) {
          // Si la fecha seleccionada es anterior a la fecha de inicio, ajustar
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
    }
  };

  const handleExportReport = async () => {
    try {
      const dateRange = getDateRangeText();
      
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .date { color: #666; margin-bottom: 20px; }
              .section { margin-bottom: 30px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
              .item { margin-bottom: 10px; }
              .item-row { display: flex; justify-content: space-between; }
              .total { border-top: 2px solid #ddd; padding-top: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Reporte de Caja</div>
              <div class="date">${dateRange}</div>
            </div>

            <div class="section">
              <div class="section-title">Resumen General</div>
              <div class="item">
                <div class="item-row">
                  <span>Saldo Actual:</span>
                  <span>$${currentBalance.toFixed(2)}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Ingresos Netos:</span>
                  <span>$${netIncome.toFixed(2)}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Ventas Realizadas:</span>
                  <span>${salesCount}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Detalles de Transacciones</div>
              <div class="item">
                <div class="item-row">
                  <span>Total Ventas:</span>
                  <span>$${totalSales.toFixed(2)}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Gastos:</span>
                  <span>-$${totalExpenses.toFixed(2)}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Depósitos:</span>
                  <span>$${totalDeposits.toFixed(2)}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Retiros:</span>
                  <span>-$${totalWithdrawals.toFixed(2)}</span>
                </div>
              </div>
              <div class="item total">
                <div class="item-row">
                  <span>Balance Neto:</span>
                  <span>$${netIncome.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style="text-align: center; color: #666; margin-top: 40px;">
              Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });

    } catch (error) {
      console.error('Error al exportar reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte PDF');
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const getDateRangeText = () => {
    const endDateObj = new Date();
    let startDateObj;
    
    switch (period) {
      case 'today':
        return `${i18n.t('common.today')}, ${formatDate(endDateObj)}`;
      case 'week':
        startDateObj = subDays(endDateObj, 7);
        return `${formatDate(startDateObj)} - ${formatDate(endDateObj)}`;
      case 'month':
        startDateObj = subDays(endDateObj, 30);
        return `${formatDate(startDateObj)} - ${formatDate(endDateObj)}`;
      case 'custom':
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      default:
        return i18n.t('common.unknownPeriod');
    }
  };

  // Add custom date range selector component
  const renderCustomDateSelector = () => {
    if (period !== 'custom') return null;
    
    return (
      <View style={styles.customDateContainer}>
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: theme.surface, 
            borderColor: theme.primaryLight 
          }]}
          onPress={() => {
            setDatePickerType('start');
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
          <Text style={[styles.dateButtonText, { color: theme.text }]}>
            {i18n.t('statistics.from')}: {formatDate(startDate)}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: theme.surface, 
            borderColor: theme.primaryLight 
          }]}
          onPress={() => {
            setDatePickerType('end');
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.primary} />
          <Text style={[styles.dateButtonText, { color: theme.text }]}>
            {i18n.t('statistics.to')}: {formatDate(endDate)}
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.periodSelector, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'today' && [styles.activePeriodButton, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setPeriod('today')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: theme.text },
              period === 'today' && [styles.activePeriodButtonText, { color: theme.surface }]
            ]}
          >
            {i18n.t('common.today')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'week' && [styles.activePeriodButton, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setPeriod('week')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: theme.text },
              period === 'week' && [styles.activePeriodButtonText, { color: theme.surface }]
            ]}
          >
            {i18n.t('common.week')}
          </Text>
        </TouchableOpacity>
                
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'custom' && [styles.activePeriodButton, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setPeriod('custom')}
        >
          <Text
            style={[
              styles.periodButtonText,
              { color: theme.text },
              period === 'custom' && [styles.activePeriodButtonText, { color: theme.surface }]
            ]}
          >
            {i18n.t('common.custom')}
          </Text>
        </TouchableOpacity>
      </View>

      {renderCustomDateSelector()}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerType === 'start' ? startDate : endDate}
          mode="date"
          onChange={handleDateSelect}
        />
      )}

      <Text style={[styles.dateRangeText, { color: theme.textLight }]}>{getDateRangeText()}</Text>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { 
          color: theme.text,
          borderBottomColor: theme.background 
        }]}>{i18n.t('common.resume')}</Text>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="cash-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: theme.textLight }]}>{i18n.t('cash.currentBalance')}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>${currentBalance.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: theme.successLight }]}>
            <Ionicons name="trending-up" size={24} color={theme.success} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: theme.textLight }]}>{i18n.t('cash.netIncome')}</Text>
            <Text style={[styles.summaryValue, { 
              color: netIncome >= 0 ? theme.success : theme.error 
            }]}>
              ${netIncome.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="cart-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: theme.textLight }]}>{i18n.t('sales.title')}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{salesCount}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { 
          color: theme.text,
          borderBottomColor: theme.background 
        }]}>{i18n.t('statistics.valuesSummary')}</Text>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('statistics.totalSale')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>${totalSales.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('statistics.totalExpenses')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>-${totalExpenses.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('cash.deposit')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>${totalDeposits.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('cash.withdrawal')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>-${totalWithdrawals.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailItem, styles.totalItem, { 
          borderTopColor: theme.primaryLight 
        }]}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>{i18n.t('statistics.netBalance')}</Text>
          <Text style={[styles.totalValue, { 
            color: netIncome >= 0 ? theme.success : theme.error 
          }]}>
            ${netIncome.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.exportButton, { backgroundColor: theme.primary }]}
        onPress={handleExportReport}
      >
        <Ionicons name="download-outline" size={20} color={theme.surface} />
        <Text style={[styles.exportButtonText, { color: theme.surface }]}>{i18n.t('cash.exportReport')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Add new styles for custom date selector
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    overflow: 'hidden',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriodButton: {
    // backgroundColor applied dynamically
  },
  periodButtonText: {
    fontSize: 14,
    // color applied dynamically
  },
  activePeriodButtonText: {
    // color applied dynamically
    fontWeight: 'bold',
  },
  dateRangeText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalItem: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exportButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 0.48,
    justifyContent: 'center',
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 14,
  },
});