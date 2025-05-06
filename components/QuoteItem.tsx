import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Quote } from '../models/types';
import { format } from 'date-fns';
import i18n from '../translations';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';

interface QuoteItemProps {
  quote: Quote;
  onDelete: () => void;
  onConvert: () => void;
}

export default function QuoteItem({ quote, onDelete, onConvert }: QuoteItemProps) {
  const { theme } = useTheme();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.warning;
      case 'approved': return theme.success;
      case 'rejected': return theme.error;
      case 'converted': return theme.primary;
      default: return theme.textLight;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return i18n.t('quotes.status.pending');
      case 'approved': return i18n.t('quotes.status.approved');
      case 'rejected': return i18n.t('quotes.status.rejected');
      case 'converted': return i18n.t('quotes.status.converted');
      default: return status;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => router.push(`/presupuestos/${quote.id}`)}
    >
      <View style={styles.header}>
        <Text style={[styles.customerName, { color: theme.text }]}>{quote.customer_name}</Text>
        <Text style={[styles.date, { color: theme.textLight }]}>
          {format(quote.date, 'dd/MM/yyyy')}
        </Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textLight }]}>{i18n.t('quotes.items')}:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{quote.items.length}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.label, { color: theme.textLight }]}>{i18n.t('quotes.total')}:</Text>
        <Text style={[styles.total, { color: theme.text }]}>
          ${quote.total.toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
          <Text style={styles.statusText}>{getStatusText(quote.status)}</Text>
        </View>
        
        <View style={styles.actions}>
          {quote.status !== 'converted' && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={onConvert}
              disabled={quote.status === 'rejected'}
            >
              <Ionicons name="cart-outline" size={18} color={theme.surface} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={18} color={theme.surface} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});