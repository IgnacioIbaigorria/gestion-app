import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Product } from '../models/types';
import { router } from 'expo-router';

type ProductItemProps = {
  product: Product;
  onDelete: (id: string) => void;
};

const ProductItem: React.FC<ProductItemProps> = ({ product, onDelete }) => {
  return (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => router.push(`/productos/${product.id}`)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>Precio: ${product.sellingPrice.toFixed(2)}</Text>
        <Text style={styles.productCost}>Costo: ${product.costPrice.toFixed(2)}</Text>
        <Text style={styles.productMargin}>
          Margen: {product.profitMargin.toFixed(2)}%
        </Text>
        <Text style={styles.productQuantity}>
          Cantidad: {product.quantity}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(product.id!)}
      >
        <Ionicons name="trash-outline" size={24} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 2,
  },
  productCost: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  productMargin: {
    fontSize: 14,
    color: Colors.accent,
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 14,
    color: Colors.textLight,
  },
  deleteButton: {
    padding: 8,
  },
});

export default ProductItem;