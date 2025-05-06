import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { Category } from '../../../models/types';
import i18n from '@/translations';
import { useTheme } from '@/contexts/ThemeContext';

export default function CategoryBulkUpdateScreen() {
  const { theme } = useTheme();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  
  // Update options
  const [updateCostPrice, setUpdateCostPrice] = useState<boolean>(false);
  const [updateSellingPrice, setUpdateSellingPrice] = useState<boolean>(false);
  const [updateProfitMargin, setUpdateProfitMargin] = useState<boolean>(false);
  
  // Percentage values
  const [costPricePercentage, setCostPricePercentage] = useState<string>('0');
  const [sellingPricePercentage, setSellingPricePercentage] = useState<string>('0');
  const [profitMarginPercentage, setProfitMarginPercentage] = useState<string>('0');
  
  // Processing state
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!categoryId) {
      Alert.alert('Error', 'No se especificó una categoría');
      router.back();
      return;
    }
    
    loadCategoryData();
  }, [categoryId]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      
      // Load category details
      const categoryData = await categoryService.getCategoryById(categoryId);
      if (!categoryData) {
        Alert.alert('Error', 'No se encontró la categoría');
        router.back();
        return;
      }
      
      setCategory(categoryData);
      
      // Count products in this category
      const allProducts = await productService.getAllProducts();
      const categoryProducts = allProducts.filter(product => product.category_id === categoryId);
      setProductCount(categoryProducts.length);
      
    } catch (error) {
      console.error('Error loading category data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    // Validate that at least one update option is selected
    if (!updateCostPrice && !updateSellingPrice && !updateProfitMargin) {
      Alert.alert('Error', 'Seleccione al menos un tipo de actualización');
      return;
    }
    
    // Validate percentage values
    if (updateCostPrice && (isNaN(parseFloat(costPricePercentage)) || parseFloat(costPricePercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el precio de costo');
      return;
    }
    
    if (updateSellingPrice && (isNaN(parseFloat(sellingPricePercentage)) || parseFloat(sellingPricePercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el precio de venta');
      return;
    }
    
    if (updateProfitMargin && (isNaN(parseFloat(profitMarginPercentage)) || parseFloat(profitMarginPercentage) === 0)) {
      Alert.alert('Error', 'Ingrese un porcentaje válido para el margen de ganancia');
      return;
    }
    
    // Confirm with user
    Alert.alert(
      'Confirmar actualización',
      `¿Está seguro que desea actualizar ${productCount} productos de la categoría "${category?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Actualizar', 
          onPress: async () => {
            try {
              setProcessing(true);
              
              const updates = {
                costPricePercentage: updateCostPrice ? parseFloat(costPricePercentage) : undefined,
                sellingPricePercentage: updateSellingPrice ? parseFloat(sellingPricePercentage) : undefined,
                profitMarginPercentage: updateProfitMargin ? parseFloat(profitMarginPercentage) : undefined
              };
              
              const updatedCount = await productService.updateProductsByCategory(categoryId, updates);
              
              Alert.alert(
                'Actualización completada',
                `Se actualizaron ${updatedCount} productos de la categoría "${category?.name}".`,
                [
                  { 
                    text: 'OK', 
                    onPress: () => router.push('/productos')
                  }
                ]
              );
            } catch (error) {
              console.error('Error updating products:', error);
              Alert.alert('Error', 'No se pudieron actualizar los productos');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>      
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.categoryName, { color: theme.text }]}>
          {category?.name}
        </Text>
        <View style={styles.categoryInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: category?.color || '#ccc' }]} />
          <Text style={[styles.productCount, { color: theme.textLight }]}>
            {productCount} productos
          </Text>
        </View>
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Opciones de actualización
        </Text>
        
        <View style={styles.optionRow}>
          <View style={styles.switchContainer}>
            <Switch
              value={updateCostPrice}
              onValueChange={setUpdateCostPrice}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={updateCostPrice ? theme.primary : theme.textLight}
            />
            <Text style={[styles.optionLabel, { color: theme.text }]}>
              Precio de costo
            </Text>
          </View>
          
          {updateCostPrice && (
            <View style={styles.percentageContainer}>
              <TextInput
                style={[styles.percentageInput, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={costPricePercentage}
                onChangeText={setCostPricePercentage}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textLight}
              />
              <Text style={[styles.percentageSymbol, { color: theme.text }]}>%</Text>
            </View>
          )}
        </View>
        
        <View style={styles.optionRow}>
          <View style={styles.switchContainer}>
            <Switch
              value={updateSellingPrice}
              onValueChange={setUpdateSellingPrice}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={updateSellingPrice ? theme.primary : theme.textLight}
            />
            <Text style={[styles.optionLabel, { color: theme.text }]}>
              Precio de venta
            </Text>
          </View>
          
          {updateSellingPrice && (
            <View style={styles.percentageContainer}>
              <TextInput
                style={[styles.percentageInput, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={sellingPricePercentage}
                onChangeText={setSellingPricePercentage}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textLight}
              />
              <Text style={[styles.percentageSymbol, { color: theme.text }]}>%</Text>
            </View>
          )}
        </View>
        
        <View style={styles.optionRow}>
          <View style={styles.switchContainer}>
            <Switch
              value={updateProfitMargin}
              onValueChange={setUpdateProfitMargin}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={updateProfitMargin ? theme.primary : theme.textLight}
            />
            <Text style={[styles.optionLabel, { color: theme.text }]}>
              Margen de ganancia
            </Text>
          </View>
          
          {updateProfitMargin && (
            <View style={styles.percentageContainer}>
              <TextInput
                style={[styles.percentageInput, { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={profitMarginPercentage}
                onChangeText={setProfitMarginPercentage}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textLight}
              />
              <Text style={[styles.percentageSymbol, { color: theme.text }]}>%</Text>
            </View>
          )}
        </View>
        
        <View style={styles.helpTextContainer}>
          <Text style={[styles.helpText, { color: theme.textLight }]}>
            Los valores positivos aumentan los precios, los negativos los disminuyen.
          </Text>
          <Text style={[styles.helpText, { color: theme.textLight, marginTop: 4 }]}>
            El mismo porcentaje se aplicará a todos los productos de la categoría.
          </Text>
          {updateCostPrice && !updateSellingPrice && !updateProfitMargin && (
            <Text style={[styles.helpText, { color: theme.textLight, marginTop: 8 }]}>
              Al actualizar el precio de costo, se recalculará el precio de venta manteniendo el margen de ganancia.
            </Text>
          )}
          {updateProfitMargin && !updateSellingPrice && (
            <Text style={[styles.helpText, { color: theme.textLight, marginTop: 8 }]}>
              Al actualizar el margen de ganancia, se recalculará el precio de venta.
            </Text>
          )}
          {updateSellingPrice && !updateProfitMargin && (
            <Text style={[styles.helpText, { color: theme.textLight, marginTop: 8 }]}>
              Al actualizar el precio de venta, se recalculará el margen de ganancia.
            </Text>
          )}
          {(updateCostPrice && updateSellingPrice && !updateProfitMargin) && (
            <Text style={[styles.helpText, { color: theme.textLight, marginTop: 8 }]}>
              Al actualizar ambos precios, se recalculará el margen de ganancia.
            </Text>
          )}
          {(updateProfitMargin && updateCostPrice && !updateSellingPrice) && (
            <Text style={[styles.helpText, { color: theme.textLight, marginTop: 8 }]}>
              Al actualizar el margen y el costo, se recalculará el precio de venta.
            </Text>
          )}
          {(updateProfitMargin && updateSellingPrice) && (
            <Text style={[styles.helpText, { color: theme.warning, marginTop: 8 }]}>
              Nota: Al actualizar el margen y el precio de venta, el precio de venta tendrá prioridad.
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.updateButton, { backgroundColor: theme.primary }]}
        onPress={handleBulkUpdate}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator size="small" color={theme.surface} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={theme.surface} />
            <Text style={[styles.updateButtonText, { color: theme.surface }]}>
              Actualizar productos
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  productCount: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    marginLeft: 8,
    fontSize: 14,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  percentageSymbol: {
    marginLeft: 8,
    fontSize: 16,
  },
  helpTextContainer: {
    marginTop: 8,
  },
  helpText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  updateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});