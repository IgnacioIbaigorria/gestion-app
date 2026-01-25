import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Category, Product, Tag } from '../models/types';
import { tagService } from '../services/tagService';
import { categoryService } from '@/services/categoryService';
import { useTheme } from '@/contexts/ThemeContext';
import { productService } from '@/services/productService';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { Card } from './ui/Card';

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
  product: Product & {
    tagObjects?: Tag[];
    categoryObject?: Category;
  };
  onDelete: (id: string) => void;
  highlighted?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
}

// Componente memoizado para evitar re-renders innecesarios
function ProductItem({
  product,
  onDelete,
  highlighted,
  selected = false,
  selectionMode = false,
  onLongPress,
  onPress
}: ProductItemProps) {
  const { theme } = useTheme();

  // Usar directamente las props pre-cargadas
  const productTags = product.tagObjects || [];
  const productCategory = product.categoryObject || null;

  const isLowStock = (product.quantity || 0) <= (product.low_stock_threshold || 2);

  const handlePress = () => {
    productService.clearProductCache(product.id!);
    router.push(`/productos/${product.id}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Card
        style={[
          styles.cardContainer,
          selected && { backgroundColor: theme.background + '10', borderColor: theme.primary, borderWidth: 1 },
          highlighted && { borderColor: theme.highlight, borderWidth: 1 },
          isLowStock && { backgroundColor: theme.warning + '10', borderColor: theme.warning, borderWidth: 1 }
        ]}
        variant='outlined'
      >
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>{product.name}</ThemedText>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => onDelete(product.id!)} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={18} color={theme.error} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                productService.clearProductCache(product.id!);
                router.push(`/productos/nuevo?id=${product.id}&returnTo=productos`);
              }}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pricingRow}>
          <View>
            <ThemedText style={styles.priceLabel}>Caja</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: theme.success }}>${product.selling_price.toLocaleString('es-ES')}</ThemedText>
          </View>
          <View>
            <ThemedText style={styles.priceLabel}>Unidad</ThemedText>
            <ThemedText type="defaultSemiBold">${product.unit_price.toLocaleString('es-ES')}</ThemedText>
          </View>
          <View>
            <ThemedText style={styles.priceLabel}>Cajas</ThemedText>
            <ThemedText style={[isLowStock && { color: theme.warning, fontWeight: 'bold' }]}>
              {product.quantity || 0}
            </ThemedText>
          </View>
          <View>
            <ThemedText style={styles.priceLabel}>Unidades</ThemedText>
            <ThemedText style={[isLowStock && { color: theme.warning, fontWeight: 'bold' }]}>
              {product.units || 0}
            </ThemedText>
          </View>
        </View>

        {(productTags.length > 0) && (
          <View style={styles.tagsRow}>
            {productTags.map(tag => (
              <View key={tag.id} style={[styles.tagBadge, { borderColor: tag.color || theme.border }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color || theme.primary }]} />
                <ThemedText style={styles.tagText}>{tag.name}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// Exportar con memo y comparación personalizada
export default React.memo(ProductItem, (prevProps, nextProps) => {
  // Solo re-renderizar si estas props cambian
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.selling_price === nextProps.product.selling_price &&
    prevProps.product.unit_price === nextProps.product.unit_price &&
    prevProps.product.quantity === nextProps.product.quantity &&
    prevProps.product.units === nextProps.product.units &&
    prevProps.highlighted === nextProps.highlighted &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 12,
    color: '#94A3B8', // Slate 400
    marginBottom: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
  },
});
