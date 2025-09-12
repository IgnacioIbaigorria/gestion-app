import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Category, Product } from '../models/types';
import { tagService } from '../services/tagService';
import { Tag } from '../models/types';
import { categoryService } from '@/services/categoryService';
import i18n from '@/translations';
import { useTheme } from '@/contexts/ThemeContext';
import { productService } from '@/services/productService';
import { hi } from 'date-fns/locale';

// Create caches for categories and tags to avoid repeated API calls
let categoriesCache: Category[] = [];
let tagsCache: Tag[] = [];

// Function to preload all categories and tags
const preloadMetadata = async () => {
  try {
    if (categoriesCache.length === 0) {
      categoriesCache = await categoryService.getAllCategories();
    }
    if (tagsCache.length === 0) {
      tagsCache = await tagService.getAllTags();
    }
  } catch (error) {
    console.error('Error preloading metadata:', error);
  }
};

// Call this when the app starts
preloadMetadata();

interface ProductItemProps {
  product: Product & { tagObjects?: Tag[] };
  onDelete: (id: string) => void;
  highlighted?: boolean;
  category?: Category;
  selected?: boolean;
  selectionMode?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
}

export default function ProductItem({ product, onDelete, highlighted, category, selected = false, selectionMode = false, onLongPress, onPress }: ProductItemProps) {
  const { theme } = useTheme();
  const [productTags, setProductTags] = useState<Tag[]>([]);
  const [productCategory, setProductCategory] = useState<Category | null>(null);
  
  // Fix the low stock calculation to properly compare values
  const isLowStock = (product.quantity || 0) <= (product.low_stock_threshold || 2);
  const isLowStockUnity = (product.quantity || 0) <=((product.low_stock_threshold? product.low_stock_threshold : 2) * (product.cantidad_por_caja || 1));
  useEffect(() => {
    // Clear previous tags when product changes
    setProductTags([]);
    
    // First priority: use tagObjects if available
    if (product.tagObjects && product.tagObjects.length > 0) {
      setProductTags(product.tagObjects);
    }
    // Second priority: use tags IDs with tagsCache
    else if (product.tags && product.tags.length > 0 && tagsCache.length > 0) {
      const filteredTags = tagsCache.filter(tag => product.tags?.includes(tag.id || ''));
      setProductTags(filteredTags);
    }
    // Last resort: fetch tags from service
    else if (product.id) {
      const getProductDetails = async () => {
        try {
          // Try to get from cache first
          const productWithDetails = await productService.getProductWithDetails(product.id!);
          if (productWithDetails.tagObjects && productWithDetails.tagObjects.length > 0) {
            setProductTags(productWithDetails.tagObjects);
          } else if (productWithDetails.tags && productWithDetails.tags.length > 0) {
            // If we have tag IDs but no tag objects, use the cache to get the full objects
            if (tagsCache.length === 0) {
              tagsCache = await tagService.getAllTags();
            }
            const filteredTags = tagsCache.filter(tag => 
              productWithDetails.tags?.includes(tag.id || '')
            );
            setProductTags(filteredTags);
          }
        } catch (error) {
          console.error('Error getting product details:', error);
        }
      };
      getProductDetails();
    }
    
    // Only load category if not provided as prop
    if (!category && product.category_id) {
      if (categoriesCache.length > 0) {
        const foundCategory = categoriesCache.find(cat => cat.id === product.category_id);
        if (foundCategory) {
          setProductCategory(foundCategory);
        }
      } else {
        loadCategory();
      }
    } else if (category) {
      setProductCategory(category);
    }
  }, [product.id, product.name, product.cost_price, product.selling_price, product.tags, product.tagObjects, category]); // Add specific dependencies
  
  
  const loadCategory = async () => {
    try {
      if (product.category_id) {
        if (categoriesCache.length === 0) {
          categoriesCache = await categoryService.getAllCategories();
        }
        const foundCategory = categoriesCache.find(cat => cat.id === product.category_id);
        if (foundCategory) {
          setProductCategory(foundCategory);
        }
      }
    } catch (error) {
      console.error('Error loading category:', error);
    }
  };

  // Handler para navegación normal (solo si no está en modo selección)
  const handlePress = () => {
    if (selectionMode && onPress) {
      onPress();
    } else {
      productService.clearProductCache(product.id!);
      router.push(`/productos/${product.id}`);
    }
  };

  // Handler para long press (activar selección)
  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: selected ? theme.primaryLight : theme.surface },
        highlighted && {
          borderWidth: 1,
          borderColor: theme.highlight,
        },
        isLowStock && { 
          borderWidth: 1,
          borderColor: theme.warning,
          backgroundColor: theme.warningLight
        }
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      {/* Indicador visual de selección */}
      {selectionMode && (
        <View style={{
          width: 24, height: 24, borderRadius: 12,
          borderWidth: 2,
          borderColor: selected ? theme.primary : theme.textLight,
          backgroundColor: selected ? theme.primary : 'transparent',
          justifyContent: 'center', alignItems: 'center',
          marginRight: 10,
        }}>
          {selected && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>
        </View>
        
        <View style={styles.details}>
          <View style={styles.prices}>
            <Text style={[styles.price, { color: theme.text }]}>
              Caja: ${product.selling_price.toLocaleString('es-ES')}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              Unidad: ${product.unit_price.toLocaleString('es-ES')}
            </Text>
          </View>
          <View style={styles.stockContainer}>
            <Text style={[
              styles.stock,
              { color: isLowStock ? theme.warning : theme.textLight },
              isLowStock && { fontWeight: '500' }
            ]}>
              Cajas: {product.quantity || 0}
            </Text>
              <Text style={[
                styles.stock,
                { color: isLowStock ? theme.warning : theme.textLight },
                isLowStock && { fontWeight: '500' }
              ]}>
                Unidades: {product.units}
              </Text>
          </View>
        </View>


        <View style={styles.metadataContainer}>
          {productTags.length > 0 && (
            <View style={styles.tagsContainer}>
              {productTags.map((tag) => (
                <View 
                  key={tag.id} 
                  style={[
                    styles.tag,
                    { backgroundColor: theme.surface || theme.primaryLight },
                    { borderWidth: 1, borderColor: tag.color || theme.primaryLight }
                  ]}
                >
                  <Text style={[styles.tagText, { color: theme.text }]}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          // Clear the cache for this product before navigating to edit
          productService.clearProductCache(product.id!);
          router.push(`/productos/nuevo?id=${product.id}&returnTo=productos`);
        }}
      >
        <Ionicons name="pencil" size={20} color={theme.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(product.id!)}
      >
        <Ionicons name="trash-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    height: 128,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  warningBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prices: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '500',
  },
  stock: {
    fontSize: 14,
  },
  editButton: {
    padding: 4,
    marginLeft: 12,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  tag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
    alignItems: 'center',
  },
  stockContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  stockWarningIcon: {
    marginRight: 2,
  },
});
