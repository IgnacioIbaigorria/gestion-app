import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { Product } from '../../../models/types';
import { Tag } from '../../../models/types';
import { tagService } from '../../../services/tagService';
import { categoryService } from '../../../services/categoryService';
import { Category } from '../../../models/types';
import i18n from '@/translations';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AddEditProductScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('0');
  const [profitMargin, setProfitMargin] = useState<string>('0');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Add isFocused hook to detect when screen comes into focus
  const isFocused = useIsFocused();

  // Reset form when component mounts or when id changes
  useEffect(() => {
    if (id) {
      setIsEditing(true);
      loadProduct(id);
    } else {
      // Reset all form fields when no ID is provided (new product)
      resetForm();
    }
  }, [id]);
  
  // Function to reset all form fields to default values
  const resetForm = () => {
    setName('');
    setQuantity('0');
    setCostPrice('0');
    setSellingPrice('0');
    setProfitMargin('0');
    setIsEditing(false);
    setSelectedTags([]);
    setLowStockThreshold('5');
    setSelectedCategory('');
  };
  
  // Update this useEffect to reload tags and categories when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadTags();
      loadCategories();
      
      // If no ID is provided and the screen is focused, reset the form
      if (!id) {
        resetForm();
      }
    }
  }, [isFocused, id]);

  const loadTags = async () => {
    try {
      const tagsData = await tagService.getAllTags();
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await categoryService.getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Update loadProduct
  const loadProduct = async (productId: string) => {
    try {
      setInitialLoading(true);
      const product = await productService.getProductById(productId);
      
      if (product) {
        setName(product.name);
        setQuantity(product.quantity?.toString() || '0');
        setCostPrice(product.cost_price?.toString() || '0');
        setSellingPrice(product.selling_price?.toString() || '0');
        setProfitMargin(product.profit_margin?.toString() || '0');
        setSelectedTags(product.tags || []);
        setLowStockThreshold(product.low_stock_threshold?.toString() || '5');
        setSelectedCategory(product.category_id || '');
      } else {
        Alert.alert('Error', 'No se encontró el producto');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
      console.error(error);
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  // Fix the profit margin calculation
  const calculateProfitMargin = () => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    
    console.log('Calculating profit margin:', { cost, selling });
    
    if (cost > 0 && selling > 0) {
      // Check if selling price is less than cost price
      if (selling < cost) {
        Alert.alert('Advertencia', 'El precio de venta es menor que el precio de costo');
      }
      
      const margin = ((selling - cost) / cost) * 100;
      console.log('Calculated margin:', margin);
      setProfitMargin(margin.toFixed(2));
    }
  };

  const calculateSellingPrice = () => {
    const cost = parseFloat(costPrice) || 0;
    const margin = parseFloat(profitMargin) || 0;
    
    if (cost > 0 && margin >= 0) {
      const selling = cost * (1 + margin / 100);
      setSellingPrice(selling.toFixed(0));
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Por favor ingresa el nombre del producto');
      return;
    }

    if (parseFloat(costPrice) <= 0) {
      Alert.alert('Error', 'El precio de costo debe ser mayor a 0');
      return;
    }

    if (parseFloat(sellingPrice) <= 0) {
      Alert.alert('Error', 'El precio de venta debe ser mayor a 0');
      return;
    }

    // Add validation for negative profit margin
    if (parseFloat(sellingPrice) < parseFloat(costPrice)) {
      Alert.alert(
        'Advertencia', 
        'El precio de venta es menor que el precio de costo. ¿Desea continuar?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Continuar',
            onPress: () => saveProduct()
          }
        ]
      );
      return;
    }

    // If all validations pass, save the product
    saveProduct();
  };

  // Extract the save logic to a separate function
  // Update saveProduct function to include categoryId
  const saveProduct = async () => {
    try {
      setLoading(true);
      
      const productData: Omit<Product, 'id'> = {
        name,
        quantity: parseInt(quantity, 10) || 0,
        cost_price: parseFloat(costPrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        profit_margin: parseFloat(profitMargin) || 0,
        tags: selectedTags,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        category_id: selectedCategory || null,
      };
      
      let updatedProductId = id;
      
      if (isEditing && id) {
        await productService.updateProduct(id, productData);
        Alert.alert('Éxito', 'Producto actualizado correctamente', [
          { 
            text: 'OK', 
            onPress: () => {
              // Return to products list with the updated product ID as a parameter
              router.replace(`/productos?updatedProductId=${id}`);
            }
          }
        ]);
      } else {
        const newProduct = await productService.addProduct(productData);
        updatedProductId = newProduct.id || '';
        Alert.alert('Éxito', 'Producto agregado correctamente', [
          { 
            text: 'OK', 
            onPress: () => {
              // Return to products list with the new product ID as a parameter
              router.replace(`/productos?updatedProductId=${newProduct.id}`);
            }
          }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el producto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textLight }]}>Cargando producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.formContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isEditing ? i18n.t('products.edit') : i18n.t('products.add')}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.productName')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              value={name}
              onChangeText={setName}
              placeholder={i18n.t('products.enterProductName')}
              placeholderTextColor={theme.textLight}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.quantity')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textLight}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.costPrice')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              value={costPrice}
              onChangeText={setCostPrice}
              onEndEditing={() => {
                if (parseFloat(sellingPrice) > 0) {
                  calculateProfitMargin();
                } else if (parseFloat(profitMargin) > 0) {
                  calculateSellingPrice();
                }
              }}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.textLight}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.sellingPrice')}</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              onEndEditing={calculateProfitMargin}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.textLight}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.profitMargin')} (%)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                borderColor: theme.primaryLight,
                color: theme.text
              }]}
              value={profitMargin}
              onChangeText={setProfitMargin}
              onEndEditing={() => {
                // Recalcular precio de venta cuando termina de editar el margen
                calculateSellingPrice();
              }}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.textLight}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{i18n.t('products.lowStock')}</Text>
            <View style={styles.thresholdContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.primaryLight,
                  color: theme.text
                }]}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor={theme.textLight}
              />
              <Text style={[styles.thresholdHelperText, { color: theme.textLight }]}>
                {i18n.t('products.lowStockThresholdDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Etiquetas</Text>
            <View style={styles.tagsContainer}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagButton,
                    { 
                      backgroundColor: selectedTags.includes(tag.id!) ? tag.color : theme.surface,
                      borderColor: tag.color || theme.primary,
                      borderWidth: 1, 
                    }
                  ]}
                  onPress={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag.id!)
                        ? prev.filter(t => t !== tag.id)
                        : [...prev, tag.id!]
                    );
                  }}
                >
                  <Text style={[
                    styles.tagButtonText,
                    { 
                      color: selectedTags.includes(tag.id!) ? theme.surface : theme.text || theme.primary,
                      borderColor: tag.color || theme.primary, 
                    }
                  ]}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.manageTags}
              onPress={() => router.push('/productos/tags')}
            >
              <Text style={[styles.manageTagsText, { color: theme.text }]}>{i18n.t('products.manageTags')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Categoría</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { 
                      backgroundColor: selectedCategory === category.id ? category.color : theme.surface,
                      borderColor: category.color || theme.primary ,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={() => {
                    setSelectedCategory(currentCategory => 
                      currentCategory === category.id ? '' : category.id!
                    );
                  }}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    { color: selectedCategory === category.id ? theme.surface : theme.text || theme.primary }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.manageCategories}
              onPress={() => router.push('/productos/categorias')}
            >
              <Text style={[styles.manageCategoriesText, { color: theme.text }]}>{i18n.t('products.manageCategories')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.error }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.surface }]}>{i18n.t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.surface} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.surface }]}>{i18n.t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  formContainer: {
    borderRadius: 12,
    padding: 20,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  tagButtonText: {
    fontSize: 14,
  },
  manageTags: {
    marginTop: 8,
  },
  manageTagsText: {
    textDecorationLine: 'underline',
    fontSize: 16,
    fontWeight: '500',
  },
  thresholdContainer: {
    marginBottom: 8,
  },
  thresholdHelperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  categoriesContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    marginVertical: 5,
  },
  categoryButtonText: {
    fontSize: 14,
  },
  manageCategories: {
    marginTop: 8,
  },
  manageCategoriesText: {
    textDecorationLine: 'underline',
    fontSize: 16,
    fontWeight: '500',
  },
});

