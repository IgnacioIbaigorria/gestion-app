import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { salesService } from '../../../services/salesService';
import { Sale } from '../../../models/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';
// Add this import
import { receiptService } from '../../../services/receiptService';
import { supabase } from '@/services/supabase';

export default function SaleDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [productsMap, setProductsMap] = useState<Record<string, boolean>>({});
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  const [subTotal, setSubTotal] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadSale(id);
    }
  }, [id]);

  const loadSale = async (saleId: string) => {
    try {
      setLoading(true);
      const saleData = await salesService.getSaleById(saleId);
      setSale(saleData);

      // Calcular subtotal
      const total = saleData?.items.reduce((acc: number, item: any) => acc + item.subtotal, 0) ?? 0;
      setSubTotal(total);

      // Obtener los productIds de la venta
      const productIds = saleData?.items.map((item: any) => item.productId) ?? [];

      // Consultar productos en Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select('id, is_deleted')
        .in('id', productIds);

      if (error) throw error;

      // Convertir a mapa para lookup rápido
      const map: Record<string, boolean> = {};
      for (const product of products ?? []) {
        map[product.id] = product.is_deleted ?? false;
      }

      setProductsMap(map);

    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la venta');
      console.error(error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle printing
  const handlePrintReceipt = async () => {
    if (!sale) return;

    try {
      setPrintLoading(true);

      // Generate PDF using receiptService
      const pdfUri = await receiptService.generatePDF(sale);

      // Share the PDF
      await receiptService.sharePDF(pdfUri);
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('Error', 'No se pudo generar el comprobante');
    } finally {
      setPrintLoading(false);
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{'Cargando venta...'}</Text>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{'Venta no encontrada'}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: theme.surface }]}>{'Regresar'}</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{'Detalle de venta'}</Text>
          <Text style={[styles.date, { color: theme.textLight }]}>{formatDate(sale.date)}</Text>
        </View>

        {/* Add print button */}
        <TouchableOpacity
          style={[styles.printButton, { backgroundColor: theme.primary }]}
          onPress={handlePrintReceipt}
          disabled={printLoading}
        >
          {printLoading ? (
            <ActivityIndicator size="small" color={theme.surface} />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={20} color={theme.surface} />
              <Text style={[styles.printButtonText, { color: theme.surface }]}>
                {'Generar comprobante'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
            color: theme.primary,
            borderBottomColor: theme.primaryLight
          }]}>{'Productos'}</Text>
          {sale.items.map((item, index) => (
            <View key={index} style={[styles.itemRow, { borderBottomColor: theme.background }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text }]}>
                  {item.productName} {productsMap[item.productId] ? '[ELIMINADO]' : ''}
                </Text>
                <Text style={[styles.itemDetails, { color: theme.textLight }]}>
                  {item.units} x ${item.unitPrice.toLocaleString('es-ES')}
                </Text>
              </View>
              <Text style={[styles.itemSubtotal, { color: theme.primary }]}>
                ${item.subtotal.toLocaleString('es-ES')}
              </Text>
            </View>

          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
            color: theme.primary,
            borderBottomColor: theme.primaryLight
          }]}>{'Resumen'}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>{'Total de productos'}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{sale.items.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>{'Total de items'}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {sale.items.reduce((sum, item) => sum + item.units, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>{'Método de pago'}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{sale.payment_method}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>{'Subtotal'}</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>${(subTotal).toLocaleString('es-ES')}</Text>
          </View>
          {sale.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text }]}>{'Descuento'}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>-${sale.discount.toLocaleString('es-ES')}% | ${(subTotal * sale.discount) / 100}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.primaryLight }]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>{'Total'}</Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>
              ${sale.total_amount.toLocaleString('es-ES')}
            </Text>
          </View>
        </View>

        {sale.notes ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {
              color: theme.primary,
              borderBottomColor: theme.primaryLight
            }]}>{'Notas'}</Text>
            <Text style={[styles.notes, { color: theme.text }]}>{sale.notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.surface} />
          <Text style={[styles.backButtonText, { color: theme.surface }]}>{'Regresar'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Update the styles to add print button styles
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    borderBottomWidth: 1,
    paddingBottom: 5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 14,
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDiscount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
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
  notes: {
    fontSize: 16,
    lineHeight: 22,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});