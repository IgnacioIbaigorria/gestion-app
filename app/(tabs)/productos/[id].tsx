import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { Category, Product } from '../../../models/types';
import i18n from '../../../translations';
import { Tag } from '../../../models/types';
import { tagService } from '../../../services/tagService';
import { categoryService } from '@/services/categoryService';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsFocused } from '@react-navigation/native'; // Add this import

export default function ProductDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const isFocused = useIsFocused(); // Add this hook

  // Update this useEffect to depend on isFocused
  useEffect(() => {
    if (id && isFocused) {
      loadProduct(id);
    }
  }, [id, isFocused]);
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    try {
      const categoriesData = await categoryService.getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      // Force a fresh fetch from the database by setting forceRefresh to true
      const productData = await productService.getProductById(productId);
      setProduct(productData);
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('products.detail.errorLoading'));
      console.error(error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (product) {
      router.push({
        pathname: '/(tabs)/productos/nuevo',
        params: { id: product.id }
      });
    }
  };

  const handleDelete = () => {
    if (!product) return;

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
              await productService.deleteProduct(product.id!);
              Alert.alert(i18n.t('common.success'), i18n.t('products.successMessage'));
              router.back();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('products.errorMessage'));
              console.error(error);
            }
          }
        },
      ]
    );
  };

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagsData = await tagService.getAllTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>
          {i18n.t('products.detail.loading')}
        </Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>
          {i18n.t('products.detail.notFound')}
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.primary }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: theme.surface }]}>
            {i18n.t('common.back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{product.name}</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { 
            color: theme.primary,
            borderBottomColor: theme.primaryLight 
          }]}>
            {i18n.t('products.detail.priceInformation')}
          </Text>
          <View style={[styles.priceRow, { borderBottomColor: theme.background }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>
              {i18n.t('products.costPrice')}:
            </Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>
              ${product.cost_price}
            </Text>
          </View>
          <View style={[styles.priceRow, { borderBottomColor: theme.background }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>
              {i18n.t('products.sellingPrice')}:
            </Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>
              ${product.selling_price}
            </Text>
          </View>
          <View style={[styles.priceRow, { borderBottomColor: theme.background }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>
              {i18n.t('products.sellingPriceMargin')}:
            </Text>
            <Text style={[styles.priceValue, styles.margin, { color: theme.success }]}>
              {product.profit_margin.toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { 
            color: theme.primary,
            borderBottomColor: theme.primaryLight 
          }]}>
            {i18n.t('products.detail.inventory')}
          </Text>
          <View style={[styles.priceRow, { borderBottomColor: theme.background }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>
              {i18n.t('products.currentQuantity')}:
            </Text>
            <Text style={[styles.stockValue, { color: theme.text }]}>
              {product.quantity || 0} {i18n.t('products.units')}
            </Text>
          </View>
          <View style={[styles.priceRow, { borderBottomColor: theme.background }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>
              {i18n.t('products.lowStockThreshold')}:
            </Text>
            <Text style={[styles.stockValue, { color: theme.text }]}>
              {product.low_stock_threshold || 5} {i18n.t('products.units')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { 
            color: theme.primary,
            borderBottomColor: theme.primaryLight 
          }]}>
            {i18n.t('products.detail.tags')}
          </Text>
          <View style={styles.tagsContainer}>
            {product.tags && product.tags.length > 0 ? (
              product.tags.map((tagId) => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <View 
                    key={tagId} 
                    style={[
                      styles.tag, 
                      { backgroundColor: tag.color || theme.primary }
                    ]}
                  >
                    <Text style={[styles.tagText, { color: theme.surface }]}>{tag.name}</Text>
                  </View>
                ) : null;
              })
            ) : (
              <Text style={[styles.noTagsText, { color: theme.textLight }]}>
                {i18n.t('products.noTags')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { 
            color: theme.primary,
            borderBottomColor: theme.primaryLight 
          }]}>
            {i18n.t('products.detail.category')}
          </Text>
          {product.category_id ? (
            <View style={styles.categoryContainer}>
              {categories.map((category) => {
                if (category.id === product.category_id) {
                  return (
                    <View
                      key={category.id}
                      style={[
                        styles.category,
                        { backgroundColor: category.color || theme.primary }
                      ]}
                    >
                      <Text style={[styles.categoryText, { color: theme.surface }]}>
                        {category.name}
                      </Text>
                    </View>
                  );
                }
                return null;
              })}
            </View>
          ) : (
            <Text style={[styles.noTagsText, { color: theme.textLight }]}>
              {i18n.t('products.noCategory')}
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: theme.primary }]} 
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={20} color={theme.surface} />
            <Text style={[styles.buttonText, { color: theme.surface }]}>
              {i18n.t('common.edit')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: theme.error }]} 
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={theme.surface} />
            <Text style={[styles.buttonText, { color: theme.surface }]}>
              {i18n.t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Styles with removed color references
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  priceLabel: {
    fontSize: 16,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  margin: {
    // Color applied dynamically
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 10,
  },
  deleteButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noTagsText: {
    fontStyle: 'italic',
  },
  categoryContainer: {
    marginTop: 8,
  },
  category: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});