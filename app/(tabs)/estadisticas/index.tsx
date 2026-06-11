import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { productService } from '../../../services/productService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cashService } from '../../../services/cashService';
import { salesService } from '@/services/salesService';
import { useTheme } from '@/contexts/ThemeContext';
import { eachDayOfInterval, format, isSameDay, subDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

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
  balanceHistory: { date: Date; balance: number; }[];
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
    balanceHistory: [],
  });

  useEffect(() => {
    loadStatistics();
  }, [filterType, startDate, endDate]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [products, transactions, sales] = await Promise.all([
        productService.getAllProducts(),
        cashService.getAllTransactions(),
        salesService.getAllSales()
      ]);

      let balanceHistory: { date: Date; balance: number }[] = [];


      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Filter transactions based on date range
      const filteredTransactions = transactions.filter((transaction: { date: Date }) => {
        const transactionDate = transaction.date;
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
      });

      // Filter sales based on the same date range
      const filteredSales = sales.filter((sale: { date: Date }) => {
        const saleDate = sale.date;

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
      });
      const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      let startDateForChart: Date;
      let endDateForChart = new Date();

      switch (filterType) {
        case 'monthly':
          const today = new Date();
          startDateForChart = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'custom':
          startDateForChart = startOfDay;
          endDateForChart = endOfDay;
          break;
        default:
          if (sortedTransactions.length > 30) {
            startDateForChart = subDays(new Date(), 30);
          } else if (sortedTransactions.length > 0) {
            const firstTransaction = sortedTransactions[0];
            const firstDate = firstTransaction.date instanceof Date
              ? firstTransaction.date
              : new Date(firstTransaction.date);
            startDateForChart = firstDate;
          } else {
            startDateForChart = subDays(new Date(), 7);
          }
      }
      const daysInRange = eachDayOfInterval({
        start: startDateForChart,
        end: endDateForChart
      });

      let runningBalance = 0;

      balanceHistory.push({
        date: daysInRange[0],
        balance: runningBalance
      });
      for (const transaction of sortedTransactions) {
        const transactionDate = transaction.date instanceof Date
          ? transaction.date
          : new Date(transaction.date);

        switch (transaction.type) {
          case 'sale':
          case 'deposit':
            runningBalance += transaction.amount;
            break;
          case 'expense':
          case 'withdrawal':
            runningBalance -= transaction.amount;
            break;
        }

        const existingEntry = balanceHistory.find(entry =>
          isSameDay(entry.date, transactionDate)
        );

        if (existingEntry) {
          existingEntry.balance = runningBalance;
        } else {
          const insertIndex = balanceHistory.findIndex(entry =>
            entry.date.getTime() > transactionDate.getTime()
          );

          if (insertIndex >= 0) {
            balanceHistory.splice(insertIndex, 0, {
              date: transactionDate,
              balance: runningBalance
            });
          } else {
            balanceHistory.push({
              date: transactionDate,
              balance: runningBalance
            });
          }
        }
      }
      balanceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

      const completeBalanceHistory: typeof balanceHistory = [];
      let lastBalance = 0;

      for (const day of daysInRange) {
        const existingEntry = balanceHistory.find(entry =>
          isSameDay(entry.date, day)
        );

        if (existingEntry) {
          lastBalance = existingEntry.balance;
          completeBalanceHistory.push(existingEntry);
        } else {
          completeBalanceHistory.push({
            date: day,
            balance: lastBalance
          });
        }
      }


      const statistics = products.reduce<Statistics>((acc, product) => {
        acc.totalProducts += 1;

        if (product.quantity < (product.low_stock_threshold || 5)) {
          acc.lowStockProducts += 1;
        }

        const invested = product.cost_price * product.quantity;
        acc.investedMoney += invested;

        const potential = product.selling_price * product.quantity;
        acc.potentialIncome += potential;

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
        balanceHistory: [],
      });

      statistics.potentialProfit = statistics.potentialIncome - statistics.investedMoney;

      const financialStats = filteredTransactions.reduce((acc: { totalIncome: any; totalExpenses: any; }, transaction: { type: any; amount: any; }) => {
        switch (transaction.type) {
          case 'sale':
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

      let actualProfit = 0;

      const productsMap = products.reduce<Record<string, any>>((map, product) => {
        map[product.id!] = product;
        return map;
      }, {} as Record<string, any>);

      filteredSales.forEach((sale: { items: any[]; }) => {
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach(item => {
            const product = productsMap[item.productId];

            if (product) {
              const itemPrice = Number(product.selling_price) || 0;
              const costPrice = Number(product.cost_price) || 0;
              const quantity = Number(item.quantity) || 0;

              const itemProfit = (itemPrice - costPrice) * quantity;

              actualProfit += isNaN(itemProfit) ? 0 : itemProfit;
            }
          });
        }
      });

      statistics.totalIncome = isNaN(financialStats.totalIncome) ? 0 : Number(financialStats.totalIncome);
      statistics.totalExpenses = isNaN(financialStats.totalExpenses) ? 0 : Number(financialStats.totalExpenses);
      statistics.netIncome = statistics.totalIncome - statistics.totalExpenses;
      statistics.balanceHistory = completeBalanceHistory;

      statistics.totalProfit = isNaN(actualProfit) ? 0 : Number(actualProfit);

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
        <ThemedText style={{ marginTop: 12 }}>Cargando...</ThemedText>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Standard padding (24 * 2)

  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.primary,
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: theme.primary
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '500',
    },
    propsForValues: {
      fontSize: 10,
      fontWeight: '500',
    },
    barPercentage: 0.7,
    withInnerLines: true,
    withOuterLines: false,
  };

  const inventoryData = {
    labels: [
      'Costo',
      'Venta',
      'Beneficio'
    ],
    datasets: [{
      data: [
        stats.investedMoney,
        stats.potentialIncome,
        stats.potentialProfit
      ],
      colors: [
        (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,   // Red 500
        (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,  // Blue 500
        (opacity = 1) => `rgba(16, 185, 129, ${opacity})`   // Emerald 500
      ]
    }],
  };

  const renderFilterControls = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterButtons}>
        {(['all', 'monthly', 'custom'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              filterType === type && { backgroundColor: theme.primary },
              filterType !== type && { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
            ]}
            onPress={() => setFilterType(type)}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.filterButtonText,
                filterType === type ? { color: '#FFF' } : { color: theme.textSecondary }
              ]}
            >
              {type === 'all' ? 'Historico' :
                type === 'monthly' ? 'Mensual' :
                  'Personalizado'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {filterType === 'custom' && (
        <View style={styles.datePickerContainer}>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              setDatePickerType('start');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
            <ThemedText style={{ fontSize: 13 }}>{startDate.toLocaleDateString()}</ThemedText>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={16} color={theme.textLight} />
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              setDatePickerType('end');
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
            <ThemedText style={{ fontSize: 13 }}>{endDate.toLocaleDateString()}</ThemedText>
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

  const financialData = {
    labels: [
      'Ingreso',
      'Gasto',
      'Neto',
      'Beneficio'
    ],
    datasets: [{
      data: [
        isNaN(stats.totalIncome) ? 0 : stats.totalIncome,
        isNaN(stats.totalExpenses) ? 0 : -Math.abs(stats.totalExpenses),
        isNaN(stats.netIncome) ? 0 : stats.netIncome,
        isNaN(stats.totalProfit) ? 0 : stats.totalProfit
      ],
      colors: [
        (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        (opacity = 1) => stats.netIncome >= 0
          ? `rgba(59, 130, 246, ${opacity})`
          : `rgba(239, 68, 68, ${opacity})`,
        (opacity = 1) => stats.totalProfit >= 0
          ? `rgba(16, 185, 129, ${opacity})`
          : `rgba(239, 68, 68, ${opacity})`
      ]
    }]
  };

  const renderBalanceHistoryChart = () => {
    if (stats.balanceHistory.length < 2) {
      return (
        <Card variant="outlined" style={styles.chartCard}>
          <ThemedText type="defaultSemiBold" style={styles.chartTitle}>Historial de saldo</ThemedText>
          <ThemedText style={{ color: theme.textLight, textAlign: 'center', marginVertical: 20 }}>
            No hay suficientes datos para mostrar el historial.
          </ThemedText>
        </Card>
      );
    }

    const maxDataPoints = 6;
    let displayLabels: string[];
    let displayData: number[];

    if (stats.balanceHistory.length > maxDataPoints) {
      const step = Math.ceil(stats.balanceHistory.length / maxDataPoints);
      const reduced = stats.balanceHistory.filter((_, index) => index % step === 0);

      if (reduced[reduced.length - 1] !== stats.balanceHistory[stats.balanceHistory.length - 1]) {
        reduced.push(stats.balanceHistory[stats.balanceHistory.length - 1]);
      }

      while (reduced.length > maxDataPoints) {
        reduced.splice(1, 1);
      }

      displayLabels = reduced.map(item => format(item.date, 'dd/MM'));
      displayData = reduced.map(item => item.balance);
    } else {
      displayLabels = stats.balanceHistory.map(item => format(item.date, 'dd/MM'));
      displayData = stats.balanceHistory.map(item => item.balance);
    }

    const balanceData = {
      labels: displayLabels,
      datasets: [
        {
          data: displayData,
          color: (opacity = 1) => theme.primary,
          strokeWidth: 2
        }
      ],
      legend: ['Saldo']
    };

    return (
      <Card variant="elevated" style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <ThemedText type="defaultSemiBold" style={styles.chartTitle}>Historial de saldo</ThemedText>
            <ThemedText style={styles.chartSubtitle}>Evolución en el tiempo</ThemedText>
          </View>
          <Ionicons name="trending-up-outline" size={24} color={theme.primary} />
        </View>

        <LineChart
          data={balanceData}
          width={chartWidth - 32} // Card padding
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => theme.primary,
          }}
          bezier
          style={styles.chart}
          yAxisLabel="$"
          yAxisSuffix=""
          fromZero
          withInnerLines
          withOuterLines={false}
          withVerticalLines={false}
        />
      </Card>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title">Estadísticas</ThemedText>
        </View>

        {renderFilterControls()}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title={'Total de productos'}
              value={stats.totalProducts}
              icon="cube-outline"
              color={theme.info}
              style={{ flex: 1 }}
            />
            <StatCard
              title={'Productos con stock bajo'}
              value={stats.lowStockProducts}
              icon="alert-circle-outline"
              color={theme.warning}
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title={'Posible beneficio'}
              value={`$${stats.potentialProfit.toLocaleString('es-ES')}`}
              icon="cash-outline"
              color={theme.success}
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title={'Invertido'}
              value={`$${stats.investedMoney.toLocaleString('es-ES')}`}
              icon="wallet-outline"
              color={theme.error}
              style={{ flex: 1 }}
            />
            <StatCard
              title={'Posible ingreso'}
              value={`$${stats.potentialIncome.toLocaleString('es-ES')}`}
              icon="trending-up-outline"
              color={theme.accent}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.chartTitle}>Distribución de capital</ThemedText>
              <ThemedText style={styles.chartSubtitle}>Inversión vs. Ganancia</ThemedText>
            </View>
            <Ionicons name="pie-chart-outline" size={24} color={theme.accent} />
          </View>

          <PieChart
            data={[
              {
                name: 'Inversión',
                value: stats.investedMoney,
                color: theme.error, // Usamos rojo para inversión/costo
                legendFontColor: theme.textSecondary,
                legendFontSize: 12,
                legendFontWeight: '600',
              },
              {
                name: 'Beneficio',
                value: stats.potentialProfit,
                color: theme.success, // Verde para ganancia
                legendFontColor: theme.textSecondary,
                legendFontSize: 12,
                legendFontWeight: '600',
              }
            ]}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[0, 0]}
            absolute
            hasLegend={true}
          />
        </Card>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.chartTitle}>Análisis de inventario</ThemedText>
              <ThemedText style={styles.chartSubtitle}>Resumen de valores</ThemedText>
            </View>
            <Ionicons name="bar-chart-outline" size={24} color={theme.info} />
          </View>

          <BarChart
            yAxisLabel="$"
            yAxisSuffix=""
            data={inventoryData}
            width={chartWidth - 32}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            yLabelsOffset={8}
            withCustomBarColorFromData={true}
            flatColor={true}
            fromZero
            withInnerLines
            style={styles.chart}
          />
        </Card>

        {renderBalanceHistoryChart()}

        <Card variant="elevated" style={styles.balanceContainer}>
          <View style={styles.chartHeader}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.chartTitle}>Balance financiero</ThemedText>
              <ThemedText style={styles.chartSubtitle}>Análisis financiero</ThemedText>
            </View>
            <Ionicons name="calculator-outline" size={24} color={theme.success} />
          </View>

          <BarChart
            yAxisLabel="$"
            yAxisSuffix=""
            data={financialData}
            width={chartWidth - 32}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            withCustomBarColorFromData={true}
            flatColor={true}
            fromZero
            withInnerLines
            style={styles.chart}
          />

          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
              <ThemedText style={styles.legendLabel}>Balance neto:</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: stats.netIncome >= 0 ? theme.success : theme.error }}>
                ${stats.netIncome.toLocaleString('es-ES')}
              </ThemedText>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={styles.legendLabel}>Beneficio estimado:</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: stats.totalProfit >= 0 ? theme.success : theme.error }}>
                ${stats.totalProfit.toLocaleString('es-ES')}
              </ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 13,
  },
  datePickerContainer: {
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
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    padding: 16,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  balanceContainer: {
    padding: 16,
    marginBottom: 20,
  },
  legendContainer: {
    marginTop: 16,
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0', // Light border, ideally should use theme
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    opacity: 0.8,
  },
});
