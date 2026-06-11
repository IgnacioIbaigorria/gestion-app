import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { quoteService } from '../../../services/quoteService';
import QuoteItem from '../../../components/QuoteItem';
import { Quote, QuoteStatus } from '../../../models/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function QuotesScreen() {
  const { theme } = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    loadQuotes();
  }, [filterStatus]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      let quotesData: Quote[];

      if (filterStatus === 'all') {
        quotesData = await quoteService.getAllQuotes();
      } else {
        quotesData = await quoteService.getQuotesByStatus(filterStatus);
      }

      setQuotes(quotesData);
    } catch (error) {
      Alert.alert('Error', 'Error al cargar presupuestos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = (quote: Quote) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar este presupuesto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await quoteService.deleteQuote(quote.id!);
              loadQuotes();
              Alert.alert('Éxito', 'Presupuesto eliminado correctamente');
            } catch (error) {
              console.error('Error deleting quote:', error);
              Alert.alert('Error', 'Error al eliminar el presupuesto');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleConvertToSale = (quote: Quote) => {
    if (quote.status === 'converted') {
      Alert.alert('Error', 'El presupuesto ya ha sido convertido');
      return;
    }

    // Show the custom payment method modal
    setSelectedQuote(quote);
    setPaymentModalVisible(true);
  };

  const handlePaymentMethodSelect = (paymentMethod: string) => {
    // Close the modal
    setPaymentModalVisible(false);

    // Proceed with conversion if we have a selected quote
    if (selectedQuote) {
      confirmConversion(selectedQuote, paymentMethod);
    }
  };

  const confirmConversion = (quote: Quote, paymentMethod: string) => {
    // For debugging
    console.log('Selected payment method:', paymentMethod);

    Alert.alert(
      'Confirmar',
      '¿Estás seguro de convertir este presupuesto a venta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await quoteService.convertQuoteToSale(quote.id!, paymentMethod);
              loadQuotes();
              Alert.alert('Éxito', 'Presupuesto convertido a venta correctamente');
            } catch (error) {
              console.error('Error converting quote to sale:', error);
              Alert.alert('Error', 'Error al convertir el presupuesto a venta');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>Cargando presupuestos</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.filterContainer, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'all' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[
            styles.filterText,
            { color: theme.text },
            filterStatus === 'all' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'pending' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text style={[
            styles.filterText,
            { color: theme.text },
            filterStatus === 'pending' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            Pendientes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'approved' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterStatus('approved')}
        >
          <Text style={[
            styles.filterText,
            { color: theme.text },
            filterStatus === 'approved' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            Aprobados
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'converted' && [styles.filterButtonActive, { backgroundColor: theme.primary }]
          ]}
          onPress={() => setFilterStatus('converted')}
        >
          <Text style={[
            styles.filterText,
            { color: theme.text },
            filterStatus === 'converted' && [styles.filterTextActive, { color: theme.surface }]
          ]}>
            Convertidos
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <QuoteItem
            quote={item}
            onDelete={() => handleDeleteQuote(item)}
            onConvert={() => handleConvertToSale(item)}
          />
        )}
        refreshing={loading}
        onRefresh={loadQuotes}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textLight }]}>
            No hay presupuestos
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/presupuestos/nuevo')}
      >
        <Ionicons name="add" size={30} color={theme.surface} />
      </TouchableOpacity>

      {/* Payment Method Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              'Método de Pago'
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textLight }]}>
              'Seleccione el método de pago'
            </Text>

            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: theme.border }]}
              onPress={() => handlePaymentMethodSelect('Efectivo')}
            >
              <Ionicons name="cash-outline" size={24} color={theme.primary} />
              <Text style={[styles.paymentOptionText, { color: theme.text }]}>
                Efectivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: theme.border }]}
              onPress={() => handlePaymentMethodSelect('Transferencia')}
            >
              <Ionicons name="swap-horizontal-outline" size={24} color={theme.primary} />
              <Text style={[styles.paymentOptionText, { color: theme.text }]}>
                Transferencia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: theme.border }]}
              onPress={() => handlePaymentMethodSelect('Débito')}
            >
              <Ionicons name="card-outline" size={24} color={theme.primary} />
              <Text style={[styles.paymentOptionText, { color: theme.text }]}>
                Débito
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, { borderColor: theme.border }]}
              onPress={() => handlePaymentMethodSelect('Crédito')}
            >
              <Ionicons name="card" size={24} color={theme.primary} />
              <Text style={[styles.paymentOptionText, { color: theme.text }]}>
                Crédito
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.error }]}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: 'white' }]}>
                Cancelar
              </Text>
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    minWidth: 80,
  },
  filterButtonActive: {
    // backgroundColor applied dynamically
  },
  filterText: {
    fontSize: 13,
    // color applied dynamically
  },
  filterTextActive: {
    fontWeight: 'bold',
    // color applied dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color applied dynamically
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    // color applied dynamically
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    // backgroundColor applied dynamically
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  paymentOptionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  cancelButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
