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
  const [salesDetails, setSalesDetails] = useState<any[]>([]);
  const [expensesDetails, setExpensesDetails] = useState<any[]>([]);

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

      setSalesDetails(
        sales.map(sale => ({
          date: sale.date,
          amount: sale.total_amount,
          items: sale.items,
          description: sale.notes || ''
        }))
      );
      setExpensesDetails(
        transactions
          .filter(t => t.type === 'expense')
          .map(exp => ({
            date: exp.date,
            amount: exp.amount,
            description: exp.description || 'Gasto'
          }))
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

      // Generar tabla de ventas
      const salesTable = salesDetails.length === 0
        ? '<div class="item-row"><span>No hay ventas en este periodo.</span></div>'
        : salesDetails.map(sale => `
          <div class="sale-block">
            <div class="sale-header">
              <span class="sale-date">${format(sale.date, 'dd/MM/yyyy HH:mm', { locale: es })}</span>
              <span class="sale-amount">$${sale.amount.toLocaleString('es-ES')}</span>
            </div>
            ${sale.description ? `<div class="sale-desc">${sale.description}</div>` : ''}
            ${sale.items && sale.items.length > 0 ? `
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P. Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale.items.map((item: any) => `
                    <tr>
                      <td>${item.productName}</td>
                      <td style="text-align:center;">x${item.quantity}</td>
                      <td style="text-align:center;">$${item.unitPrice.toLocaleString('es-ES')}</td>
                      <td style="text-align:center;">$${item.subtotal.toLocaleString('es-ES')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `).join('');

      // Generar tabla de gastos
      const expensesTable = expensesDetails.length === 0
        ? '<div class="item-row"><span>No hay gastos en este periodo.</span></div>'
        : expensesDetails.map(exp => `
          <div class="expense-block">
            <div class="expense-header">
              <span class="expense-date">${format(exp.date, 'dd/MM/yyyy HH:mm', { locale: es })}</span>
              <span class="expense-amount" style="color:#D32F2F;">-$${exp.amount.toLocaleString('es-ES')}</span>
            </div>
            ${exp.description ? `<div class="expense-desc">${exp.description}</div>` : ''}
            ${exp.items && exp.items.length > 0 ? `
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Detalle</th>
                    <th>Cant.</th>
                    <th>P. Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${exp.items.map((item: any) => `
                    <tr>
                      <td>${item.detail}</td>
                      <td style="text-align:center;">x${item.quantity}</td>
                      <td style="text-align:center;">$${item.unitPrice}</td>
                      <td style="text-align:center;">$${item.subtotal}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `).join('');

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
              .sale-block, .expense-block { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #A5B4FC; }
              .sale-header, .expense-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
              .sale-date, .expense-date { font-weight: bold; color: #5B6EE1; font-size: 15px; }
              .sale-amount, .expense-amount { font-weight: bold; color: #212121; font-size: 16px; }
              .sale-desc, .expense-desc { color: #757575; margin-bottom: 6px; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
              .items-table th, .items-table td { border: 1px solid #E0E0E0; padding: 4px 6px; font-size: 13px; }
              .items-table th { background: #F3F4FB; font-weight: bold; }
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
                  <span>$${currentBalance.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Ingresos Netos:</span>
                  <span>$${netIncome.toLocaleString('es-ES')}</span>
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
                  <span>$${totalSales.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Gastos:</span>
                  <span>-$${totalExpenses.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Depósitos:</span>
                  <span>$${totalDeposits.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div class="item">
                <div class="item-row">
                  <span>Total Retiros:</span>
                  <span>-$${totalWithdrawals.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div class="item total">
                <div class="item-row">
                  <span>Balance Neto:</span>
                  <span>$${netIncome.toLocaleString('es-ES')}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Detalle de Ventas</div>
              ${salesTable}
            </div>
            <div class="section">
              <div class="section-title">Detalle de Gastos</div>
              ${expensesTable}
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
        return `${formatDate(endDateObj)}`;
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
            <Text style={[styles.summaryValue, { color: theme.text }]}>${currentBalance.toLocaleString('es-ES')}</Text>
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
              ${netIncome.toLocaleString('es-ES')}
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

            {/* Detalle de Ventas */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.background }]}>
          Detalle de Ventas
        </Text>
        {salesDetails.length === 0 ? (
          <Text style={{ color: theme.textLight }}>No hay ventas en este periodo.</Text>
        ) : (
          salesDetails.map((sale, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: 18,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.primaryLight,
              }}
            >
              {/* Cabecera de la venta */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', color: theme.primary, fontSize: 15 }}>
                  {format(sale.date, 'dd/MM/yyyy HH:mm', { locale: es })}
                </Text>
                <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 16 }}>
                  ${sale.amount.toLocaleString('es-ES')}
                </Text>
              </View>
              {/* Descripción si existe */}
              {sale.description ? (
                <Text style={{ color: theme.textLight, marginBottom: 6 }}>{sale.description}</Text>
              ) : null}
              {/* Tabla de items */}
              {sale.items && sale.items.length > 0 && (
                <View style={{ marginTop: 4, marginLeft: 2 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <Text style={{ flex: 2, fontWeight: 'bold', color: theme.text }}>Producto</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>Cant.</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>P. Unit.</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>Subtotal</Text>
                  </View>
                  {sale.items.map((item: { productName: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; quantity: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; unitPrice: number; subtotal: number; }, itemIdx: React.Key | null | undefined) => (
                    <View key={itemIdx} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <Text style={{ flex: 2, color: theme.text }}>{item.productName}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>x{item.quantity}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>${item.unitPrice.toLocaleString('es-ES')}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>${item.subtotal.toLocaleString('es-ES')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Detalle de Gastos */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text, borderBottomColor: theme.background }]}>
          Detalle de Gastos
        </Text>
        {expensesDetails.length === 0 ? (
          <Text style={{ color: theme.textLight }}>No hay gastos en este periodo.</Text>
        ) : (
          expensesDetails.map((exp, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: 18,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.primaryLight,
              }}
            >
              {/* Cabecera del gasto */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', color: theme.error, fontSize: 15 }}>
                  {format(exp.date, 'dd/MM/yyyy HH:mm', { locale: es })}
                </Text>
                <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 16 }}>
                  -${exp.amount.toLocaleString('es-ES')}
                </Text>
              </View>
              {/* Descripción si existe */}
              {exp.description ? (
                <Text style={{ color: theme.textLight, marginBottom: 6 }}>{exp.description}</Text>
              ) : null}
              {/* Tabla de items si existieran */}
              {exp.items && exp.items.length > 0 && (
                <View style={{ marginTop: 4, marginLeft: 2 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <Text style={{ flex: 2, fontWeight: 'bold', color: theme.text }}>Detalle</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>Cant.</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>P. Unit.</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>Subtotal</Text>
                  </View>
                  {exp.items.map((item: { detail: string; quantity: number; unitPrice: number; subtotal: number }, itemIdx: number) => (
                    <View key={itemIdx} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <Text style={{ flex: 2, color: theme.text }}>{item.detail}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>x{item.quantity}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>${item.unitPrice}</Text>
                      <Text style={{ flex: 1, color: theme.text, textAlign: 'center' }}>${item.subtotal}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>


      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { 
          color: theme.text,
          borderBottomColor: theme.background 
        }]}>{i18n.t('statistics.valuesSummary')}</Text>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('statistics.totalSale')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>${totalSales.toLocaleString('es-ES')}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('statistics.totalExpenses')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>-${totalExpenses.toLocaleString('es-ES')}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('cash.deposit')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>${totalDeposits.toLocaleString('es-ES')}</Text>
        </View>
        
        <View style={[styles.detailItem, { borderBottomColor: theme.background }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>{i18n.t('cash.withdrawal')}</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>-${totalWithdrawals.toLocaleString('es-ES')}</Text>
        </View>
        
        <View style={[styles.detailItem, styles.totalItem, { 
          borderTopColor: theme.primaryLight 
        }]}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>{i18n.t('statistics.netBalance')}</Text>
          <Text style={[styles.totalValue, { 
            color: netIncome >= 0 ? theme.success : theme.error 
          }]}>
            ${netIncome.toLocaleString('es-ES')}
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