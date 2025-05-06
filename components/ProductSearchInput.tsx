import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/productService';
import Colors from '../constants/Colors';
import { Product } from '../models/types';

interface ProductSearchInputProps {
  onSelectProduct: (product: Product) => void;
}

export default function ProductSearchInput({ onSelectProduct }: ProductSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts([]);
    } else {
      const query = searchQuery.toLowerCase();
      
      // Filter products that match the search query
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(query)
      );
      
      // Sort the filtered products:
      // 1. Products that start with the query come first
      // 2. Then sort alphabetically within each group
      const sortedProducts = [...filtered].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Check if product names start with the query
        const aStartsWithQuery = aName.startsWith(query);
        const bStartsWithQuery = bName.startsWith(query);
        
        // If one starts with query and the other doesn't, prioritize the one that does
        if (aStartsWithQuery && !bStartsWithQuery) return -1;
        if (!aStartsWithQuery && bStartsWithQuery) return 1;
        
        // If both either start or don't start with the query, sort alphabetically
        return aName.localeCompare(bName);
      });
      
      setFilteredProducts(sortedProducts);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getAllProducts();
      setProducts(productsData);
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
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowResults(text.trim().length > 0);
          }}
          placeholder="Buscar producto por nombre..."
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
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.dropdownWrapper}>
          <View style={styles.resultsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
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
                    style={styles.resultItem}
                    onPress={() => handleSelectProduct(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <View style={styles.resultItemDetails}>
                      <Text style={styles.resultItemPrice}>
                        ${item.selling_price.toFixed(2)}
                      </Text>
                      <Text style={styles.resultItemStock}>
                        Stock: {item.quantity || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noResultsText}>
                No se encontraron productos
              </Text>
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
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
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
    color: Colors.text,
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
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
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
    borderBottomColor: Colors.background,
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  resultItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultItemPrice: {
    fontSize: 14,
    color: Colors.primary,
  },
  resultItemStock: {
    fontSize: 14,
    color: Colors.textLight,
  },
  noResultsText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  loader: {
    padding: 16,
  },
});