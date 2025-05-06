import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Sale } from '../models/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';

interface SaleItemProps {
  sale: Sale;
  onDelete?: () => void;
}

export default function SaleItem({ sale, onDelete }: SaleItemProps) {
  const { theme } = useTheme();
  
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

  const getTotalItems = () => {
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/(tabs)/ventas/${sale.id}`)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.textLight }]}>{formatDate(sale.date)}</Text>
          <Text style={[styles.paymentMethod, { color: theme.primary }]}>{sale.payment_method}</Text>
        </View>
        
        <View style={styles.details}>
          <Text style={[styles.itemsCount, { color: theme.text }]}>
            {sale.items.length} productos ({getTotalItems()} ítems)
          </Text>
          <Text style={[styles.amount, { color: theme.primary }]}>
            ${sale.total_amount.toFixed(2)}
          </Text>
        </View>
        
        {sale.notes && (
          <Text style={[styles.notes, { color: theme.textLight }]} numberOfLines={1} ellipsizeMode="tail">
            {sale.notes}
          </Text>
        )}
      </View>
      {onDelete && (
          <TouchableOpacity 
            style={[styles.deleteButton, styles.iconContainer]}
            onPress={(e) => {
              e.stopPropagation(); // Prevent navigation to detail screen
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  itemsCount: {
    fontSize: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  iconContainer: {
    marginLeft: 10,
  },
});