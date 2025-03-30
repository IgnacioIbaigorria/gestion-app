import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import Colors from '../../../constants/Colors';
import ProductItem from '../../../components/ProductItem';
import { Product } from '../../../models/types';
import i18n from '../../../translations';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);
  
  useEffect(() => {
    if (filter === 'lowStock') {
      setFilteredProducts(products.filter(p => 
        (p.quantity || 0) < (p.lowStockThreshold || 5)
      ));
    } else {
      setFilteredProducts(products);
    }
  }, [products, filter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getAllProducts();
      setProducts(productsData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert(
      i18n.t('products.confirmDelete'),
      i18n.t('products.confirmDeleteMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        { 
          text: i18n.t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(id);
              Alert.alert(i18n.t('common.success'), i18n.t('products.successMessage'));
              loadProducts();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('products.errorMessage'));
              console.error(error);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{i18n.t('products.loading')}</Text>
      </View>
    );
  }

  // Add to the JSX, near the add button
  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <ProductItem product={item} onDelete={handleDeleteProduct} />
        )}
        refreshing={loading}
        onRefresh={loadProducts}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {i18n.t('products.empty')}
          </Text>
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/productos/nuevo')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
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
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textLight,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primary,
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
});