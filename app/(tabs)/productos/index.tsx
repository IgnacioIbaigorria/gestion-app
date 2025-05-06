import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { Category, Product, Tag } from '../../../models/types'; // Make sure Tag is imported
import i18n from '../../../translations';
import { categoryService } from '@/services/categoryService';
import { tagService } from '@/services/tagService';
import { useTheme } from '@/contexts/ThemeContext';
import ProductItem from '../../../components/ProductItem';
import { useIsFocused } from '@react-navigation/native';

export default function ProductsScreen() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]); // Add state for tags
  const [dataReady, setDataReady] = useState<boolean>(false); // Add state to track when all data is ready
  const { filter, source, updatedProductId } = useLocalSearchParams<{ 
    filter: string, 
    source: string,
    updatedProductId: string 
  }>();
  const [activeFilter, setActiveFilter] = useState(
    filter === 'lowStock' && source === 'dashboard' ? 'lowStock' : 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const flatListRef = React.useRef<FlatList>(null);
  // Add state to track if we're waiting to scroll to a product
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  
  // Add viewability configuration
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 100,
  }).current;
  
  // Add callback for viewable items changed
  const handleViewableItemsChanged = React.useCallback(({ viewableItems }: { viewableItems: Array<{ item: Product }> }) => {
    if (!pendingScroll) return;
    
    // Check if our target product is among the viewable items
    const isTargetVisible = viewableItems.some(item => item.item.id === pendingScroll);
    
    if (isTargetVisible) {
      console.log("Target product is already visible:", pendingScroll);
      // Highlight the product temporarily
      setHighlightedProductId(pendingScroll);
      setTimeout(() => setHighlightedProductId(null), 15000);
      setPendingScroll(null);
      return;
    }
    
    // Find the index of the product we want to scroll to
    const productIndex = filteredProducts.findIndex(p => p.id === pendingScroll);
    console.log("Pending scroll product index:", productIndex);
    
    if (productIndex !== -1) {
      try {
        // First scroll to a position near the target to ensure items are rendered
        flatListRef.current?.scrollToOffset({
          offset: Math.max(0, (productIndex - 2) * 100), // Approximate item height
          animated: true
        });
        
        // Then after a short delay, scroll to the exact index
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: productIndex,
              animated: true,
              viewPosition: 0.5 // Position item closer to the top
            });
            
            // Highlight the product temporarily
            setHighlightedProductId(pendingScroll);
            setTimeout(() => setHighlightedProductId(null), 8000);
            
            // Clear the pending scroll
            setPendingScroll(null);
          } catch (error) {
            console.error("Error in second scroll attempt:", error);
          }
        }, 200);
      } catch (error) {
        console.error("Error scrolling to offset:", error);
      }
    } else {
      // If we can't find the product, clear the pending scroll
      setPendingScroll(null);
    }
  }, [pendingScroll, filteredProducts]);

  // Replace the previous scroll effect with this improved version
  useEffect(() => {
    if (updatedProductId && dataReady) {
      console.log("Setting pending scroll for product:", updatedProductId);
      setPendingScroll(updatedProductId);
      
      // Clear the URL parameter right away to prevent repeated attempts
      router.replace('/productos');
    }
  }, [updatedProductId, dataReady]);

  // Remove the old scroll effect
  // useEffect(() => {
  //   if (updatedProductId && dataReady && flatListRef.current) {
  //     console.log("Trying to scroll to product:", updatedProductId);
  //     
  //     // Find the index of the updated product
  //     const productIndex = filteredProducts.findIndex(p => p.id === updatedProductId);
  //     console.log("Product index:", productIndex);
  //     
  //     if (productIndex !== -1) {
  //       // Increase the delay to ensure the list is fully rendered
  //       setTimeout(() => {
  //         try {
  //           // First scroll to a position near the target to ensure items are rendered
  //           flatListRef.current?.scrollToOffset({
  //             offset: Math.max(0, (productIndex - 5) * 100), // Approximate item height
  //             animated: false
  //           });
  //           
  //           // Then after a short delay, scroll to the exact index
  //           setTimeout(() => {
  //             try {
  //               flatListRef.current?.scrollToIndex({
  //                 index: productIndex,
  //                 animated: true,
  //                 viewPosition: 0.3 // Position item closer to the top
  //               });
  //               
  //               // Clear the updatedProductId parameter from the URL after scrolling
  //               router.replace('/productos');
  //             } catch (error) {
  //               console.error("Error in second scroll attempt:", error);
  //             }
  //           }, 200);
  //         } catch (error) {
  //           console.error("Error scrolling to offset:", error);
  //         }
  //       }, 800); // Increased delay to ensure rendering
  //     }
  //   }
  // }, [updatedProductId, filteredProducts, dataReady]);


  useEffect(() => {
    if (updatedProductId) {
      loadProducts();
    }
  }, [updatedProductId]);
  
  useEffect(() => {
      loadData(filter === 'lowStock' && source === 'dashboard' ? 'lowStock' : 'all');
  }, [filter, source]);
  
  // Remove this useEffect that's causing the flicker
  // useEffect(() => {
  //   if (filter === 'lowStock' && source === 'dashboard') {
  //     setFilteredProducts(products.filter(p => 
  //       (p.quantity || 0) < (p.lowStockThreshold || 5)
  //     ));
  //     setActiveFilter('lowStock');
  //   } else {
  //     setFilteredProducts(products);
  //     setActiveFilter('all');
  //   }

  //   return () => {
  //     if (filter === 'lowStock' && source === 'dashboard') {
  //       // Use router.replace to update the URL without adding to history
  //       router.replace('/productos');
  //     }
  //   };
  // }, [products, filter, source]);
  
  useEffect(() => {
    setFilteredProducts(getFilteredProducts());
  }, [selectedCategory, searchText, products, activeFilter]);


  const loadData = async (filterType = 'all') => {
    try {
      setLoading(true);
      setDataReady(false); // Reset data ready state
      
      // Set the active filter immediately
      setActiveFilter(filterType);
      
      // Load all data at once
      const [productsData, categoriesData, tagsData] = await Promise.all([
        productService.getAllProducts(),
        categoryService.getAllCategories(),
        tagService.getAllTags()
      ]);
      
      // Sort products alphabetically by name
      const sortedProducts = productsData.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // Store all data in state
      setCategories(categoriesData);
      setTags(tagsData);
      
      // Process all products to include their tags before setting state
      const productsWithTags = await Promise.all(sortedProducts.map(async (product) => {
        if (product.id) {
          // Ensure product.tags is always an array
          const productTags = Array.isArray(product.tags) ? product.tags : [];
          
          // If product already has tags, use them
          if (productTags.length > 0) {
            // Convert tag IDs to tag objects
            const tagObjects = tagsData.filter(tag => 
              tag.id && productTags.includes(tag.id)
            );
            return { ...product, tagObjects };
          } else {
            // Fetch tags for this product
            const fetchedTags = await tagService.getTagsForProduct(product.id);
            // Extract tag IDs
            const tagIds = fetchedTags.map(tag => tag.id || '').filter(id => id !== '');
            
            // Update the product with its tags in the service cache
            productService.updateProductInCache(product.id, { 
              ...product, 
              tags: tagIds
            });
            
            // Return the updated product
            return { ...product, tags: tagIds, tagObjects: fetchedTags };
          }
        }
        return product;
      }));
      
      // Now set the products state with the fully processed data
      setProducts(productsWithTags);
      
      // Signal that all data is ready
      setDataReady(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = () => {
    loadData(activeFilter);
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      const matchesStockFilter = activeFilter !== 'lowStock' || 
        (product.quantity || 0) < (product.low_stock_threshold || 5);
      
      return matchesSearch && matchesCategory && matchesStockFilter;
    });
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
  const CategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && styles.selectedCategoryChip,
          { backgroundColor: theme.surface, borderColor: !selectedCategory ? theme.primary : theme.border }
        ]}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={[
          styles.categoryChipText,
          { color: !selectedCategory ? theme.primary : theme.text }
        ]}>
          Todas
        </Text>
      </TouchableOpacity>
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.selectedCategoryChip,
            { 
              backgroundColor: theme.surface,
              borderColor: selectedCategory === category.id ? theme.primary : theme.border 
            }
          ]}
          onPress={() => setSelectedCategory(category.id || null)}
        >
          <Text style={[
            styles.categoryChipText,
            { color: theme.text }
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading || !dataReady ) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textLight }]}>
              {i18n.t('products.loading')}
          </Text>
        </View>
      );
    }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.innerContainer}>
        <View style={styles.headerSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: theme.surface, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              placeholder={i18n.t('products.search')}
              placeholderTextColor={theme.textLight}
              value={searchText}
              onChangeText={setSearchText}
            />
            <TouchableOpacity 
              style={[styles.filterButton, { 
                backgroundColor: theme.surface, 
                borderColor: theme.primaryLight 
              }]}
              onPress={() => router.push('/productos/categorias')}
            >
              <Ionicons name="options" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, { 
                backgroundColor: theme.surface, 
                borderColor: theme.primaryLight 
              }]}
              onPress={() => {
                if (selectedCategory) {
                  router.push(`/productos/categoria-actualizar?categoryId=${selectedCategory}`);
                } else {
                  Alert.alert(
                    'Seleccione una categoría', 
                    'Debe seleccionar una categoría para actualizar sus productos.',
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <Ionicons name="folder-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <CategoryFilter />
        </View>
        <FlatList
          ref={flatListRef}
          data={filteredProducts}
          keyExtractor={(item) => item.id || Math.random().toString()}
          initialNumToRender={120}
          maxToRenderPerBatch={100}
          windowSize={21}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="never"
          keyboardDismissMode='on-drag'
          onScrollBeginDrag={() => Keyboard.dismiss()}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={[
            styles.listContainer,
            filteredProducts.length === 1 && styles.singleItemList
          ]}
          renderItem={({ item }) => (
            <ProductItem 
              product={item as Product & { tagObjects?: Tag[] }} 
              onDelete={handleDeleteProduct}
              highlighted={item.id === highlightedProductId}
            />
          )}
          refreshing={loading}
          onRefresh={loadProducts}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textLight }]}>
              {i18n.t('products.empty')}
            </Text>
          }
          onScrollToIndexFailed={info => {
            console.log("Failed to scroll to index:", info.index);
            
            if (pendingScroll) {
              // If we have a pending scroll, try a different approach
              const offset = info.averageItemLength * info.index;
              flatListRef.current?.scrollToOffset({
                offset,
                animated: false
              });
              
              // After scrolling to offset, wait and then try to scroll to index again
              setTimeout(() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.3
                  });
                }
              }, 300);
            }
          }}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/productos/nuevo')}
        >
          <Ionicons name="add" size={30} color={theme.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed
  },
  innerContainer: {
    flex: 1,
    padding: 16, 
  },
  headerSection: {
   zIndex: 1, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor removed
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    // color removed
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    // color removed
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    // backgroundColor removed
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
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    // backgroundColor removed
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    // borderColor removed
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilter: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 8,
    zIndex: 2,
  },
  categoryChip: {
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
    // backgroundColor removed
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // borderColor removed
  },
  selectedCategoryChip: {
    borderWidth: 2,
    // borderColor removed and applied dynamically
  },
  categoryChipText: {
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 8,
  },
  singleItemList: {
    flexGrow: 1,
  },
});
