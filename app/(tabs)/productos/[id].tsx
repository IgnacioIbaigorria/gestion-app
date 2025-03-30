import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import Colors from '../../../constants/Colors';
import { Product } from '../../../models/types';
import i18n from '../../../translations';
import { Tag } from '../../../models/types';
import { tagService } from '../../../services/tagService';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      const productData = await productService.getProductById(productId);
      setProduct(productData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{i18n.t('products.noProductFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{i18n.t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{product.name}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('products.priceInformation')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{i18n.t('products.costPrice')}:</Text>
            <Text style={styles.priceValue}>${product.costPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{i18n.t('products.sellingPrice')}:</Text>
            <Text style={styles.priceValue}>${product.sellingPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{i18n.t('products.sellingPriceMargin')}:</Text>
            <Text style={[styles.priceValue, styles.margin]}>
              {product.profitMargin.toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('products.inventory')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{i18n.t('products.currentQuantity')}:</Text>
            <Text style={styles.stockValue}>{product.quantity || 0} {i18n.t('products.units')}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{i18n.t('products.lowStockThreshold')}:</Text>
            <Text style={styles.stockValue}>
              {product.lowStockThreshold || 5} {i18n.t('products.units')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('products.tags')}</Text>
          <View style={styles.tagsContainer}>
            {product.tags && product.tags.length > 0 ? (
              product.tags.map((tagId) => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <View 
                    key={tagId} 
                    style={[
                      styles.tag, 
                      { backgroundColor: tag.color || Colors.primary }
                    ]}
                  >
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ) : null;
              })
            ) : (
              <Text style={styles.noTagsText}>{i18n.t('products.noTags')}</Text>
            )}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color={Colors.surface} />
            <Text style={styles.buttonText}>{i18n.t('products.edit')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={Colors.surface} />
            <Text style={styles.buttonText}>{i18n.t('products.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Merge the styles
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
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
    color: Colors.text,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
    paddingBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  priceLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  margin: {
    color: Colors.success,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.error,
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
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: Colors.surface,
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
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  noTagsText: {
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});