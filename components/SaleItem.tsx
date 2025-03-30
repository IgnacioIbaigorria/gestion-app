import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../constants/Colors';
import { Sale } from '../models/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SaleItemProps {
  sale: Sale;
}

export default function SaleItem({ sale }: SaleItemProps) {
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
      style={styles.container}
      onPress={() => router.push(`/(tabs)/ventas/${sale.id}`)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(sale.date)}</Text>
          <Text style={styles.paymentMethod}>{sale.paymentMethod}</Text>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.itemsCount}>
            {sale.items.length} productos ({getTotalItems()} ítems)
          </Text>
          <Text style={styles.amount}>${sale.totalAmount.toFixed(2)}</Text>
        </View>
        
        {sale.notes && (
          <Text style={styles.notes} numberOfLines={1} ellipsizeMode="tail">
            {sale.notes}
          </Text>
        )}
      </View>
      
      <View style={styles.iconContainer}>
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
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
    color: Colors.textLight,
  },
  paymentMethod: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemsCount: {
    fontSize: 16,
    color: Colors.text,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  notes: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  iconContainer: {
    marginLeft: 8,
  },
});