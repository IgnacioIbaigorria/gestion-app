import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { quoteService } from '../../../services/quoteService';
import { Quote, QuoteStatus } from '../../../models/types';
import i18n from '../../../translations';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/contexts/ThemeContext';

export default function QuoteDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const quoteData = await quoteService.getQuoteById(id);
      setQuote(quoteData);
    } catch (error) {
      console.error('Error loading quote:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    
    try {
      setLoading(true);
      await quoteService.updateQuote(quote.id!, { status: newStatus });
      
      // If converting to sale, use the dedicated method
      if (newStatus === 'converted') {
        await quoteService.convertQuoteToSale(quote.id!);
        Alert.alert(
          i18n.t('common.success'),
          i18n.t('quotes.convertSuccess'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Otherwise just update the local state
        setQuote({ ...quote, status: newStatus });
        Alert.alert(i18n.t('common.success'), i18n.t('quotes.statusUpdateSuccess'));
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.statusUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  const generateHtml = () => {
    if (!quote) return '';
    
    const quoteDate = quote.date ? quote.date : new Date(quote.date);
    const validUntil = quote.valid_until? quote.valid_until : new Date();
    
    const itemsHtml = quote.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Presupuesto</title>
        <style>
          body {
            font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .quote-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .quote-number {
            font-size: 16px;
            color: #666;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 5px;
          }
          .info-label {
            font-weight: bold;
            width: 120px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #f2f2f2;
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
            font-size: 18px;
          }
          .total-amount {
            font-weight: bold;
            font-size: 20px;
          }
          .notes {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="quote-title">PRESUPUESTO</div>
          <div class="quote-number">#${quote.id}</div>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Cliente:</div>
            <div>${quote.customer_name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Fecha:</div>
            <div>${format(quoteDate, 'dd/MM/yyyy')}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Válido hasta:</div>
            <div>${format(validUntil, 'dd/MM/yyyy')}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="total-section">
          <div>Total: <span class="total-amount">$${quote.total.toFixed(2)}</span></div>
        </div>
        
        ${quote.notes ? `
          <div class="notes">
            <strong>Notas:</strong>
            <p>${quote.notes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Este presupuesto es válido hasta la fecha indicada.</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleShareQuote = async () => {
    try {
      if (!quote) return;
      
      const message = `Presupuesto para ${quote.customer_name} por un total de $${quote.total.toFixed(2)}`;
      await Share.share({
        message,
        title: 'Compartir Presupuesto',
      });
    } catch (error) {
      console.error('Error sharing quote:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.shareError'));
    }
  };

  const handleExportPdf = async () => {
    try {
      setLoading(true);
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('quotes.exportError'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case 'pending': return theme.warning;
      case 'approved': return theme.success;
      case 'rejected': return theme.error;
      case 'converted': return theme.primary;
      default: return theme.textLight;
    }
  };
  
  const getStatusText = (status: QuoteStatus) => {
    switch (status) {
      case 'pending': return i18n.t('quotes.status.pending');
      case 'approved': return i18n.t('quotes.status.approved');
      case 'rejected': return i18n.t('quotes.status.rejected');
      case 'converted': return i18n.t('quotes.status.converted');
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{i18n.t('quotes.notFound')}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: theme.surface }]}>{i18n.t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: i18n.t('quotes.detail'),
          headerStyle: {
            backgroundColor: theme.primary,
          },
          headerTintColor: theme.surface,
        }} 
      />
      
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.customerName, { color: theme.text }]}>{quote.customer_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
              <Text style={styles.statusText}>{getStatusText(quote.status)}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textLight }]}>{i18n.t('quotes.date')}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {format(quote.date instanceof Date ? quote.date : new Date(quote.date), 'dd/MM/yyyy')}
            </Text>
          </View>
          
          {quote.valid_until && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textLight }]}>{i18n.t('quotes.validUntil')}:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {format(quote.valid_until instanceof Date ? quote.valid_until : new Date(quote.valid_until), 'dd/MM/yyyy')}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('quotes.items')}</Text>
        
        {quote.items.map((item, index) => (
          <View key={index} style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.itemDetails}>
              <Text style={[styles.itemQuantity, { color: theme.textLight }]}>
                {item.quantity} x ${item.unitPrice.toFixed(2)}
              </Text>
              <Text style={[styles.itemSubtotal, { color: theme.text }]}>
                ${item.subtotal.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
        
        <View style={[styles.totalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textLight }]}>{i18n.t('common.total')}:</Text>
          <Text style={[styles.totalValue, { color: theme.primary }]}>${quote.total.toFixed(2)}</Text>
        </View>
        
        {quote.notes && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('quotes.notes')}</Text>
            <View style={[styles.notesCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.notesText, { color: theme.text }]}>{quote.notes}</Text>
            </View>
          </>
        )}
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleExportPdf}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.surface} />
            <Text style={[styles.actionButtonText, { color: theme.surface }]}>{i18n.t('quotes.exportPdf')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.secondary }]}
            onPress={handleShareQuote}
          >
            <Ionicons name="share-outline" size={20} color={theme.surface} />
            <Text style={[styles.actionButtonText, { color: theme.surface }]}>{i18n.t('common.share')}</Text>
          </TouchableOpacity>
        </View>
        
        {quote.status !== 'converted' && (
          <View style={styles.statusActionsContainer}>
            <Text style={[styles.statusActionsTitle, { color: theme.text }]}>{i18n.t('quotes.changeStatus')}:</Text>
            
            <View style={styles.statusButtons}>
              {quote.status !== 'pending' && (
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: theme.warning }]}
                  onPress={() => handleStatusChange('pending')}
                >
                  <Text style={styles.statusButtonText}>{i18n.t('quotes.status.pending')}</Text>
                </TouchableOpacity>
              )}
              
              {quote.status !== 'approved' && (
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: theme.success }]}
                  onPress={() => handleStatusChange('approved')}
                >
                  <Text style={styles.statusButtonText}>{i18n.t('quotes.status.approved')}</Text>
                </TouchableOpacity>
              )}
              
              {quote.status !== 'rejected' && (
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: theme.error }]}
                  onPress={() => handleStatusChange('rejected')}
                >
                  <Text style={styles.statusButtonText}>{i18n.t('quotes.status.rejected')}</Text>
                </TouchableOpacity>
              )}
              
              {quote.status === 'pending' || quote.status === 'approved' || quote.status === 'rejected' && (
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleStatusChange('converted')}
                >
                  <Text style={styles.statusButtonText}>{i18n.t('quotes.convertToSale')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

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
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  itemCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  notesCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusActionsContainer: {
    marginBottom: 40,
  },
  statusActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});