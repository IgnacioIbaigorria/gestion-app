import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { productService } from '../../../services/productService';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n from '@/translations';
// Agregar el import del servicio de caja
import { cashService } from '../../../services/cashService';
import { salesService } from '@/services/salesService';
import { useTheme } from '@/contexts/ThemeContext';

interface Statistics {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  potentialIncome: number;
  investedMoney: number;
  potentialProfit: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalProfit: number;
}

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'monthly' | 'custom'>('all');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [stats, setStats] = useState<Statistics>({
    totalProducts: 0,
    totalValue: 0,
    lowStockProducts: 0,
    potentialIncome: 0,
    investedMoney: 0,
    potentialProfit: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalProfit: 0,
  });

  useEffect(() => {
    loadStatistics();
  }, [filterType, startDate, endDate]);

  // Modify the loadStatistics function to handle negative profits correctly
  // In the loadStatistics function, add debugging logs
  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [products, transactions, sales] = await Promise.all([
        productService.getAllProducts(),
        cashService.getAllTransactions(),
        salesService.getAllSales()
      ]);
      // Add debug logs
      
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Filter transactions based on date range
      const filteredTransactions = transactions.filter((transaction: { date: Date | { toDate: () => Date } | string }) => {
        let transactionDate;
        
        try {
          // Handle different date formats
          if (transaction.date instanceof Date) {
            transactionDate = transaction.date;
          } else if (transaction.date && typeof transaction.date === 'object' && 'toDate' in transaction.date) {
            transactionDate = transaction.date.toDate();
          } else if (transaction.date) {
            // Handle string or timestamp
            transactionDate = new Date(transaction.date);
          } else {
            // Skip transactions without dates
            return false;
          }
          
          switch (filterType) {
            case 'monthly':
              const today = new Date();
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              firstDayOfMonth.setHours(0, 0, 0, 0);
              return transactionDate >= firstDayOfMonth;
            
            case 'custom':
              return transactionDate >= startOfDay && transactionDate <= endOfDay;
            
            default:
              return true;
          }
        } catch (error) {
          console.error('Error processing transaction date:', error, transaction);
          return false; // Skip transactions with invalid dates
        }
      });
  
      // Filter sales based on the same date range with improved error handling
      const filteredSales = sales.filter((sale: { date: Date | { toDate: () => Date } | string }) => {
        let saleDate;
        
        try {
          // Handle different date formats
          if (sale.date instanceof Date) {
            saleDate = sale.date;
          } else if (sale.date && typeof sale.date === 'object' && 'toDate' in sale.date) {
            saleDate = sale.date.toDate();
          } else if (sale.date) {
            // Handle string or timestamp
            saleDate = new Date(sale.date);
          } else {
            // Skip sales without dates
            return false;
          }
          
          switch (filterType) {
            case 'monthly':
              const today = new Date();
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              firstDayOfMonth.setHours(0, 0, 0, 0);
              return saleDate >= firstDayOfMonth;
            
            case 'custom':
              return saleDate >= startOfDay && saleDate <= endOfDay;
            
            default:
              return true;
          }
        } catch (error) {
          console.error('Error processing sale date:', error, sale);
          return false;
        }
      });
  
      // Calculate product statistics
      const statistics = products.reduce<Statistics>((acc, product) => {
        // Calculate total products
        acc.totalProducts += 1;
        
        // Calculate products with low stock
        if (product.quantity < (product.low_stock_threshold || 5)) {
          acc.lowStockProducts += 1;
        }
        
        // Calculate total invested money (cost price * quantity)
        const invested = product.cost_price * product.quantity;
        acc.investedMoney += invested;
        
        // Calculate potential income (selling price * quantity)
        const potential = product.selling_price * product.quantity;
        acc.potentialIncome += potential;
        
        // Calculate total value based on selling prices
        acc.totalValue += potential;
        
        return acc;
      }, {
        totalProducts: 0,
        totalValue: 0,
        lowStockProducts: 0,
        potentialIncome: 0,
        investedMoney: 0,
        potentialProfit: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        totalProfit: 0,
      });
      
      // Calculate potential profit
      statistics.potentialProfit = statistics.potentialIncome - statistics.investedMoney;
      
      // Calculate financial statistics from filtered transactions
      const financialStats = filteredTransactions.reduce((acc: { totalIncome: any; totalExpenses: any; }, transaction: { type: any; amount: any; }) => {
        switch (transaction.type) {
          case 'sale':
            acc.totalIncome += transaction.amount;
            break;
          case 'deposit':
            acc.totalIncome += transaction.amount;
            break;
          case 'expense':
          case 'withdrawal':
            acc.totalExpenses += transaction.amount;
            break;
        }
        return acc;
      }, {
        totalIncome: 0,
        totalExpenses: 0
      });
  
      // Calculate actual profit from sales by analyzing each sale's products
      let actualProfit = 0;
      
      // Create a map of products for quick lookup
      const productsMap = products.reduce<Record<string, any>>((map, product) => {
        map[product.id!] = product;
        return map;
      }, {} as Record<string, any>);
      
      // Track total sales amount separately
      let totalSalesAmount = 0;
            
      // Calculate profit from each sale by comparing selling price to cost price
      filteredSales.forEach((sale: { items: any[]; total_amount: number; }) => {
        // Add the total amount of each sale to the total sales amount
        const saleAmount = Number(sale.total_amount) || 0;
        totalSalesAmount += saleAmount;
        
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach(item => {
            const product = productsMap[item.productId];
            
            if (product) {
              // Ensure all values are valid numbers before calculation
              const itemPrice = Number(item.unitPrice) || 0;
              const costPrice = Number(product.cost_price) || 0;
              const quantity = Number(item.quantity) || 0;
              
              // Calculate profit for this item: (selling price - cost price) * quantity
              const itemProfit = (itemPrice - costPrice) * quantity;
              
              actualProfit += isNaN(itemProfit) ? 0 : itemProfit;
            }
          });
        }
      });
      
      statistics.totalIncome = totalSalesAmount;
      statistics.totalExpenses = isNaN(financialStats.totalExpenses) ? 0 : Number(financialStats.totalExpenses);
      statistics.netIncome = statistics.totalIncome - statistics.totalExpenses;
      
      // Use actual calculated profit instead of percentage estimate
      // Ensure we're storing a valid number
      actualProfit = actualProfit - statistics.totalExpenses;
      statistics.totalProfit = isNaN(actualProfit) ? 0 : Number(actualProfit.toFixed(2));
      
      
      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };
    
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
          // Si la fecha seleccionada es anterior a la fecha de inicio, mostrar un mensaje o ajustar
          // Opción 1: Ajustar automáticamente la fecha de inicio
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  }, [filterType, startDate, endDate]);


  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('statistics.loading')}</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 50; // Ajuste del ancho

  // Modifica la configuración del gráfico para incluir el color de las etiquetas de valores
  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.text,
    labelColor: (opacity = 1) => theme.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "3",
      strokeWidth: "2",
      stroke: theme.primary
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: 'bold',
      fill: theme.text,
    },
    // Añadir esta propiedad para los valores sobre las barras
    propsForValues: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: theme.text, // Color negro o el que prefieras
    },
    barPercentage: 0.7,
    withInnerLines: false, // Quita las líneas internas de la cuadrícula
    withOuterLines: false,
  };

  // Datos para el gráfico de inventario
  const inventoryData = {
    labels: [
      i18n.t('statistics.cost'),
      i18n.t('statistics.sale'),
      i18n.t('statistics.profit')
    ],
    datasets: [{
      data: [
        stats.investedMoney,
        stats.potentialIncome,
        stats.potentialProfit
      ],
      colors: [
        (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,   // Rojo para costos
        (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,  // Azul para ventas
        (opacity = 1) => `rgba(46, 204, 113, ${opacity})`   // Verde para ganancias
      ]
    }],
    legend: [i18n.t('statistics.valuesSummary')]
  };
  
  const renderFilterControls = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('statistics.analysisTitle')}</Text>
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.surface, borderColor: theme.border },
            filterType === 'all' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[
            styles.filterButtonText, 
            { color: theme.text },
            filterType === 'all' && [styles.filterButtonTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('statistics.historic')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.surface, borderColor: theme.border },
            filterType === 'monthly' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterType('monthly')}
        >
          <Text style={[
            styles.filterButtonText, 
            { color: theme.text },
            filterType === 'monthly' && [styles.filterButtonTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('statistics.monthly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.surface, borderColor: theme.border },
            filterType === 'custom' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterType('custom')}
        >
          <Text style={[
            styles.filterButtonText, 
            { color: theme.text },
            filterType === 'custom' && [styles.filterButtonTextActive, { color: theme.surface }]
          ]}>
            {i18n.t('statistics.custom')}
          </Text>
        </TouchableOpacity>
      </View>

      {filterType === 'custom' && (
        <View style={styles.datePickerContainer}>
          <TouchableOpacity
            style={[styles.dateButton, { 
              backgroundColor: theme.background, 
              borderColor: theme.border 
            }]}
            onPress={() => {
              setDatePickerType('start');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: theme.text }]}>
              {i18n.t('statistics.from')}: {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateButton, { 
              backgroundColor: theme.background, 
              borderColor: theme.border 
            }]}
            onPress={() => {
              setDatePickerType('end');
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.dateButtonText, { color: theme.text }]}>
              {i18n.t('statistics.to')}: {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={datePickerType === 'start' ? startDate : endDate}
          mode="date"
          onChange={handleDateSelect}
        />
      )}
    </View>
  );
  // In the financial data section
  const financialData = {
    labels: [
      i18n.t('statistics.income'),
      i18n.t('statistics.expenses'),
      i18n.t('statistics.net'),
      i18n.t('statistics.profit')
    ],
    datasets: [{
      data: [
        isNaN(stats.totalIncome) ? 0 : stats.totalIncome,
        isNaN(stats.totalExpenses) ? 0 : -Math.abs(stats.totalExpenses), // Make expenses always negative for the chart
        isNaN(stats.netIncome) ? 0 : stats.netIncome,
        isNaN(stats.totalProfit) ? 0 : stats.totalProfit
      ],
      // Colors remain the same
      colors: [
        (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,  // Verde para ingresos
        (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,   // Rojo para egresos
        (opacity = 1) => stats.netIncome >= 0 
          ? `rgba(52, 152, 219, ${opacity})`  // Azul para neto positivo
          : `rgba(231, 76, 60, ${opacity})`,  // Rojo para neto negativo
        (opacity = 1) => stats.totalProfit >= 0
          ? `rgba(46, 204, 113, ${opacity})`  // Verde para ganancia positiva
          : `rgba(231, 76, 60, ${opacity})`   // Rojo para ganancia negativa
      ]
    }]
  };

  const hexToRgb = (hex: string) => {
    // Eliminar el # si existe
    hex = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  };
    

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
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{i18n.t('statistics.title')}</Text>
      </View>

      {renderFilterControls()}

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalProducts}</Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('statistics.totalProducts')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.lowStockProducts}</Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('statistics.lowStockProducts')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            ${stats.potentialProfit.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('statistics.potentialProfit')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            ${stats.investedMoney.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('statistics.investedMoney')}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            ${stats.potentialIncome.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textLight }]}>{i18n.t('statistics.potentialIncome')}</Text>
        </View>
      </View>

      <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>{i18n.t('statistics.capitalDistribution')}</Text>
        <PieChart
          data={[
            {
              name: i18n.t('statistics.investment'),
              value: stats.investedMoney,
              color: theme.primaryLight,
              legendFontColor: theme.text,
              legendFontSize: 12,
              legendFontWeight: 'bold',
              valuePrefix: '$',
            },
            {
              name: i18n.t('statistics.profit'),
              value: stats.potentialProfit,
              color: theme.success,
              legendFontColor: theme.text,
              legendFontSize: 12,
              legendFontWeight: 'bold',
              valuePrefix: '$',
            }
          ]}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="value"
          backgroundColor="transparent"
          paddingLeft="0"
          center={[10, -20]}
          absolute
          hasLegend={true}
          avoidFalseZero
        />
      </View>

      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('statistics.inventoryAnalysis')}</Text>
        
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>{i18n.t('statistics.valuesSummary')}</Text>
          <Text style={[styles.chartDescription, { color: theme.textLight }]}>
            {i18n.t('statistics.inventoryComparison')}
          </Text>
          <BarChart
            yAxisLabel="$"
            yAxisSuffix=""
            data={inventoryData}
            width={chartWidth - 30}
            height={200}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            withCustomBarColorFromData={true}
            flatColor={true}
            fromZero
            withInnerLines={false}
            style={{...styles.chart, marginLeft: 0}}
          />
          <View style={[styles.legendContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.totalCost')}:</Text>
              <Text style={[styles.legendValue, { color: theme.text }]}>${stats.investedMoney.toFixed(2)}</Text>
            </View>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.totalSale')}:</Text>
              <Text style={[styles.legendValue, { color: theme.text }]}>${stats.potentialIncome.toFixed(2)}</Text>
            </View>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.expectedProfit')}:</Text>
              <Text style={[styles.legendValue, { color: theme.success }]}>
                ${stats.potentialProfit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('statistics.financialBalance')}</Text>
        
        <View style={[styles.chartContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>{i18n.t('statistics.financialSummary')}</Text>
          <Text style={[styles.chartDescription, { color: theme.textLight }]}>
            {i18n.t('statistics.financialAnalysis')}
          </Text>
          <BarChart
            yAxisLabel="$"
            yAxisSuffix=""
            data={financialData}
            width={chartWidth - 60}
            height={200}
            chartConfig={{
              ...chartConfig,
              decimalPlaces: 0,
            }}          
            style={{
              ...styles.chart,
              marginVertical: 16,
            }}
            showValuesOnTopOfBars
            fromZero
            withCustomBarColorFromData={true}
            flatColor={true}
            withInnerLines={false}
          />
          <View style={[styles.legendContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.totalIncome')}:</Text>
              <Text style={[styles.legendValue, { color: theme.success }]}>
                ${stats.totalIncome.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.totalExpenses')}:</Text>
              <Text style={[styles.legendValue, { color: theme.error }]}>
                -${stats.totalExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.netBalance')}:</Text>
              <Text style={[styles.legendValue, { 
                color: stats.netIncome >= 0 ? theme.success : theme.error 
              }]}>
                ${stats.netIncome.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.legendItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.legendLabel, { color: theme.text }]}>{i18n.t('statistics.estimatedProfit')}:</Text>
              <Text style={[styles.legendValue, { 
                color: stats.totalProfit >= 0 ? theme.primary : theme.error 
              }]}>
                ${stats.totalProfit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  highlightCard: {
    // backgroundColor applied dynamically
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  chartDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  balanceContainer: {
    padding: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderRadius: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterButtonActive: {
    // backgroundColor applied dynamically
  },
  filterButtonText: {
    fontSize: 14,
  },
  filterButtonTextActive: {
    fontWeight: '600',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 14,
  },
});