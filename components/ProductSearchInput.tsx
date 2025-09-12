import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/productService';
import Colors from '../constants/Colors';
import { Product } from '../models/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

interface ProductSearchInputProps {
  onSelectProduct: (product: Product) => void;
}

export default function ProductSearchInput({ onSelectProduct }: ProductSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadProducts(); // tu función para obtener la lista actualizada
    }, []) // No dependencias: se vuelve a ejecutar cada vez que la pantalla gana foco
  );

  // Nuevo: debounce para búsqueda
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts([]);
      setLoading(false);
      return;
    }
  
    setLoading(true);
    const handler = setTimeout(() => {
      const q = searchQuery.toLowerCase();
  
      // 1. Filtrar: solo los productos donde alguna palabra empieza con q
      const filtered = products.filter(product => {
        return product.name
          .toLowerCase()
          .split(/\s+/)                          // separa en palabras
          .some(word => word.startsWith(q));    // comprueba cada palabra
      });
  
      // 2. (Opcional) ordenar alfabéticamente
      filtered.sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
  
      setFilteredProducts(filtered);  // si no hay ninguno, va vacío
      setLoading(false);
    }, 350);
  
    return () => clearTimeout(handler);
  }, [searchQuery, products]);
    
  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getAllProducts();
      // Sort all products alphabetically when loading
      const sortedProducts = [...productsData].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, {backgroundColor: theme.surface}, {borderColor: theme.primaryLight}]}>
        <Ionicons name="search" size={20} color={theme.textLight} backgroundColor={theme.surface} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, {color: theme.text}, {backgroundColor: theme.surface}]}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowResults(text.trim().length > 0);
          }}
          placeholder="Buscar producto por nombre..."
          placeholderTextColor={theme.textLight}
          onFocus={() => setShowResults(searchQuery.trim().length > 0)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
          >
            <Ionicons name="close-circle" size={20} color={theme.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.dropdownWrapper}>
          <View style={[styles.resultsContainer, {backgroundColor: theme.surface}, {borderColor: theme.primaryLight}]}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
            ) : filteredProducts.length > 0 ? (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                scrollEnabled={true}
              >
                {filteredProducts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.resultItem, {borderBottomColor: theme.background}]}
                    onPress={() => handleSelectProduct(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.resultItemName, {color: theme.text}]}>{item.name}</Text>
                    <View style={styles.resultItemDetails}>
                      <View style={styles.resultItemPrices}>
                        <Text style={[styles.resultItemPrice, {color: theme.primary}]}>
                          Precio por caja: ${item.selling_price.toLocaleString('es-ES')}
                        </Text>
                        <Text style={[styles.resultItemPrice, {color: theme.primary}]}>
                          Precio por unidad: ${item.unit_price.toLocaleString('es-ES')}
                        </Text>
                      </View>
                      <View style={styles.resultItemQuantities}>
                        <Text style={[styles.resultItemStock, {color: theme.textLight}]}>
                          Cajas: {item.quantity || 0}
                        </Text>
                        <Text style={[styles.resultItemStock, {color: theme.textLight}]}>
                          Unidades: {item.units || 0}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              // Mostrar mensaje solo si NO está cargando y no hay resultados
              !loading && searchQuery.trim().length >= 1 && (
                <Text style={[styles.noResultsText, {color: theme.textLight}]}>
                  No se encontraron productos
                </Text>
              )
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8, // Add margin when results aren't shown
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  dropdownWrapper: {
    position: 'relative',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  resultsContainer: {
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 200,
  },
  scrollView: {
    maxHeight: 200,
  },
  scrollViewContent: {
    paddingVertical: 4,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultItemPrices: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  resultItemPrice: {
    fontSize: 14,
  },
  resultItemQuantities: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  resultItemStock: {
    fontSize: 14,
  },
  noResultsText: {
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loader: {
    padding: 16,
  },
});