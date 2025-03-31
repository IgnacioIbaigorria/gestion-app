import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../constants/Colors';
import { Product } from '../models/types';
import { tagService } from '../services/tagService';
import { Tag } from '../models/types';

interface ProductItemProps {
  product: Product;
  onDelete: (id: string) => void;
}

export default function ProductItem({ product, onDelete }: ProductItemProps) {
  const [productTags, setProductTags] = useState<Tag[]>([]);
  const isLowStock = (product.quantity || 0) < (product.lowStockThreshold || 5);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    if (product.tags && product.tags.length > 0) {
      const allTags = await tagService.getAllTags();
      const filteredTags = allTags.filter(tag => product.tags?.includes(tag.id || ''));
      setProductTags(filteredTags);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isLowStock && styles.lowStockContainer
      ]}
      onPress={() => router.push(`/productos/${product.id}`)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{product.name}</Text>
          {isLowStock && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={16} color={Colors.surface} />
              <Text style={styles.warningText}>Stock Bajo</Text>
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <Text style={styles.price}>
            ${product.sellingPrice.toFixed(2)}
          </Text>
          <Text style={[
            styles.stock,
            isLowStock && styles.lowStockText
          ]}>
            Stock: {product.quantity || 0}
          </Text>
        </View>

        {productTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {productTags.map((tag) => (
              <View 
                key={tag.id} 
                style={[
                  styles.tag,
                  { backgroundColor: Colors.primaryLight },
                ]}
              >
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(product.id!)}
      >
        <Ionicons name="trash-outline" size={20} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  lowStockContainer: {
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
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
    color: Colors.text,
    flex: 1,
  },
  warningBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  warningText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  stock: {
    fontSize: 14,
    color: Colors.textLight,
  },
  lowStockText: {
    color: Colors.warning,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  tag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
});
