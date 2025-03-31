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
import Colors from '../../../constants/Colors';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import i18n from '@/translations';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';


export default function CashReportScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [netIncome, setNetIncome] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [salesCount, setSalesCount] = useState<number>(0);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      let startDate;
      const endDate = endOfDay(new Date());
      
      switch (period) {
        case 'today':
          startDate = startOfDay(new Date());
          break;
        case 'week':
          startDate = startOfDay(subDays(new Date(), 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(new Date(), 30));
          break;
        default:
          startDate = startOfDay(new Date());
      }
    
      // Obtener datos de transacciones
      const transactions = await cashService.getTransactionsByDateRange(
        new Timestamp(Math.floor(startDate.getTime() / 1000), 0),
        new Timestamp(Math.floor(endDate.getTime() / 1000), 0)
      );
      
      // Obtener datos de ventas
      const sales = await salesService.getSalesByDateRange(
        new Timestamp(Math.floor(startDate.getTime() / 1000), 0),
        new Timestamp(Math.floor(endDate.getTime() / 1000), 0)
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
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        return `Hoy, ${formatDate(endDate)}`;
      case 'week':
        startDate = subDays(endDate, 7);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'month':
        startDate = subDays(endDate, 30);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      default:
        return 'Período desconocido';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando reporte...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reporte de Caja</Text>
      </View>

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'today' && styles.activePeriodButton
          ]}
          onPress={() => setPeriod('today')}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === 'today' && styles.activePeriodButtonText
            ]}
          >
            Hoy
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'week' && styles.activePeriodButton
          ]}
          onPress={() => setPeriod('week')}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === 'week' && styles.activePeriodButtonText
            ]}
          >
            Semana
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'month' && styles.activePeriodButton
          ]}
          onPress={() => setPeriod('month')}
        >
          <Text
            style={[
              styles.periodButtonText,
              period === 'month' && styles.activePeriodButtonText
            ]}
          >
            Mes
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.dateRangeText}>{getDateRangeText()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>
        
        <View style={styles.summaryItem}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="cash-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Saldo Actual</Text>
            <Text style={styles.summaryValue}>${currentBalance.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="trending-up" size={24} color={Colors.success} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Ingresos Netos</Text>
            <Text style={[styles.summaryValue, { color: netIncome >= 0 ? Colors.success : Colors.error }]}>
              ${netIncome.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="cart-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Ventas Realizadas</Text>
            <Text style={styles.summaryValue}>{salesCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles</Text>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Ventas</Text>
          <Text style={styles.detailValue}>${totalSales.toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Gastos</Text>
          <Text style={styles.detailValue}>-${totalExpenses.toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Depósitos</Text>
          <Text style={styles.detailValue}>${totalDeposits.toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Retiros</Text>
          <Text style={styles.detailValue}>-${totalWithdrawals.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailItem, styles.totalItem]}>
          <Text style={styles.totalLabel}>Balance Neto</Text>
          <Text style={[styles.totalValue, { color: netIncome >= 0 ? Colors.success : Colors.error }]}>
            ${netIncome.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExportReport}
        >
        <Ionicons name="download-outline" size={20} color={Colors.surface} />
        <Text style={styles.exportButtonText}>Exportar Reporte</Text>
      </TouchableOpacity>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    overflow: 'hidden',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  activePeriodButtonText: {
    color: Colors.surface,
  },
  dateRangeText: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  totalItem: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryLight,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  exportButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});