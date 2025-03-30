import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { productService } from '../../../services/productService';
import Colors from '../../../constants/Colors';

interface Statistics {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  potentialIncome: number;
  investedMoney: number;
  potentialProfit: number;
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
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const products = await productService.getAllProducts();
      
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
      });
      
      // Calculate potential profit
      statistics.potentialProfit = statistics.potentialIncome - statistics.investedMoney;
      
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
      r: "4",
      strokeWidth: "2",
      stroke: Colors.primary
    }
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

        <View style={[styles.statCard, styles.highlightCard]}>
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
              color: Colors.primary,
              legendFontColor: Colors.text,
              legendFontSize: 10, // Reducido de 12 a 10
            },
            {
              name: 'Ganancia',
              value: stats.potentialProfit,
              color: Colors.success,
              legendFontColor: Colors.text,
              legendFontSize: 10, // Reducido de 12 a 10
            }
          ]}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="value"
          backgroundColor="transparent"
          paddingLeft="0"
          center={[10, -20]} // Ajusta la posición del centro del gráfico
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
});