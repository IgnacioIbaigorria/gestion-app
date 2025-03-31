import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { productService } from '../../../services/productService';
import Colors from '../../../constants/Colors';

// Agregar el import del servicio de caja
import { cashService } from '../../../services/cashService';

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
  const [loading, setLoading] = useState(true);
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
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [products, transactions] = await Promise.all([
        productService.getAllProducts(),
        cashService.getAllTransactions()
      ]);
      
      // Calcular estadísticas de productos
      const statistics = products.reduce((acc, product) => {
        // Calculate total products
        acc.totalProducts += 1;
        
        // Calculate products with low stock
        if (product.quantity < (product.lowStockThreshold || 5)) {
          acc.lowStockProducts += 1;
        }
        
        // Calculate total invested money (cost price * quantity)
        const invested = product.costPrice * product.quantity;
        acc.investedMoney += invested;
        
        // Calculate potential income (selling price * quantity)
        const potential = product.sellingPrice * product.quantity;
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
      
      // Calcular estadísticas financieras desde las transacciones
      const financialStats = transactions.reduce((acc, transaction) => {
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

      // Actualizar las estadísticas con los datos financieros
      statistics.totalIncome = financialStats.totalIncome;
      statistics.totalExpenses = financialStats.totalExpenses;
      statistics.netIncome = financialStats.totalIncome - financialStats.totalExpenses;
      statistics.totalProfit = statistics.netIncome * 0.3; // 30% estimado de ganancia
      
      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 50; // Ajuste del ancho

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
    labelColor: (opacity = 1) => Colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "3",
      strokeWidth: "2",
      stroke: Colors.primary
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: 'bold',
      fill: Colors.text,
    },
    barPercentage: 0.7,
  };

  // Datos para el gráfico de inventario
  const inventoryData = {
    labels: ['Costo', 'Venta', 'Ganancia'],
    datasets: [{
      data: [
        stats.investedMoney,
        stats.potentialIncome,
        stats.potentialProfit
      ],
      color: (opacity = 1) => Colors.primary,
      strokeWidth: 2
    }],
    legend: ['Valor del Inventario']
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas de Inventario</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Productos Totales</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.lowStockProducts}</Text>
          <Text style={styles.statLabel}>Productos con Stock Bajo</Text>
        </View>

        <View style={[styles.statCard]}>
          <Text style={styles.statValue}>
            ${stats.potentialProfit.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Ganancia Potencial</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            ${stats.investedMoney.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Dinero Invertido</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            ${stats.potentialIncome.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Ingreso Potencial</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Distribución de Capital</Text>
        <PieChart
          data={[
            {
              name: 'Inversión',
              value: stats.investedMoney,
              color: Colors.primaryLight,
              legendFontColor: Colors.text,
              legendFontSize: 12,
              legendFontWeight: 'bold',
              valuePrefix: '$',
            },
            {
              name: 'Ganancia',
              value: stats.potentialProfit,
              color: Colors.success,
              legendFontColor: Colors.text,
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
        <Text style={styles.sectionTitle}>Análisis de Inventario</Text>
        
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Resumen de Valores</Text>
          <Text style={styles.chartDescription}>
            Comparación entre costo de inventario, precio de venta y ganancia potencial
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
            fromZero
            style={{...styles.chart, marginLeft: 0}} // Ajustamos el margen izquierdo
            />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <Text style={styles.legendLabel}>Costo Total:</Text>
              <Text style={styles.legendValue}>${stats.investedMoney.toFixed(2)}</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendLabel}>Venta Total:</Text>
              <Text style={styles.legendValue}>${stats.potentialIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendLabel}>Ganancia Esperada:</Text>
              <Text style={[styles.legendValue, { color: Colors.success }]}>
                ${stats.potentialProfit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
        <View style={styles.balanceContainer}>
          <Text style={styles.sectionTitle}>Balance financiero</Text>
          
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Resumen financiero</Text>
            <Text style={styles.chartDescription}>
              Análisis de ingresos, egresos y ganancias
            </Text>
            <BarChart
              yAxisLabel="$"
              yAxisSuffix=""
              data={{
                labels: ['Ingresos', 'Egresos', 'Neto', 'Ganancia'],
                datasets: [{
                  data: [
                    stats.totalIncome,
                    stats.totalExpenses,
                    stats.netIncome,
                    stats.totalProfit
                  ],
                  
                  color: (opacity = 1) => Colors.primary,
                  strokeWidth: 2
                }],
              }}
              width={chartWidth - 60}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
              }}
              style={{
                ...styles.chart,
                marginVertical: 16,  // Aumentar espacio vertical
              }}
              showValuesOnTopOfBars
              fromZero
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <Text style={styles.legendLabel}>Ingresos totales:</Text>
                <Text style={[styles.legendValue, { color: Colors.success }]}>
                  ${stats.totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendLabel}>Egresos totales:</Text>
                <Text style={[styles.legendValue, { color: Colors.error }]}>
                  ${stats.totalExpenses.toFixed(2)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendLabel}>Balance neto:</Text>
                <Text style={[styles.legendValue, { 
                  color: stats.netIncome >= 0 ? Colors.success : Colors.error 
                }]}>
                  ${stats.netIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendLabel}>Ganancia estimada:</Text>
                <Text style={[styles.legendValue, { color: Colors.primary }]}>
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
    backgroundColor: Colors.background,
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
    padding: 20,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: Colors.textLight,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
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
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  chartDescription: {
    fontSize: 14,
    color: Colors.textLight,
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
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  legendLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  balanceContainer: {
    padding: 16,
  },
});